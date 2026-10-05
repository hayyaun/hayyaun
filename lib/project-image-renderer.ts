export type ProjectImageRenderer = {
  resize(widthCss: number, heightCss: number, dpr: number): void;
  render(progress: number, originX: number, originY: number): void;
  dispose(): void;
};

const vertexSource = `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    // Both pointer positions and image uploads use a top-left origin.
    vUv = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uCover;
  uniform sampler2D uPreview;
  uniform vec4 uCoverCrop;
  uniform vec4 uPreviewCrop;
  uniform vec2 uOrigin;
  uniform float uProgress;
  uniform float uAspect;

  vec4 cover(vec2 uv) {
    return texture2D(uCover, clamp(uv, 0.0, 1.0) * uCoverCrop.xy + uCoverCrop.zw);
  }

  vec4 preview(vec2 uv) {
    return texture2D(uPreview, clamp(uv, 0.0, 1.0) * uPreviewCrop.xy + uPreviewCrop.zw);
  }

  void main() {
    // Exact endpoints let the canvas hand back to the accessible HTML images.
    if (uProgress <= 0.0) {
      gl_FragColor = cover(vUv);
      return;
    }
    if (uProgress >= 1.0) {
      gl_FragColor = preview(vUv);
      return;
    }

    float direction = uOrigin.x < 0.5 ? 1.0 : -1.0;
    float across = direction > 0.0 ? vUv.x : 1.0 - vUv.x;
    float down = vUv.y - uOrigin.y;
    float curve = sin(down * 5.0 + uProgress * 3.5);
    float field = across + down * 0.18 + curve * 0.035;
    float distance = field - mix(-0.35, 1.35, uProgress);
    float reveal = 1.0 - smoothstep(-0.065, 0.065, distance);
    float activity = sin(uProgress * 3.14159265);

    // A curved glass meniscus refracts both images around the moving boundary.
    // It is deterministic in progress, so rapid hover reversals remain continuous.
    float lens = exp(-pow(distance / 0.115, 2.0)) * activity;
    vec2 normal = normalize(vec2(direction, 0.18 + cos(down * 5.0 + uProgress * 3.5) * 0.175));
    vec2 offset = normal * vec2(1.0, uAspect) * lens * 0.042;
    vec2 separation = normal * vec2(1.0, uAspect) * lens * 0.0045;
    vec2 coverUv = vUv + offset;
    vec2 previewUv = vUv - offset * 0.75;
    vec4 from = cover(coverUv);
    vec4 to = preview(previewUv);
    from.r = cover(coverUv + separation).r;
    from.b = cover(coverUv - separation).b;
    to.r = preview(previewUv + separation).r;
    to.b = preview(previewUv - separation).b;
    vec4 color = mix(from, to, reveal);

    // A narrow pearl crest eases through blue into violet, matching the prism.
    float edge = exp(-pow(distance / 0.022, 2.0)) * activity;
    float halo = exp(-pow(distance / 0.070, 2.0)) * activity;
    float spectrum = smoothstep(-0.045, 0.040, distance);
    vec3 sheen = mix(vec3(0.67, 0.39, 1.0), vec3(0.32, 0.64, 1.0), spectrum);
    sheen = mix(sheen, vec3(0.95, 0.98, 1.0), edge * 0.8);
    color.rgb += sheen * (edge * 0.19 + halo * 0.045) * color.a;
    gl_FragColor = color;
  }
`;

