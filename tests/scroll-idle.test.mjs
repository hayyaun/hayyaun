import assert from "node:assert/strict";
import { test } from "node:test";
import { acquireScrollIdle, registerSmoothScroll } from "../lib/scroll-idle.ts";

function browser(t, { idleCallbacks = true } = {}) {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  const idle = new Map();
  const frames = new Map();
  const leases = [];
  let motion;
  let unregisterSmoothScroll;
  class Surface extends EventTarget {
    listeners = new Map();
    addEventListener(type, callback, options) {
      const callbacks = this.listeners.get(type) ?? new Set();
      callbacks.add(callback);
      this.listeners.set(type, callbacks);
      super.addEventListener(type, callback, options);
    }
    removeEventListener(type, callback, options) {
      this.listeners.get(type)?.delete(callback);
      super.removeEventListener(type, callback, options);
    }
  }
  const fakeWindow = new Surface();
  const fakeDocument = new Surface();
  fakeDocument.hidden = false;
  fakeWindow.setTimeout = (callback, delay) => {
    const id = ++nextId;
    timers.set(id, { callback, at: now + delay });
    return id;
  };
  fakeWindow.clearTimeout = (id) => timers.delete(id);
  fakeWindow.requestAnimationFrame = (callback) => {
    const id = ++nextId;
    frames.set(id, callback);
    return id;
  };
  fakeWindow.cancelAnimationFrame = (id) => frames.delete(id);
  if (idleCallbacks) {
    fakeWindow.requestIdleCallback = (callback) => {
      const id = ++nextId;
      idle.set(id, callback);
      return id;
    };
    fakeWindow.cancelIdleCallback = (id) => idle.delete(id);
  }
  const priorWindow = globalThis.window;
  const priorDocument = globalThis.document;
  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;
  t.mock.method(performance, "now", () => now);
  t.after(() => {
    leases.forEach((lease) => lease.release());
    unregisterSmoothScroll?.();
    if (priorWindow === undefined) delete globalThis.window;
    else globalThis.window = priorWindow;
    if (priorDocument === undefined) delete globalThis.document;
    else globalThis.document = priorDocument;
  });
  return {
    acquire() {
      const lease = acquireScrollIdle();
      leases.push(lease);
      return lease;
    },
    advance(milliseconds) {
      const target = now + milliseconds;
      while (true) {
        const entry = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        const [id, timer] = entry;
        timers.delete(id);
        now = timer.at;
        timer.callback();
      }
      now = target;
    },
    flushIdle() {
      const entry = idle.entries().next().value;
      if (!entry) return;
      idle.delete(entry[0]);
      entry[1]({ didTimeout: false, timeRemaining: () => 10 });
    },
    flushFrame() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(now));
    },
    smooth(state) {
      motion = state;
      unregisterSmoothScroll ??= registerSmoothScroll(() => motion);
    },
    scrollEnd({ target = fakeDocument, lenis = false } = {}) {
      const event = lenis
        ? new CustomEvent("scrollend", { detail: { lenisScrollEnd: true } })
        : new Event("scrollend");
      // EventTarget does not model the browser's document-to-window capture path.
      Object.defineProperty(event, "target", { value: target });
      for (const callback of fakeWindow.listeners.get("scrollend") ?? []) callback(event);
    },
    activity(type = "scroll") {
      fakeWindow.dispatchEvent(new Event(type));
    },
    visibility(hidden) {
      fakeDocument.hidden = hidden;
      fakeDocument.dispatchEvent(new Event("visibilitychange"));
    },
    timers,
    idle,
    frames,
    window: fakeWindow,
    document: fakeDocument,
  };
}

test("first scroll still defers work after thirty seconds idle, and momentum extends the wait", async (t) => {
  const page = browser(t);
  const lease = page.acquire();
  page.advance(30_000);
  assert.equal(lease.isScrolling(), false);
  page.activity("wheel");
  let rendered = false;
  const work = lease.run(() => (rendered = true), new AbortController().signal);
  page.advance(150);
  page.activity();
  page.advance(199);
  assert.equal(lease.isScrolling(), true);
  assert.equal(page.idle.size, 0);
  assert.equal(rendered, false);
  page.advance(1);
  assert.equal(lease.isScrolling(), false);
  assert.equal(rendered, false);
  page.flushIdle();
  await work;
  assert.equal(rendered, true);
});

