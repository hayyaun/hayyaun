import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const poses = ["idle", "left", "middle", "right"];
const jsx = (type, props) => ({ type, props });
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function compile(filename, imports) {
  const source = ts.transpileModule(readFileSync(new URL(filename, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const sandboxModule = { exports: {} };
  runInNewContext(source, {
    module: sandboxModule,
    exports: sandboxModule.exports,
    require: (name) => imports[name],
    queueMicrotask,
    DOMException,
  });
  return sandboxModule.exports.default;
}

function walk(tree, predicate) {
  if (!tree || typeof tree !== "object") return undefined;
  if (predicate(tree)) return tree;
  const children = [tree.props?.children].flat(Infinity);
  return children.map((child) => walk(child, predicate)).find(Boolean);
}

function hooks() {
  const refs = [],
    values = [],
    effects = [],
    jobs = [];
  let r = 0,
    s = 0,
    e = 0;
  return {
    reset() {
      r = s = e = 0;
    },
    run() {
      for (const job of jobs.splice(0)) job();
    },
    react: {
      useRef(value) {
        return (refs[r++] ??= { current: value });
      },
      useState(value) {
        const i = s++;
        values[i] ??= value;
        return [
          values[i],
          (next) => {
            values[i] = typeof next === "function" ? next(values[i]) : next;
          },
        ];
      },
      useEffect(fn, deps) {
        const i = e++,
          old = effects[i];
        if (!old || deps.some((value, index) => value !== old.deps[index])) {
          jobs.push(() => {
            old?.cleanup?.();
            effects[i] = { deps, cleanup: fn() };
          });
        }
      },
    },
  };
}

function skillHarness() {
  const h = hooks();
  const component = compile("../components/portrait-skills.tsx", {
    react: h.react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "@/components/portrait-player": () => {},
    "@/lib/portrait-motion": {},
  });
  const render = () => {
    h.reset();
    return component();
  };
  return {
    stage: () => walk(render(), (n) => n.props?.className === "portrait-stage").props,
    card: (direction) =>
      walk(render(), (n) => n.props?.className === `portrait-skill portrait-skill-${direction}`).props,
    button: (direction) =>
      walk(
        walk(render(), (n) => n.props?.className === `portrait-skill portrait-skill-${direction}`),
        (n) => n.type === "button"
      ).props,
  };
}

function playerHarness({ motion = true, saveData = false } = {}) {
  const h = hooks();
  const players = new Map();
  const motionListeners = new Set(),
    visibilityListeners = new Set();
  const media = {
    matches: !motion,
    addEventListener: (_, fn) => motionListeners.add(fn),
    removeEventListener: (_, fn) => motionListeners.delete(fn),
  };
  const document = {
    hidden: false,
    addEventListener: (_, fn) => visibilityListeners.add(fn),
    removeEventListener: (_, fn) => visibilityListeners.delete(fn),
  };
  let observer;
  const source = ts.transpileModule(
    readFileSync(new URL("../components/portrait-player.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }
  ).outputText;
  const sandboxModule = { exports: {} };
  runInNewContext(source, {
    module: sandboxModule,
    exports: sandboxModule.exports,
    require: (name) =>
      ({
        react: h.react,
        "react/jsx-runtime": { jsx, jsxs: jsx },
        "next/image": () => {},
        "@/lib/portrait-motion": { portraitPoses: poses, portraitAssetBase: "/portrait/v2" },
      })[name],
    window: { matchMedia: () => media },
    navigator: { connection: { saveData } },
    document,
    queueMicrotask,
    DOMException,
    IntersectionObserver: class {
      constructor(fn) {
        observer = fn;
      }
      observe() {}
      disconnect() {}
    },
  });
  const attributes = new Map();
  function render(direction = null, mount = false) {
    h.reset();
    const tree = sandboxModule.exports.default({ direction });
    if (mount) {
      tree.props.ref.current = { setAttribute: (key, value) => attributes.set(key, value) };
      for (const pose of poses) {
        const calls = [],
          frames = new Map(),
          attrs = new Map();
        const video = {
          paused: true,
          loads: 0,
          frames,
          calls,
          attrs,
          getAttribute(key) {
            return key === "src" ? this.src : attrs.get(key);
          },
          setAttribute(key, value) {
            attrs.set(key, value);
          },
          load() {
            this.loads++;
          },
          pause() {
            this.paused = true;
          },
          play() {
            this.paused = false;
            return new Promise((resolve, reject) => calls.push({ resolve, reject }));
          },
          requestVideoFrameCallback(fn) {
            const id = frames.size + 1;
            frames.set(id, fn);
            return id;
          },
          cancelVideoFrameCallback(id) {
            frames.delete(id);
          },
        };
        players.set(pose, video);
        walk(
          walk(tree, (n) => n.props?.className === "portrait-pose" && n.props["data-pose"] === pose),
          (n) => n.type === "video"
        ).props.ref(video);
      }
    }
    h.run();
  }
  render(null, true);
  return {
    players,
    attributes,
    select: render,
    visible(value) {
      observer([{ isIntersecting: value }]);
    },
    motion(value) {
      media.matches = !value;
      for (const fn of motionListeners) fn();
    },
    hidden(value) {
      document.hidden = value;
      for (const fn of visibilityListeners) fn();
    },
  };
}

test("only a hovered card opens; background has no pointer tracking", () => {
  const ui = skillHarness();
  assert.equal(ui.stage().onPointerMove, undefined);
  assert.equal(ui.stage()["data-active"], "idle");
  ui.card("left").onPointerEnter({ pointerType: "mouse" });
  assert.equal(ui.stage()["data-active"], "left");
  ui.card("left").onPointerLeave();
  assert.equal(ui.stage()["data-active"], "idle");
});

test("mouse clicks do not pin a card; touch toggles and keyboard focus remains available", () => {
  const ui = skillHarness();
  ui.button("right").onPointerDown({ pointerType: "mouse" });
  ui.button("right").onClick();
  assert.equal(ui.stage()["data-active"], "idle");
  ui.button("right").onPointerDown({ pointerType: "touch" });
  ui.button("right").onClick();
  assert.equal(ui.stage()["data-active"], "right");
  ui.button("right").onClick();
  assert.equal(ui.stage()["data-active"], "idle");
  ui.button("middle").onFocus({ currentTarget: { matches: () => true } });
  assert.equal(ui.stage()["data-active"], "middle");
  ui.button("middle").onBlur();
  assert.equal(ui.stage()["data-active"], "idle");
});

test("late playback completion cannot restart a pose after rapid hover changes", async () => {
  const p = playerHarness();
  p.visible(true);
  p.select("left");
  p.select("right");
  p.players.get("left").calls[0].resolve();
  p.players.get("right").calls[0].resolve();
  await flush();
  assert.equal(p.attributes.get("data-pose"), "right");
  assert.equal(p.players.get("left").paused, true);
  assert.equal(p.players.get("right").paused, false);
});

test("rapid leave-and-return retries an interrupted play for the latest pose", async () => {
  const p = playerHarness();
  p.visible(true);
  p.select("left");
  p.select("right");
  p.select("left");
  p.players.get("left").calls[0].reject(new DOMException("Interrupted", "AbortError"));
  await flush();
  assert.equal(p.players.get("left").calls.length, 2);
  p.players.get("left").calls[1].resolve();
  await flush();
  assert.equal(p.players.get("left").paused, false);
  assert.equal(p.players.get("right").paused, true);
});

test("reduced motion and Save-Data keep video unloaded; hidden and offscreen pause every pose", () => {
  for (const options of [{ motion: false }, { saveData: true }]) {
    const p = playerHarness(options);
    p.visible(true);
    p.select("left");
    assert.equal(p.attributes.get("data-pose"), "idle");
    for (const video of p.players.values()) assert.equal(video.loads, 0);
  }
  const p = playerHarness();
  p.visible(true);
  p.select("middle");
  p.hidden(true);
  for (const video of p.players.values()) assert.equal(video.paused, true);
  p.hidden(false);
  p.visible(false);
  for (const video of p.players.values()) assert.equal(video.paused, true);
});