/** A single-pass image transition. Animation scheduling belongs to the component. */
export async function createProjectImageRenderer(
  canvas: HTMLCanvasElement,
  cover: HTMLImageElement,
  preview: HTMLImageElement,
  preparation: { run<T>(task: () => T): Promise<T>; signal: AbortSignal },
  coverPositionY = 0.5
): Promise<ProjectImageRenderer | null> {
  if (!cover.naturalWidth || !cover.naturalHeight || !preview.naturalWidth || !preview.naturalHeight) return null;

  const gl = await preparation.run(() =>
    canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    })
  );
  if (!gl) return null;

  const shaders: WebGLShader[] = [];
  const textures: WebGLTexture[] = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  let disposed = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    shaders.forEach((shader) => gl.deleteShader(shader));
    textures.forEach((texture) => gl.deleteTexture(texture));
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    // React can reuse this canvas after an effect cleanup or an image change.
    // Release our resources without permanently losing that reusable context.
  };

  try {
    if (!program || !buffer) throw new Error("Project image renderer unavailable");
    const parallel = await preparation.run(() => {
      for (const [type, source] of [
        [gl.VERTEX_SHADER, vertexSource],
        [gl.FRAGMENT_SHADER, fragmentSource],
      ] as const) {
        const shader = gl.createShader(type);
        if (!shader) throw new Error("Project image shader unavailable");
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        gl.attachShader(program, shader);
      }
      gl.bindAttribLocation(program, 0, "aPosition");
      gl.linkProgram(program);
      return gl.getExtension("KHR_parallel_shader_compile");
    });
    // Query completion without forcing the driver to finish compilation on the
    // scrolling thread. Browsers without the extension link in a quiet slot.
    if (parallel) {
      while (!(await preparation.run(() => gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)))) {
        if (gl.isContextLost()) throw new Error("Project image context lost");
      }
    }
    const maxTextureSize = await preparation.run(() => {
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Project image shader linking failed");

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      // vUv already has its Y axis flipped; flipping the upload would invert images.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

      return gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    });
    for (const [unit, image] of [cover, preview].entries()) {
      // Upload one image per quiet slot; two full-size uploads in an observer
      // callback can block the first pass through the work section.
      await preparation.run(() => {
        if (image.naturalWidth > maxTextureSize || image.naturalHeight > maxTextureSize) {
          throw new Error("Project image exceeds device texture limits");
        }
        const texture = gl.createTexture();
        if (!texture) throw new Error("Project image texture unavailable");
        textures.push(texture);
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Linear filtering and clamping support non-power-of-two responsive images.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      });
    }
    const uniforms = await preparation.run(() => {
      if (gl.getError() !== gl.NO_ERROR) throw new Error("Project image texture upload failed");

      const locations = {
        coverCrop: gl.getUniformLocation(program, "uCoverCrop"),
        previewCrop: gl.getUniformLocation(program, "uPreviewCrop"),
        origin: gl.getUniformLocation(program, "uOrigin"),
        progress: gl.getUniformLocation(program, "uProgress"),
        aspect: gl.getUniformLocation(program, "uAspect"),
      };
      gl.uniform1i(gl.getUniformLocation(program, "uCover"), 0);
      gl.uniform1i(gl.getUniformLocation(program, "uPreview"), 1);
      return locations;
    });

    const setCrop = (
      location: WebGLUniformLocation | null,
      image: HTMLImageElement,
      aspect: number,
      positionY: number
    ) => {
      const imageAspect = image.naturalWidth / image.naturalHeight;
      const x = Math.min(1, aspect / imageAspect);
      const y = Math.min(1, imageAspect / aspect);
      gl.uniform4f(location, x, y, (1 - x) * 0.5, (1 - y) * positionY);
    };

    return {
      resize(widthCss, heightCss, dpr) {
        if (disposed || gl.isContextLost()) return;
        const width = Math.max(1, widthCss);
        const height = Math.max(1, heightCss);
        const ratio = Math.min(Math.max(dpr, 1), 1.5);
        const nextWidth = Math.min(4096, Math.round(width * ratio));
        const nextHeight = Math.min(4096, Math.round(height * ratio));
        if (canvas.width !== nextWidth) canvas.width = nextWidth;
        if (canvas.height !== nextHeight) canvas.height = nextHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform1f(uniforms.aspect, width / height);
        setCrop(uniforms.coverCrop, cover, width / height, Math.min(1, Math.max(0, coverPositionY)));
        // Website captures should stay fully visible; stretch the sub-percent aspect mismatch.
        gl.uniform4f(uniforms.previewCrop, 1, 1, 0, 0);
      },
      render(progress, originX, originY) {
        if (disposed || gl.isContextLost()) return;
        gl.uniform1f(uniforms.progress, Math.min(1, Math.max(0, progress)));
        gl.uniform2f(uniforms.origin, Math.min(1, Math.max(0, originX)), Math.min(1, Math.max(0, originY)));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    // Cancellation is a normal outcome when sources/settings change or the
    // component unmounts. It must not disable a later preparation attempt.
    if (preparation.signal.aborted) preparation.signal.throwIfAborted();
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}
