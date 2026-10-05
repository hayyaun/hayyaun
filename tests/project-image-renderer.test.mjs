import assert from "node:assert/strict";
import { test } from "node:test";
import { createProjectImageRenderer } from "../lib/project-image-renderer.ts";

function rendererHarness({
  parallel = true,
  completed = [false, true],
  abortAfterLink = false,
  abortAfterUpload = false,
  contextAvailable = true,
} = {}) {
  const controller = new AbortController();
  const calls = [];
  let job = 0;
  let resourceId = 0;
  const record = (name, ...args) => calls.push({ name, args, job });
  const resource = (kind) => {
    const value = { kind, id: ++resourceId };
    record(`create${kind}`, value);
    return value;
  };
  const completion = [...completed];
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    LINK_STATUS: 3,
    MAX_TEXTURE_SIZE: 4,
    TEXTURE0: 10,
    NO_ERROR: 0,
    createProgram: () => resource("Program"),
    createBuffer: () => resource("Buffer"),
    createShader: () => resource("Shader"),
    createTexture: () => resource("Texture"),
    getExtension(name) {
      record("getExtension", name);
      return parallel ? { COMPLETION_STATUS_KHR: 5 } : null;
    },
    getProgramParameter(program, parameter) {
      record("getProgramParameter", program, parameter);
      if (parameter === 5) return completion.length ? completion.shift() : true;
      assert.equal(parameter, gl.LINK_STATUS);
      return true;
    },
    getParameter(parameter) {
      record("getParameter", parameter);
      assert.equal(parameter, gl.MAX_TEXTURE_SIZE);
      return 4096;
    },
    getUniformLocation(program, name) {
      record("getUniformLocation", program, name);
      return name;
    },
    getError() {
      record("getError");
      return gl.NO_ERROR;
    },
    isContextLost: () => false,
  };
  for (const name of [
    "ARRAY_BUFFER",
    "STATIC_DRAW",
    "FLOAT",
    "DEPTH_TEST",
    "BLEND",
    "UNPACK_FLIP_Y_WEBGL",
    "UNPACK_PREMULTIPLY_ALPHA_WEBGL",
    "TEXTURE_2D",
    "TEXTURE_MIN_FILTER",
    "TEXTURE_MAG_FILTER",
    "TEXTURE_WRAP_S",
    "TEXTURE_WRAP_T",
    "LINEAR",
    "CLAMP_TO_EDGE",
    "RGBA",
    "UNSIGNED_BYTE",
    "TRIANGLES",
  ])
    gl[name] = name;
  for (const name of [
    "shaderSource",
    "compileShader",
    "attachShader",
    "bindAttribLocation",
    "linkProgram",
    "useProgram",
    "bindBuffer",
    "bufferData",
    "enableVertexAttribArray",
    "vertexAttribPointer",
    "disable",
    "pixelStorei",
    "activeTexture",
    "bindTexture",
    "texParameteri",
    "texImage2D",
    "uniform1i",
    "uniform1f",
    "uniform2f",
    "uniform4f",
    "viewport",
    "drawArrays",
    "deleteShader",
    "deleteTexture",
    "deleteProgram",
    "deleteBuffer",
  ])
    gl[name] = (...args) => record(name, ...args);
  const canvas = {
    width: 300,
    height: 150,
    getContext(name, options) {
      record("getContext", name, options);
      assert.equal(name, "webgl");
      return contextAvailable ? gl : null;
    },
  };
  const cover = { naturalWidth: 1200, naturalHeight: 800 };
  const preview = { naturalWidth: 1000, naturalHeight: 1200 };
  const preparation = {
    signal: controller.signal,
    async run(task) {
      // A job boundary stands in for the scheduler's next quiet opportunity.
      await Promise.resolve();
      controller.signal.throwIfAborted();
      job++;
      const result = task();
      if (abortAfterLink && calls.some((call) => call.name === "linkProgram")) controller.abort();
      if (abortAfterUpload && calls.some((call) => call.name === "texImage2D")) controller.abort();
      return result;
    },
  };
  return { canvas, cover, preview, preparation, calls, gl };
}