test("a wheel event between the quiet timer and idle execution postpones the job", async (t) => {
  const page = browser(t);
  const lease = page.acquire();
  let runs = 0;
  const work = lease.run(() => ++runs, new AbortController().signal);
  page.advance(200);
  const dispatchedIdle = page.idle.values().next().value;
  page.idle.clear();
  page.activity("wheel");
  // Also guard a callback already dispatched when cancellation occurred.
  dispatchedIdle({ didTimeout: false, timeRemaining: () => 10 });
  assert.equal(runs, 0);
  page.advance(199);
  assert.equal(page.idle.size, 0);
  page.advance(1);
  page.flushIdle();
  assert.equal(await work, 1);
});

test("multiple consumers share one listener set and execute one job per idle slot in FIFO order", async (t) => {
  const page = browser(t);
  const first = page.acquire();
  const second = page.acquire();
  assert.equal(page.window.listeners.get("scroll").size, 1);
  const order = [];
  const signal = new AbortController().signal;
  const jobs = [
    first.run(() => order.push(1), signal),
    second.run(() => order.push(2), signal),
    first.run(() => order.push(3), signal),
  ];
  page.advance(200);
  page.flushIdle();
  assert.deepEqual(order, [1]);
  assert.equal(page.idle.size, 1);
  page.flushIdle();
  assert.deepEqual(order, [1, 2]);
  page.flushIdle();
  await Promise.all(jobs);
  assert.deepEqual(order, [1, 2, 3]);
  assert.equal(page.idle.size, 0);
  assert.equal(page.timers.size, 0);
  page.activity("touchmove");
  assert.equal(first.isScrolling(), true);
});

test("abort removes queued work, its signal listener, and the final scheduled callback", async (t) => {
  const page = browser(t);
  const lease = page.acquire();
  const controller = new AbortController();
  const remove = t.mock.method(controller.signal, "removeEventListener");
  let runs = 0;
  const rejected = assert.rejects(
    lease.run(() => ++runs, controller.signal),
    { name: "AbortError" }
  );
  page.advance(200);
  controller.abort();
  await rejected;
  assert.equal(runs, 0);
  assert.equal(remove.mock.callCount(), 1);
  assert.equal(page.idle.size, 0);
  assert.equal(page.timers.size, 0);
  await assert.rejects(
    lease.run(() => ++runs, controller.signal),
    { name: "AbortError" }
  );
});

test("hidden pages pause work and becoming visible requires a fresh quiet interval", async (t) => {
  const page = browser(t);
  const lease = page.acquire();
  let runs = 0;
  const work = lease.run(() => ++runs, new AbortController().signal);
  page.advance(200);
  page.visibility(true);
  page.advance(30_000);
  page.flushIdle();
  assert.equal(runs, 0);
  assert.equal(page.timers.size, 0);
  page.visibility(false);
  page.advance(199);
  assert.equal(page.idle.size, 0);
  page.advance(1);
  page.flushIdle();
  assert.equal(await work, 1);
});

test("release cancels only its owner's work, and the final release removes shared resources", async (t) => {
  const page = browser(t);
  const first = page.acquire();
  const second = page.acquire();
  const signal = new AbortController().signal;
  const cancelled = assert.rejects(
    first.run(() => assert.fail("released job executed"), signal),
    { name: "AbortError" }
  );
  const remaining = second.run(() => "done", signal);
  first.release();
  first.release();
  await cancelled;
  assert.equal(page.window.listeners.get("wheel").size, 1);
  page.advance(200);
  page.flushIdle();
  assert.equal(await remaining, "done");
  const finalCancelled = assert.rejects(
    second.run(() => assert.fail("final job executed"), signal),
    { name: "AbortError" }
  );
  second.release();
  await finalCancelled;
  assert.equal(page.timers.size, 0);
  assert.equal(page.idle.size, 0);
  for (const callbacks of page.window.listeners.values()) assert.equal(callbacks.size, 0);
  for (const callbacks of page.document.listeners.values()) assert.equal(callbacks.size, 0);
  await assert.rejects(
    second.run(() => "late", signal),
    { name: "AbortError" }
  );
  const fresh = page.acquire();
  assert.equal(fresh.isScrolling(), true);
});

