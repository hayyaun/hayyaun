export type WaterStroke = {
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  radius: number;
  strength: number;
};

export type WaterRenderer = {
  resize(width: number, height: number, widthCss: number, heightCss: number): void;
  setMask(source: HTMLCanvasElement): void;
  shift(dx: number, dy: number): void;
  render(deltaSeconds: number, strokes: readonly WaterStroke[], opacity: number): void;
  reset(): void;
  dispose(): void;
};

const strokeCapacity = 16;
const stepSeconds = 1 / 60;

const vertexSource = `#version 300 es
  in vec2 aPosition;
  out vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

// A damped height/velocity field, stepped at 60 Hz. New strokes perturb the
// existing water instead of replacing older ripples in an impulse queue.
// Technique references (independent implementation):
// https://madebyevan.com/webgl-water/ - height-field propagation
// https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models
const updateSource = `#version 300 es
  precision highp float;
  precision highp sampler2D;
  in vec2 vUv;
  out vec4 result;
  uniform sampler2D uWater;
  uniform vec2 uTexel;
  uniform vec2 uSize;
  uniform vec2 uPropagation;
  uniform vec2 uShift;
  uniform int uAdvance;
  uniform int uCount;
  uniform vec4 uStrokes[${strokeCapacity}];
  uniform vec2 uBrushes[${strokeCapacity}];

  void main() {
    vec2 uv = vUv + uShift;
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
      result = vec4(0.0);
      return;
    }
    vec2 water = texture(uWater, uv).rg;
    if (uAdvance == 1) {
      float left = texture(uWater, uv - vec2(uTexel.x, 0.0)).r;
      float right = texture(uWater, uv + vec2(uTexel.x, 0.0)).r;
      float bottom = texture(uWater, uv - vec2(0.0, uTexel.y)).r;
      float top = texture(uWater, uv + vec2(0.0, uTexel.y)).r;
      float acceleration = (left + right - 2.0 * water.r) * uPropagation.x
        + (bottom + top - 2.0 * water.r) * uPropagation.y;
      water.g = (water.g + acceleration) * 0.996;
      water.r = (water.r + water.g) * 0.9995;
      // An absorbing border prevents the viewport acting like a rectangular tank.
      vec2 edge = min(uv, 1.0 - uv) * uSize;
      water *= mix(0.90, 1.0, smoothstep(0.0, 40.0, min(edge.x, edge.y)));
    }

    vec2 point = vec2(vUv.x, 1.0 - vUv.y) * uSize;
    for (int i = 0; i < ${strokeCapacity}; i++) {
      if (i >= uCount) break;
      vec2 start = uStrokes[i].xy;
      vec2 segment = uStrokes[i].zw - start;
      float lengthSquared = dot(segment, segment);
      float along = clamp(dot(point - start, segment) / max(lengthSquared, 0.001), 0.0, 1.0);
      vec2 offset = point - start - segment * along;
      float radius = uBrushes[i].x;
      float q = dot(offset, offset) / (radius * radius);
      // Smooth pressure depression with a raised rim. Capsule-shaped input
      // connects pointer samples without dotted splats or hard-edged rings.
      float pressure = (1.0 - q) * exp(-q);
      float travel = min(sqrt(lengthSquared) / radius, 1.5);
      water.g -= pressure * uBrushes[i].y * travel * 0.07;
    }
    result = vec4(water, 0.0, 1.0);
  }
