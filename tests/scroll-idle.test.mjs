import assert from "node:assert/strict";
import { test } from "node:test";
import { acquireScrollIdle } from "../lib/scroll-idle.ts";

function browser(t, { idleCallbacks = true } = {}) {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  const idle = new Map();
  const leases = [];
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
    activity(type = "scroll") {
      fakeWindow.dispatchEvent(new Event(type));
    },
    visibility(hidden) {
      fakeDocument.hidden = hidden;
      fakeDocument.dispatchEvent(new Event("visibilitychange"));
    },
    timers,
    idle,
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