test("parallel compilation completes before link status or uniform queries", async () => {
  const page = rendererHarness();
  const renderer = await createProjectImageRenderer(page.canvas, page.cover, page.preview, page.preparation);
  assert.ok(renderer);
  const queries = page.calls.filter((call) => call.name === "getProgramParameter");
  assert.deepEqual(
    queries.map((call) => call.args[1]),
    [5, 5, page.gl.LINK_STATUS]
  );
  assert.ok(queries[0].job < queries[1].job);
  const completedJob = queries[1].job;
  const uniformQueries = page.calls.filter((call) => call.name === "getUniformLocation");
  assert.ok(uniformQueries.length > 0);
  assert.ok(uniformQueries.every((call) => call.job > completedJob));
  assert.equal(
    page.calls.some((call) => call.name === "getShaderParameter"),
    false
  );
  renderer.dispose();
});

test("cover and preview uploads occupy separate quiet jobs", async () => {
  const page = rendererHarness();
  const renderer = await createProjectImageRenderer(page.canvas, page.cover, page.preview, page.preparation);
  assert.ok(renderer);
  const uploads = page.calls.filter((call) => call.name === "texImage2D");
  assert.equal(uploads.length, 2);
  assert.deepEqual(
    uploads.map((call) => call.args.at(-1)),
    [page.cover, page.preview]
  );
  assert.notEqual(uploads[0].job, uploads[1].job);
  const validation = page.calls.find((call) => call.name === "getError");
  assert.ok(validation.job > uploads[1].job);
  renderer.dispose();
});

test("cancellation after compilation releases resources without uploading either image", async () => {
  const page = rendererHarness({ abortAfterLink: true });
  await assert.rejects(createProjectImageRenderer(page.canvas, page.cover, page.preview, page.preparation), {
    name: "AbortError",
  });
  assert.equal(
    page.calls.some((call) => call.name === "linkProgram"),
    true
  );
  assert.equal(
    page.calls.some((call) => call.name === "texImage2D"),
    false
  );
  for (const kind of ["Shader", "Program", "Buffer"]) {
    const created = page.calls.filter((call) => call.name === `create${kind}`).map((call) => call.args[0]);
    const deleted = page.calls.filter((call) => call.name === `delete${kind}`).map((call) => call.args[0]);
    assert.ok(created.length > 0);
    assert.deepEqual(deleted, created);
  }
});

test("cancellation between image uploads releases the first texture and prevents the second upload", async () => {
  const page = rendererHarness({ abortAfterUpload: true });
  await assert.rejects(createProjectImageRenderer(page.canvas, page.cover, page.preview, page.preparation), {
    name: "AbortError",
  });
  assert.equal(page.calls.filter((call) => call.name === "texImage2D").length, 1);
  const created = page.calls.filter((call) => call.name === "createTexture").map((call) => call.args[0]);
  const deleted = page.calls.filter((call) => call.name === "deleteTexture").map((call) => call.args[0]);
  assert.equal(created.length, 1);
  assert.deepEqual(deleted, created);
});

test("an unavailable WebGL context preserves the HTML fallback without allocating renderer resources", async () => {
  const page = rendererHarness({ contextAvailable: false });
  const renderer = await createProjectImageRenderer(page.canvas, page.cover, page.preview, page.preparation);
  assert.equal(renderer, null);
  assert.deepEqual(
    page.calls.map((call) => call.name),
    ["getContext"]
  );
});

test("without parallel compilation the quiet fallback returns a bounded, disposable renderer", async () => {
  const page = rendererHarness({ parallel: false });
  const renderer = await createProjectImageRenderer(page.canvas, page.cover, page.preview, page.preparation);
  assert.ok(renderer);
  assert.deepEqual(
    page.calls.filter((call) => call.name === "getProgramParameter").map((call) => call.args[1]),
    [page.gl.LINK_STATUS]
  );
  renderer.resize(400, 200, 4);
  assert.equal(page.canvas.width, 600);
  assert.equal(page.canvas.height, 300);
  renderer.render(1.4, -0.5, 2);
  assert.deepEqual(page.calls.filter((call) => call.name === "uniform1f").at(-1).args, ["uProgress", 1]);
  assert.deepEqual(page.calls.filter((call) => call.name === "uniform2f").at(-1).args, ["uOrigin", 0, 1]);
  assert.deepEqual(page.calls.filter((call) => call.name === "drawArrays").at(-1).args, [page.gl.TRIANGLES, 0, 3]);
  renderer.dispose();
  renderer.dispose();
  const count = page.calls.length;
  renderer.render(0.5, 0.5, 0.5);
  renderer.resize(10, 10, 1);
  assert.equal(page.calls.length, count);
  for (const kind of ["Shader", "Program", "Buffer", "Texture"]) {
    assert.equal(
      page.calls.filter((call) => call.name === `delete${kind}`).length,
      page.calls.filter((call) => call.name === `create${kind}`).length
    );
  }
});