test("without requestIdleCallback the scheduler yields through a timer", async (t) => {
  const page = browser(t, { idleCallbacks: false });
  const lease = page.acquire();
  let runs = 0;
  const work = lease.run(() => ++runs, new AbortController().signal);
  page.advance(199);
  assert.equal(runs, 0);
  page.advance(1);
  assert.equal(await work, 1);
});

test("native scroll completion immediately releases prepared interactions ahead of GPU setup", async (t) => {
  const page = browser(t);
  const lease = page.acquire();
  const order = [];
  const signal = new AbortController().signal;
  page.activity("wheel");
  const firstSetup = lease.run(() => order.push("texture one"), signal);
  const secondSetup = lease.run(() => order.push("texture two"), signal);
  const reveal = lease.runWhenStopped(() => order.push("reveal"), signal);
  page.advance(16);
  page.scrollEnd();
  assert.equal(lease.isScrolling(), false);
  assert.equal(page.timers.size, 0);
  assert.equal(page.frames.size, 1);
  assert.equal(page.idle.size, 1);
  assert.deepEqual(order, []);
  page.flushFrame();
  await reveal;
  assert.deepEqual(order, ["reveal"]);
  page.flushIdle();
  await firstSetup;
  assert.deepEqual(order, ["reveal", "texture one"]);
  assert.equal(page.idle.size, 1);
  page.flushIdle();
  await secondSetup;
  assert.deepEqual(order, ["reveal", "texture one", "texture two"]);
});

test("Lenis motion ignores native per-frame ends and releases on its actual completion", async (t) => {
  const page = browser(t);
  const lease = page.acquire();
  page.smooth("smooth");
  page.activity("wheel");
  let runs = 0;
  const work = lease.runWhenStopped(() => ++runs, new AbortController().signal);
  page.advance(500);
  page.scrollEnd();
  page.scrollEnd({ target: page.window, lenis: true });
  assert.equal(lease.isScrolling(), true);
  assert.equal(page.frames.size, 0);
  assert.equal(page.idle.size, 0);
  assert.equal(runs, 0);
  page.smooth(false);
  page.scrollEnd({ target: page.window, lenis: true });
  assert.equal(lease.isScrolling(), false);
  assert.equal(page.timers.size, 0);
  page.flushFrame();
  assert.equal(await work, 1);
});

test("native scrolling completes without waiting for Lenis native-state debounce", async (t) => {
  const page = browser(t);
  const lease = page.acquire();
  page.smooth("native");
  page.activity("touchmove");
  const work = lease.runWhenStopped(() => "ready", new AbortController().signal);
  page.advance(20);
  page.scrollEnd();
  assert.equal(lease.isScrolling(), false);
  assert.equal(page.frames.size, 1);
  page.flushFrame();
  assert.equal(await work, "ready");
});

test("a stale Lenis completion during native scrolling keeps the fallback interval", async (t) => {
  const page = browser(t);
  const lease = page.acquire();
  page.smooth("native");
  page.activity();
  let runs = 0;
  const work = lease.runWhenStopped(() => ++runs, new AbortController().signal);
  page.advance(20);
  page.scrollEnd({ target: page.window, lenis: true });
  assert.equal(lease.isScrolling(), true);
  assert.equal(page.frames.size, 0);
  page.advance(179);
  assert.equal(page.frames.size, 0);
  page.advance(1);
  page.flushFrame();
  assert.equal(await work, 1);
});

