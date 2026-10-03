export type WaterImpulse = {
  x: number;
  y: number;
  born: number;
  strength: number;
  dx: number;
  dy: number;
};

export type WaterRenderer = {
  resize(width: number, height: number): void;
  setMask(source: HTMLCanvasElement): void;
  render(timeSeconds: number, ripples: readonly WaterImpulse[], widthCss: number, heightCss: number): void;
  dispose(): void;
};

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

function fragmentShader(capacity: number) {
  return `
    precision mediump float;

    varying vec2 vUv;
    uniform sampler2D uMask;
    uniform vec2 uMaskTexel;
    uniform vec2 uSize;
    uniform int uCount;
    // CSS x/y, age in seconds, strength. Ages keep precision on long-lived tabs.
    uniform vec4 uImpulses[${capacity}];
    uniform vec2 uDirections[${capacity}];

    void main() {
      float mask = texture2D(uMask, vUv).a;
      if (mask < 0.1) discard;

      // Stay inside the glyph even where Canvas and DOM font antialiasing differ.
      mask = min(mask, texture2D(uMask, vUv + vec2(uMaskTexel.x, 0.0)).a);
      mask = min(mask, texture2D(uMask, vUv - vec2(uMaskTexel.x, 0.0)).a);
      mask = min(mask, texture2D(uMask, vUv + vec2(0.0, uMaskTexel.y)).a);
      mask = min(mask, texture2D(uMask, vUv - vec2(0.0, uMaskTexel.y)).a);
      if (mask < 0.1) discard;

      vec2 point = vec2(vUv.x, 1.0 - vUv.y) * uSize;
      vec2 slope = vec2(0.0);
      float activity = 0.0;

      for (int i = 0; i < ${capacity}; i++) {
        if (i >= uCount) break;
        vec4 impulse = uImpulses[i];
        float age = impulse.z;
        if (age < 0.0 || age > 5.5) continue;

        vec2 direction = uDirections[i];
        vec2 crossDirection = vec2(-direction.y, direction.x);
        vec2 delta = point - impulse.xy;

        // A small, slow domain warp breaks perfect circular outlines. Adjacent
        // pointer samples still share a continuous surface instead of particles.
        vec2 warp = 3.2 * vec2(
          sin(point.y * 0.017 + age * 0.31),
          sin(point.x * 0.014 - age * 0.27)
        );
        vec2 displaced = delta + warp + direction * age * 3.0;
        vec2 local = vec2(dot(displaced, direction) * 0.78, dot(displaced, crossDirection));
        float radius = sqrt(dot(local, local) + 9.0);
        float width = 28.0 + age * 5.0;
        float front = 12.0 + age * 32.0;
        float offset = (radius - front) / width;

        // Broad, dispersing packets have a soft onset and settle for 5.5 seconds.
        float life = smoothstep(0.0, 0.18, age)
          * (1.0 - smoothstep(2.7, 5.5, age)) * exp(-age * 0.06);
        float envelope = exp(-offset * offset) * life * impulse.w
          / sqrt(1.0 + radius * 0.008);
        float phase = radius * 0.115 - age * 3.6;
        float phaseSlow = radius * 0.067 - age * 2.15 + 1.2;
        float wave = sin(phase) * 0.72 + sin(phaseSlow) * 0.28;
        float derivative = cos(phase) * 0.0828 + cos(phaseSlow) * 0.01876;
        float envelopeDerivative = envelope
          * (-2.0 * offset / width - 0.004 / (1.0 + radius * 0.008));
        vec2 radialDirection = (direction * local.x * 0.78
          + crossDirection * local.y) / radius;
        // Differentiate the warp as well as the radial packet, without extra
        // height-field evaluations or derivative-extension requirements.
        radialDirection = vec2(
          radialDirection.x + radialDirection.y * 0.0448 * cos(point.x * 0.014 - age * 0.27),
          radialDirection.y + radialDirection.x * 0.0544 * cos(point.y * 0.017 + age * 0.31)
        );
        slope += radialDirection * (derivative * envelope + wave * envelopeDerivative) * 5.2;

        // An elongated low-frequency wake joins samples along the mouse path.
        // Its analytic normal adds fluid interference rather than a bright ring.
        float along = dot(delta, direction);
        float across = dot(delta, crossDirection);
        float wakeWidth = 20.0 + age * 5.0;
        float wakeLength = 55.0 + age * 9.0;
        float wake = exp(-across * across / (wakeWidth * wakeWidth)
          - along * along / (wakeLength * wakeLength)) * life * impulse.w * 0.34;
        float wakePhase = across * 0.09 - age * 1.65;
        slope += crossDirection * wake * (
          cos(wakePhase) * 0.09
          - sin(wakePhase) * 2.0 * across / (wakeWidth * wakeWidth)
        ) * 4.5;
        slope -= direction * wake * sin(wakePhase)
          * 2.0 * along / (wakeLength * wakeLength) * 4.5;
        activity += envelope + wake;
      }

      // Soft saturation keeps a fast pointer stroke from becoming a neon flash.
      slope /= 1.0 + length(slope) * 0.75;
      vec3 normal = normalize(vec3(-slope, 1.0));
      float reflection = pow(max(dot(normal, normalize(vec3(-0.22, -0.32, 1.0))), 0.0), 18.0);
      float broadLight = pow(max(dot(normal, normalize(vec3(0.45, 0.12, 1.0))), 0.0), 7.0);
      float fresnel = pow(1.0 - normal.z, 2.0);
      float energy = 1.0 - exp(-activity * 1.35);
      float alpha = min(0.34, energy * (0.025 + reflection * 0.42 + broadLight * 0.16 + fresnel * 0.07));
      alpha *= smoothstep(0.1, 0.95, mask);
      vec3 silverBlue = mix(vec3(0.42, 0.58, 0.65), vec3(0.7, 0.8, 0.83), reflection);
      gl_FragColor = vec4(silverBlue * alpha, alpha);
    }
  `;
}