`;

const lightingSource = `#version 300 es
  precision highp float;
  precision highp sampler2D;
  in vec2 vUv;
  out vec4 result;
  uniform sampler2D uWater;
  uniform sampler2D uMask;
  uniform vec2 uTexel;
  uniform vec2 uCell;
  uniform float uOpacity;

  void main() {
    // Keep antialiasing inside glyphs without eroding thin letter strokes.
    float mask = smoothstep(0.55, 0.98, texture(uMask, vUv).a);
    if (mask < 0.01) discard;
    float left = texture(uWater, vUv - vec2(uTexel.x, 0.0)).r;
    float right = texture(uWater, vUv + vec2(uTexel.x, 0.0)).r;
    float bottom = texture(uWater, vUv - vec2(0.0, uTexel.y)).r;
    float top = texture(uWater, vUv + vec2(0.0, uTexel.y)).r;
    vec2 slope = vec2(right - left, top - bottom) / (2.0 * uCell) * 12.0;
    slope /= 1.0 + length(slope) * 0.45;
    vec3 normal = normalize(vec3(-slope, 1.0));
    vec3 reflected = reflect(vec3(0.0, 0.0, -1.0), normal);
    // Soft studio lights relative to still water: only changing normals light up.
    vec3 key = normalize(vec3(-0.35, 0.55, 1.0));
    vec3 fill = normalize(vec3(0.60, -0.20, 1.0));
    float keyLight = pow(max(dot(reflected, key), 0.0), 10.0);
    float fillLight = pow(max(dot(reflected, fill), 0.0), 5.0);
    float glint = max(0.0, keyLight - pow(key.z, 10.0));
    float sheen = max(0.0, fillLight - pow(fill.z, 5.0));
    float energy = 1.0 - exp(-length(slope) * 2.6);
    float alpha = (1.0 - exp(-(glint * 1.35 + sheen * 0.60 + energy * 0.20))) * 0.72;
    alpha *= mask * uOpacity;
    // White crests roll through blue into violet as the reflection softens,
    // echoing the prism's lighting while following the actual water normals.
    float spectrum = clamp(glint * 1.25 + sheen * 0.50, 0.0, 1.0);
    vec3 violet = vec3(0.66, 0.30, 1.0);
    vec3 blue = vec3(0.22, 0.52, 1.0);
    vec3 pearl = vec3(0.97, 0.98, 1.0);
    vec3 color = mix(violet, blue, smoothstep(0.0, 0.35, spectrum));
    color = mix(color, pearl, smoothstep(0.35, 0.70, spectrum));
    result = vec4(color * alpha, alpha);
  }