test("nested and hidden scroll completions cannot bypass the fresh visibility wait", async (t) => {
  const page = browser(t);
  const lease = page.acquire();
  const work = lease.runWhenStopped(() => "ready", new AbortController().signal);
  page.activity();
  page.scrollEnd({ target: new EventTarget() });
  assert.equal(lease.isScrolling(), true);
  assert.equal(page.frames.size, 0);
  page.visibility(true);
  page.scrollEnd();
  page.advance(1_000);
  assert.equal(page.frames.size, 0);
  page.visibility(false);
  page.scrollEnd();
  page.advance(199);
  assert.equal(lease.isScrolling(), true);
  assert.equal(page.frames.size, 0);
  // A new completed page gesture is allowed to end that wait immediately.
  page.activity("touchmove");
  page.scrollEnd();
  page.flushFrame();
  assert.equal(await work, "ready");
});

test("new input reblocks a ready interaction even if its frame callback was dispatched", async (t) => {
  const page = browser(t);
  const lease = page.acquire();
  let runs = 0;
  page.activity();
  const work = lease.runWhenStopped(() => ++runs, new AbortController().signal);
  page.scrollEnd();
  const dispatchedFrame = page.frames.values().next().value;
  page.frames.clear();
  page.activity("wheel");
  dispatchedFrame(0);
  assert.equal(runs, 0);
  assert.equal(page.frames.size, 0);
  page.advance(199);
  assert.equal(page.frames.size, 0);
  page.advance(1);
  page.flushFrame();
  assert.equal(await work, 1);
});

test("ready interactions retain the 200 ms fallback when no completion event arrives", async (t) => {
  const page = browser(t);
  const lease = page.acquire();
  let runs = 0;
  page.activity("touchmove");
  const work = lease.runWhenStopped(() => ++runs, new AbortController().signal);
  page.advance(150);
  page.activity();
  page.advance(199);
  page.flushFrame();
  assert.equal(runs, 0);
  page.advance(1);
  assert.equal(page.frames.size, 1);
  page.flushFrame();
  assert.equal(await work, 1);
});

test("abort cancels a scheduled ready interaction and removes its signal listener", async (t) => {
  const page = browser(t);
  const lease = page.acquire();
  const controller = new AbortController();
  const remove = t.mock.method(controller.signal, "removeEventListener");
  page.activity();
  const rejected = assert.rejects(
    lease.runWhenStopped(() => assert.fail("aborted interaction executed"), controller.signal),
    { name: "AbortError" }
  );
  page.scrollEnd();
  assert.equal(page.frames.size, 1);
  controller.abort();
  await rejected;
  assert.equal(remove.mock.callCount(), 1);
  assert.equal(page.frames.size, 0);
  assert.equal(page.timers.size, 0);
  await assert.rejects(
    lease.runWhenStopped(() => "late", controller.signal),
    { name: "AbortError" }
  );
});

test("releasing ready-interaction owners leaves other clients intact and cleans final frames", async (t) => {
  const page = browser(t);
  const first = page.acquire();
  const second = page.acquire();
  const signal = new AbortController().signal;
  page.activity();
  const cancelled = assert.rejects(
    first.runWhenStopped(() => assert.fail("released interaction executed"), signal),
    { name: "AbortError" }
  );
  const remaining = second.runWhenStopped(() => "done", signal);
  page.scrollEnd();
  first.release();
  await cancelled;
  assert.equal(page.frames.size, 1);
  assert.equal(page.window.listeners.get("scrollend").size, 1);
  page.flushFrame();
  assert.equal(await remaining, "done");
  const finalCancelled = assert.rejects(
    second.runWhenStopped(() => assert.fail("final interaction executed"), signal),
    { name: "AbortError" }
  );
  second.release();
  await finalCancelled;
  assert.equal(page.frames.size, 0);
  assert.equal(page.timers.size, 0);
  assert.equal(page.idle.size, 0);
  for (const callbacks of page.window.listeners.values()) assert.equal(callbacks.size, 0);
  for (const callbacks of page.document.listeners.values()) assert.equal(callbacks.size, 0);
  await assert.rejects(
    second.runWhenStopped(() => "late", signal),
    { name: "AbortError" }
  );
});