export function createWaterRenderer(canvas: HTMLCanvasElement): WaterRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  // WebGL1 devices vary considerably in fragment-uniform capacity.
  const capacity = Math.min(32, Math.floor((Number(gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)) - 8) / 2));
  if (capacity < 1) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentShader(capacity));
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const maskTexture = gl.createTexture();
  const dispose = () => {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    gl.deleteTexture(maskTexture);
  };

  if (!vertex || !fragment || !program || !buffer || !maskTexture) {
    dispose();
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose();
    return null;
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, maskTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  gl.uniform1i(gl.getUniformLocation(program, "uMask"), 0);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);

  const sizeUniform = gl.getUniformLocation(program, "uSize");
  const texelUniform = gl.getUniformLocation(program, "uMaskTexel");
  const countUniform = gl.getUniformLocation(program, "uCount");
  const impulseUniform = gl.getUniformLocation(program, "uImpulses[0]");
  const directionUniform = gl.getUniformLocation(program, "uDirections[0]");
  const impulses = new Float32Array(capacity * 4);
  const directions = new Float32Array(capacity * 2);

  return {
    resize(width: number, height: number) {
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    setMask(source: HTMLCanvasElement) {
      gl.bindTexture(gl.TEXTURE_2D, maskTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.uniform2f(texelUniform, 1 / source.width, 1 / source.height);
    },
    render(timeSeconds: number, ripples: readonly WaterImpulse[], widthCss: number, heightCss: number) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      const count = Math.min(capacity, ripples.length);
      if (!count) return;

      for (let index = 0; index < count; index++) {
        const impulse = ripples[ripples.length - count + index];
        const length = Math.hypot(impulse.dx, impulse.dy);
        impulses[index * 4] = impulse.x;
        impulses[index * 4 + 1] = impulse.y;
        impulses[index * 4 + 2] = timeSeconds - impulse.born;
        impulses[index * 4 + 3] = impulse.strength;
        directions[index * 2] = length > 0.001 ? impulse.dx / length : 1;
        directions[index * 2 + 1] = length > 0.001 ? impulse.dy / length : 0;
      }
      gl.uniform2f(sizeUniform, widthCss, heightCss);
      gl.uniform1i(countUniform, count);
      gl.uniform4fv(impulseUniform, impulses);
      gl.uniform2fv(directionUniform, directions);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose,
  };
}