`;

export function createWaterRenderer(canvas: HTMLCanvasElement): WaterRenderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });
  if (!gl) return null;
  const loseContext = () => gl.getExtension("WEBGL_lose_context")?.loseContext();
  if (!gl.getExtension("EXT_color_buffer_float")) {
    loseContext();
    return null;
  }

  const shaders: WebGLShader[] = [];
  const programs: WebGLProgram[] = [];
  const textures: WebGLTexture[] = [];
  const framebuffers: WebGLFramebuffer[] = [];
  const buffer = gl.createBuffer();
  const dispose = () => {
    shaders.forEach((shader) => gl.deleteShader(shader));
    programs.forEach((program) => gl.deleteProgram(program));
    textures.forEach((texture) => gl.deleteTexture(texture));
    framebuffers.forEach((framebuffer) => gl.deleteFramebuffer(framebuffer));
    gl.deleteBuffer(buffer);
    loseContext();
  };

  const program = (source: string) => {
    const compiled = gl.createProgram();
    if (!compiled) throw new Error("Water program unavailable");
    programs.push(compiled);
    for (const [type, code] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, source],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Water shader unavailable");
      shaders.push(shader);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Water shader compilation failed");
      gl.attachShader(compiled, shader);
    }
    gl.bindAttribLocation(compiled, 0, "aPosition");
    gl.linkProgram(compiled);
    if (!gl.getProgramParameter(compiled, gl.LINK_STATUS)) throw new Error("Water shader linking failed");
    return compiled;
  };

  const texture = () => {
    const created = gl.createTexture();
    if (!created) throw new Error("Water texture unavailable");
    textures.push(created);
    gl.bindTexture(gl.TEXTURE_2D, created);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return created;
  };

  try {
    if (!buffer) throw new Error("Water buffer unavailable");
    const update = program(updateSource);
    const lighting = program(lightingSource);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

    const mask = texture();
    const targets = Array.from({ length: 2 }, () => {
      const surface = texture();
      const framebuffer = gl.createFramebuffer();
      if (!framebuffer) throw new Error("Water framebuffer unavailable");
      framebuffers.push(framebuffer);
      return { texture: surface, framebuffer };
    });
    const uniform = (owner: WebGLProgram, name: string) => gl.getUniformLocation(owner, name);
    const u = {
      texel: uniform(update, "uTexel"),
      size: uniform(update, "uSize"),
      propagation: uniform(update, "uPropagation"),
      shift: uniform(update, "uShift"),
      advance: uniform(update, "uAdvance"),
      count: uniform(update, "uCount"),
      strokes: uniform(update, "uStrokes[0]"),
      brushes: uniform(update, "uBrushes[0]"),
    };
    const light = {
      texel: uniform(lighting, "uTexel"),
      cell: uniform(lighting, "uCell"),
      opacity: uniform(lighting, "uOpacity"),
    };
    gl.useProgram(update);
    gl.uniform1i(uniform(update, "uWater"), 0);
    gl.useProgram(lighting);
    gl.uniform1i(uniform(lighting, "uMask"), 1);

    let read = 0;
    let simWidth = 1;
    let simHeight = 1;
    let cssWidth = 1;
    let cssHeight = 1;
    let accumulated = 0;
    let allocated = false;
    const strokesData = new Float32Array(strokeCapacity * 4);
    const brushesData = new Float32Array(strokeCapacity * 2);

    const pass = (advance: boolean, count = 0, dx = 0, dy = 0) => {
      gl.useProgram(update);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, targets[read].texture);
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets[1 - read].framebuffer);
      gl.viewport(0, 0, simWidth, simHeight);
      gl.uniform1i(u.advance, advance ? 1 : 0);
      gl.uniform1i(u.count, count);
      gl.uniform2f(u.shift, dx / cssWidth, -dy / cssHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      read = 1 - read;
    };

    const reset = () => {
      accumulated = 0;
      if (!allocated || gl.isContextLost()) return;
      for (const target of targets) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clear(gl.COLOR_BUFFER_BIT);
    };

    return {
      resize(width, height, widthCss, heightCss) {
        if (canvas.width === width && canvas.height === height && cssWidth === widthCss && cssHeight === heightCss) return;
        canvas.width = width;
        canvas.height = height;
        cssWidth = widthCss;
        cssHeight = heightCss;
        // Separate wave resolution from glyph resolution; at most 768 squared cells.
        const scale = Math.min(1 / 3, 768 / Math.max(cssWidth, cssHeight));
        simWidth = Math.max(2, Math.round(cssWidth * scale));
        simHeight = Math.max(2, Math.round(cssHeight * scale));
        gl.activeTexture(gl.TEXTURE0);
        for (const target of targets) {
          gl.bindTexture(gl.TEXTURE_2D, target.texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, simWidth, simHeight, 0, gl.RG, gl.HALF_FLOAT, null);
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Water surface unsupported");
        }
        const cellX = cssWidth / simWidth;
        allocated = true;
        const cellY = cssHeight / simHeight;
        const speed = Math.min(38, (Math.min(cellX, cellY) / stepSeconds) * 0.6);
        gl.useProgram(update);
        gl.uniform2f(u.texel, 1 / simWidth, 1 / simHeight);
        gl.uniform2f(u.size, cssWidth, cssHeight);
        gl.uniform2f(u.propagation, ((speed * stepSeconds) / cellX) ** 2, ((speed * stepSeconds) / cellY) ** 2);
        gl.useProgram(lighting);
        gl.uniform2f(light.texel, 1 / simWidth, 1 / simHeight);
        gl.uniform2f(light.cell, cellX, cellY);
        reset();
      },
      setMask(source) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, mask);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      },
      shift(dx, dy) {
        pass(false, 0, dx, dy);
      },
      render(deltaSeconds, strokes, opacity) {
        // Consume input once, independently of refresh rate or simulation steps.
        for (let offset = 0; offset < strokes.length; offset += strokeCapacity) {
          const batch = strokes.slice(offset, offset + strokeCapacity);
          batch.forEach((stroke, index) => {
            strokesData.set([stroke.fromX, stroke.fromY, stroke.x, stroke.y], index * 4);
            brushesData.set([stroke.radius, stroke.strength], index * 2);
          });
          gl.useProgram(update);
          gl.uniform4fv(u.strokes, strokesData);
          gl.uniform2fv(u.brushes, brushesData);
          pass(false, batch.length);
        }
        accumulated += Math.min(Math.max(deltaSeconds, 0), 0.05);
        while (accumulated >= stepSeconds) {
          pass(true);
          accumulated -= stepSeconds;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(lighting);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, targets[read].texture);
        gl.uniform1f(light.opacity, opacity);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      reset,
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}
