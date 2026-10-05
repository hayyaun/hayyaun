import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const component = ts.transpileModule(
  readFileSync(new URL("../components/project-image.tsx", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }
).outputText;

/** Execute the actual component effect with controlled browser and GPU timing. */
function interactionHarness(t, { touch = false, motion = true, lowPerformance = false } = {}) {
  class FakeNode {
    listeners = new Map();
    children = [];
    addEventListener(type, callback) {
      const callbacks = this.listeners.get(type) ?? new Set();
      callbacks.add(callback);
      this.listeners.set(type, callbacks);
    }
    removeEventListener(type, callback) {
      this.listeners.get(type)?.delete(callback);
    }
    emit(type, event = {}) {
      for (const callback of [...(this.listeners.get(type) ?? [])]) {
        callback({ target: this, ...event });
      }
    }
    contains(node) {
      return this === node || this.children.some((child) => child.contains(node));
    }
  }
  class FakeElement extends FakeNode {
    dataset = {};
    hovered = false;
    focused = false;
    matches(selector) {
      return selector === ":hover" ? this.hovered : selector === ":focus-visible" && this.focused;
    }
    getBoundingClientRect() {
      return { left: 20, top: 30, width: 400, height: 200 };
    }
  }
  const card = new FakeElement();
  const anchor = new FakeElement();
  anchor.closest = () => card;
  const cover = Object.assign(new FakeElement(), { complete: true, naturalWidth: 1000, naturalHeight: 500 });
  const preview = Object.assign(new FakeElement(), { complete: true, naturalWidth: 1000, naturalHeight: 500 });
  const canvas = Object.assign(new FakeElement(), { hidden: true });
  card.children = [anchor];
  anchor.children = [cover, preview, canvas];
  const document = Object.assign(new FakeNode(), { hidden: false, activeElement: null });
  const motionQuery = Object.assign(new FakeNode(), { matches: motion });
  const hoverQuery = Object.assign(new FakeNode(), { matches: !touch });
  const effects = [];
  const frames = new Map();
  const jobs = [];
  const resumeJobs = [];
  const factories = [];
  const renders = [];
  const sizes = [];
  let time = 0;
  let nextFrame = 0;
  let scrolling = false;
  let disposed = 0;
  let creations = 0;
  let cleanup;
  let intersection;
  let resize;
  const renderer = {
    render(progress, x, y) {
      renders.push({ progress, x, y, scrolling });
    },
    resize(...args) {
      sizes.push(args);
    },
    dispose() {
      disposed++;
    },
  };
  const scrollIdle = {
    isScrolling: () => scrolling,
    release() {},
    run: (task, signal) => enqueue(task, signal, jobs),
    runWhenStopped: (task, signal) => enqueue(task, signal, resumeJobs),
  };
  function enqueue(task, signal, queue) {
    if (signal.aborted) return Promise.reject(new DOMException("Cancelled", "AbortError"));
    return new Promise((resolve, reject) => {
      const job = { task, signal, resolve, reject };
      job.abort = () => {
        const position = queue.indexOf(job);
        if (position !== -1) queue.splice(position, 1);
        reject(new DOMException("Cancelled", "AbortError"));
      };
      signal.addEventListener("abort", job.abort, { once: true });
      queue.push(job);
    });
  }
  const runtime = {
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
  };
  const dependencies = {
    "react/jsx-runtime": runtime,
    react: {
      useRef: (current) => ({ current }),
      useId: () => "project-description",
      useState: (value) => [value, () => {}],
      useEffect: (effect) => effects.push(effect),
    },
    "next/image": { default: "image", __esModule: true },
    "next/link": { default: "link", __esModule: true },
    "@/lib/graphics-performance": {
      performanceModeConfig: { test: { projects: !lowPerformance } },
      useGraphicsPerformance: (selector) => selector({ mode: "test", projectsEnabled: true }),
    },
    "@/lib/scroll-idle": { acquireScrollIdle: () => scrollIdle },
    "@/lib/project-image-renderer": {
      createProjectImageRenderer: () => {
        creations++;
        return new Promise((resolve) => factories.push(resolve));
      },
    },
  };
  const exports = {};
  runInNewContext(component, {
    exports,
    require(name) {
      assert.ok(name in dependencies, `Unexpected component dependency: ${name}`);
      return dependencies[name];
    },
    document,
    window: { devicePixelRatio: 1 },
    matchMedia: (query) => (query.includes("prefers-reduced-motion") ? motionQuery : hoverQuery),
    Node: FakeNode,
    Element: FakeElement,
    AbortController,
    DOMException,
    requestAnimationFrame(callback) {
      const id = ++nextFrame;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    IntersectionObserver: class {
      constructor(callback) {
        intersection = callback;
      }
      observe() {}
      disconnect() {}
    },
    ResizeObserver: class {
      constructor(callback) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    },
  });
  const tree = exports.default({
    href: "/projects/example",
    src: "/cover.png",
    previewSrc: "/preview.png",
    alt: "Project cover",
    title: "Example",
    previewAlt: "Website screenshot",
    width: 1000,
    height: 500,
  });
  tree.props.ref.current = anchor;
  for (const child of tree.props.children) {
    if (child.props.className === "project-image") child.props.ref.current = cover;
    if (child.props.className === "project-preview") child.props.ref.current = preview;
    if (child.type === "canvas") child.props.ref.current = canvas;
  }
  cleanup = effects[0]();
  t.after(() => cleanup());

  const microtasks = async () => {
    for (let turn = 0; turn < 12; turn++) await Promise.resolve();
  };
  const flushIdle = async () => {
    await microtasks();
    for (let turn = 0; jobs.length && !scrolling; turn++) {
      assert.ok(turn < 100, "Quiet work did not settle");
      const job = jobs.shift();
      job.signal.removeEventListener("abort", job.abort);
      try {
        job.resolve(job.task());
      } catch (error) {
        job.reject(error);
      }
      await microtasks();
    }
  };
  const tick = (milliseconds = 50) => {
    time += milliseconds;
    const callbacks = [...frames.values()];
    frames.clear();
    if (!scrolling) {
      for (const job of resumeJobs.splice(0)) {
        job.signal.removeEventListener("abort", job.abort);
        try {
          job.resolve(job.task());
        } catch (error) {
          job.reject(error);
        }
      }
    }
    callbacks.forEach((callback) => callback(time));
  };
  const pointer = (type, target = anchor, values = {}) => {
    time += 10;
    document.emit(type, {
      target,
      pointerType: "touch",
      pointerId: 1,
      isPrimary: true,
      clientX: 150,
      clientY: 100,
      timeStamp: time,
      ...values,
    });
  };
  return {
    anchor,
    canvas,
    renders,
    frames,
    get creations() {
      return creations;
    },
    get disposed() {
      return disposed;
    },
    show() {
      intersection([{ isIntersecting: true }]);
    },
    resize: () => resize([]),
    hover() {
      card.hovered = true;
      card.emit("pointerenter", { pointerType: "mouse", clientX: 150, clientY: 100 });
    },
    focus() {
      anchor.focused = true;
      document.activeElement = anchor;
      card.emit("focusin", { target: anchor });
    },
    leave() {
      card.hovered = false;
      card.emit("pointerleave");
    },
    tap() {
      pointer("pointerdown");
      pointer("pointerup");
      let prevented = false;
      tree.props.onClick({ detail: 1, clientX: 150, clientY: 100, preventDefault: () => (prevented = true) });
      return prevented;
    },
    outsideTap() {
      pointer("pointerdown", document);
      pointer("pointerup", document);
    },
    scrolling(value) {
      scrolling = value;
    },
    flushIdle,
    async ready(available = true) {
      await flushIdle();
      assert.equal(factories.length, 1, "GPU preparation was not requested");
      factories.shift()(available ? renderer : null);
      await flushIdle();
    },
    tick,
    finishAnimation() {
      for (let turn = 0; frames.size; turn++) {
        assert.ok(turn < 100, "Animation did not settle");
        tick();
      }
    },
  };
}

test("cold first hover survives the initial resize and starts a shader reveal from the cover", async (t) => {
  const page = interactionHarness(t);
  page.show();
  page.hover();
  assert.equal(page.anchor.dataset.shaderPending, "true");
  assert.equal(page.canvas.hidden, true);
  page.resize();
  assert.equal(page.anchor.dataset.shaderPending, "true");
  await page.ready();
  assert.equal(page.renders[0].progress, 0);
  assert.equal(page.canvas.hidden, false);
  assert.equal(page.anchor.dataset.shaderPending, undefined);
  page.tick();
  assert.ok(page.renders.at(-1).progress > 0 && page.renders.at(-1).progress < 1);
  page.finishAnimation();
  assert.equal(page.renders.at(-1).progress, 1);
  assert.equal(page.canvas.hidden, true);
});

test("cold first tap reveals with the shader and navigation waits until the reveal completes", async (t) => {
  const page = interactionHarness(t, { touch: true });
  page.show();
  assert.equal(page.tap(), true);
  assert.equal(page.anchor.dataset.shaderPending, "true");
  assert.equal(page.tap(), true, "A tap during GPU preparation must not navigate");
  await page.ready();
  assert.equal(page.renders[0].progress, 0);
  assert.equal(page.tap(), true, "A tap during the reveal must not navigate");
  page.finishAnimation();
  assert.equal(page.tap(), false, "A tap on the completed preview should follow the case study link");
});

test("a prepared hover resumes on the next frame after scrolling ends without waiting for idle work", async (t) => {
  const page = interactionHarness(t);
  page.show();
  await page.ready();
  const before = page.renders.length;
  page.scrolling(true);
  page.hover();
  assert.equal(page.anchor.dataset.shaderPending, "true");
  await page.flushIdle();
  page.tick();
  assert.equal(page.renders.length, before, "No shader draws should run during momentum");
  page.scrolling(false);
  page.tick();
  assert.equal(page.renders.at(-1).progress, 0);
  assert.equal(page.canvas.hidden, false);
  page.finishAnimation();
  assert.equal(page.renders.at(-1).progress, 1);
  assert.ok(page.renders.every((render) => !render.scrolling));
});

test("a prepared first tap resumes after momentum on the next frame and keeps navigation guarded", async (t) => {
  const page = interactionHarness(t, { touch: true });
  page.show();
  await page.ready();
  page.scrolling(true);
  assert.equal(page.tap(), true);
  assert.equal(page.anchor.dataset.shaderPending, "true");
  page.tick();
  assert.equal(page.canvas.hidden, true);
  page.scrolling(false);
  page.tick();
  assert.equal(page.canvas.hidden, false);
  assert.equal(page.renders.at(-1).progress, 0);
  assert.equal(page.tap(), true);
  page.finishAnimation();
  assert.equal(page.tap(), false);
  assert.ok(page.renders.every((render) => !render.scrolling));
});

test("first keyboard focus uses the same deferred shader reveal", async (t) => {
  const page = interactionHarness(t);
  page.show();
  page.focus();
  assert.equal(page.anchor.dataset.shaderPending, "true");
  await page.ready();
  assert.equal(page.renders[0].progress, 0);
  assert.equal(page.canvas.hidden, false);
  page.finishAnimation();
  assert.equal(page.renders.at(-1).progress, 1);
});

test("scrolling interrupts an already visible transition without drawing or replaying it after momentum", async (t) => {
  const page = interactionHarness(t);
  page.show();
  await page.ready();
  page.hover();
  page.tick();
  assert.ok(page.renders.at(-1).progress > 0 && page.renders.at(-1).progress < 1);
  const before = page.renders.length;
  page.scrolling(true);
  page.tick();
  assert.equal(page.renders.length, before);
  assert.equal(page.canvas.hidden, true);
  assert.equal(page.anchor.dataset.shaderPending, undefined);
  page.scrolling(false);
  await page.flushIdle();
  assert.equal(page.renders.length, before);
  assert.equal(page.frames.size, 0);
});

test("leaving before cold preparation completes cancels the reveal without replaying it", async (t) => {
  const page = interactionHarness(t);
  page.show();
  page.hover();
  page.leave();
  assert.equal(page.anchor.dataset.shaderPending, undefined);
  await page.ready();
  assert.equal(page.frames.size, 0);
  assert.equal(page.canvas.hidden, true);
  assert.ok(page.renders.every((render) => render.progress === 0));
});

test("tapping outside after the first touch reveal restores the cover", async (t) => {
  const page = interactionHarness(t, { touch: true });
  page.show();
  page.tap();
  await page.ready();
  page.finishAnimation();
  page.outsideTap();
  page.finishAnimation();
  assert.equal(page.renders.at(-1).progress, 0);
  assert.equal(page.anchor.dataset.tapPreview, undefined);
  assert.equal(page.canvas.hidden, true);
});

test("failed WebGL preparation releases the held cover and preserves the two-tap HTML fallback", async (t) => {
  const page = interactionHarness(t, { touch: true });
  page.show();
  assert.equal(page.tap(), true);
  await page.ready(false);
  assert.equal(page.anchor.dataset.shaderPending, undefined);
  assert.equal(page.canvas.hidden, true);
  assert.equal(page.tap(), false);
});

for (const [name, options] of [
  ["reduced motion", { motion: false }],
  ["disabled project effects", { lowPerformance: true }],
]) {
  test(`${name} uses the HTML touch fallback without reserving a shader reveal`, async (t) => {
    const page = interactionHarness(t, { touch: true, ...options });
    page.show();
    assert.equal(page.tap(), true);
    await page.flushIdle();
    assert.equal(page.creations, 0);
    assert.equal(page.anchor.dataset.shaderPending, undefined);
    assert.equal(page.canvas.hidden, true);
    assert.equal(page.tap(), false);
  });
}
