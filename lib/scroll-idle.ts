const quietMilliseconds = 200;

type Client = { released: boolean };
type Job = {
  client: Client;
  signal: AbortSignal;
  execute: () => void;
  cancel: () => void;
};

function aborted() {
  return new DOMException("Scroll idle work was cancelled", "AbortError");
}

class ScrollIdle {
  private clients = 0;
  private jobs: Job[] = [];
  private frameJobs: Job[] = [];
  private lastActivity = performance.now();
  private hasScrollActivity = false;
  private timer: number | undefined;
  private idle: { id: number; native: boolean } | undefined;
  private frame: number | undefined;
  private disposed = false;

  constructor() {
    const options = { capture: true, passive: true };
    window.addEventListener("wheel", this.onActivity, options);
    window.addEventListener("scroll", this.onActivity, options);
    window.addEventListener("touchmove", this.onActivity, options);
    // Capture document scrollend before Lenis suppresses native propagation.
    window.addEventListener("scrollend", this.onScrollEnd, options);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  acquire() {
    this.clients += 1;
    const client: Client = { released: false };
    return {
      run: <T>(task: () => T, signal: AbortSignal) => this.enqueue(client, task, signal, false),
      // Prepared interactions should not wait behind expensive GPU setup jobs.
      runWhenStopped: <T>(task: () => T, signal: AbortSignal) => this.enqueue(client, task, signal, true),
      isScrolling: () => this.isScrolling(),
      release: () => {
        if (client.released) return;
        client.released = true;
        for (const job of [...this.jobs, ...this.frameJobs]) {
          if (job.client === client) job.cancel();
        }
        this.clients -= 1;
        if (this.clients === 0) {
          this.dispose();
          shared = undefined;
        }
      },
    };
  }

  private enqueue<T>(client: Client, task: () => T, signal: AbortSignal, onFrame: boolean): Promise<T> {
    if (client.released || signal.aborted) return Promise.reject(aborted());
    return new Promise<T>((resolve, reject) => {
      const removeAbortListener = () => signal.removeEventListener("abort", cancel);
      const cancel = () => {
        this.jobs = this.jobs.filter((queued) => queued !== job);
        this.frameJobs = this.frameJobs.filter((queued) => queued !== job);
        removeAbortListener();
        reject(aborted());
        this.schedule();
      };
      const job: Job = {
        client,
        signal,
        cancel,
        execute: () => {
          removeAbortListener();
          try {
            resolve(task());
          } catch (error) {
            reject(error);
          }
        },
      };
      signal.addEventListener("abort", cancel, { once: true });
      (onFrame ? this.frameJobs : this.jobs).push(job);
      this.schedule();
    });
  }

  private isScrolling() {
    return (
      document.hidden || smoothScrollState?.() === "smooth" || performance.now() - this.lastActivity < quietMilliseconds
    );
  }

  private onActivity = () => {
    this.hasScrollActivity = true;
    this.lastActivity = performance.now();
    this.cancelScheduled();
    this.schedule();
  };

  private onScrollEnd = (event: Event) => {
    const motion = smoothScrollState?.();
    const lenisEnd = event instanceof CustomEvent && event.detail?.lenisScrollEnd === true;
    // Nested scrollers and native ends between Lenis frames do not end page motion.
    if (
      (event.target !== document && event.target !== window) ||
      document.hidden ||
      !this.hasScrollActivity ||
      motion === "smooth" ||
      (lenisEnd && motion !== false)
    )
      return;
    this.hasScrollActivity = false;
    this.lastActivity = -Infinity;
    this.cancelScheduled();
    this.schedule();
  };

  private onVisibilityChange = () => {
    this.hasScrollActivity = false;
    this.lastActivity = performance.now();
    this.cancelScheduled();
    this.schedule();
  };

  private cancelScheduled() {
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = undefined;
    if (this.idle !== undefined) {
      if (this.idle.native) window.cancelIdleCallback(this.idle.id);
      else window.clearTimeout(this.idle.id);
    }
    this.idle = undefined;
    if (this.frame !== undefined) window.cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }

  private schedule() {
    if (this.disposed || document.hidden || (this.jobs.length === 0 && this.frameJobs.length === 0)) {
      this.cancelScheduled();
      return;
    }
    if (this.timer !== undefined) return;
    const remaining =
      smoothScrollState?.() === "smooth"
        ? quietMilliseconds
        : quietMilliseconds - (performance.now() - this.lastActivity);
    if (remaining > 0) {
      this.timer = window.setTimeout(() => {
        this.timer = undefined;
        this.schedule();
      }, remaining);
    } else {
      if (this.frameJobs.length > 0 && this.frame === undefined) {
        this.frame = window.requestAnimationFrame(this.dispatchFrames);
      }
      if (this.jobs.length > 0 && this.idle === undefined) {
        if (typeof window.requestIdleCallback === "function") {
          this.idle = { id: window.requestIdleCallback(this.dispatch), native: true };
        } else {
          // A separate task yields to input even when requestIdleCallback is unavailable.
          this.idle = { id: window.setTimeout(this.dispatch, 0), native: false };
        }
      }
    }
  }

  private dispatch = () => {
    this.idle = undefined;
    if (this.disposed) return;
    // Input can arrive between the quiet timer and the browser's idle callback.
    if (this.isScrolling()) {
      this.schedule();
      return;
    }
    const job = this.jobs.shift();
    if (job) {
      if (job.signal.aborted || job.client.released) job.cancel();
      else job.execute();
    }
    // Keep GPU setup stages in separate idle opportunities so input can intervene.
    this.schedule();
  };

  private dispatchFrames = () => {
    this.frame = undefined;
    if (this.disposed) return;
    if (this.isScrolling()) {
      this.schedule();
      return;
    }
    const jobs = this.frameJobs.splice(0);
    for (const job of jobs) {
      if (job.signal.aborted || job.client.released) job.cancel();
      else job.execute();
    }
    this.schedule();
  };

  private dispose() {
    this.disposed = true;
    this.cancelScheduled();
    window.removeEventListener("wheel", this.onActivity, true);
    window.removeEventListener("scroll", this.onActivity, true);
    window.removeEventListener("touchmove", this.onActivity, true);
    window.removeEventListener("scrollend", this.onScrollEnd, true);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    for (const job of [...this.jobs, ...this.frameJobs]) job.cancel();
  }
}

let shared: ScrollIdle | undefined;
let smoothScrollState: (() => "smooth" | "native" | false) | undefined;

/** Read Lenis's public motion state without loading it into effect consumers. */
export function registerSmoothScroll(getState: () => "smooth" | "native" | false) {
  smoothScrollState = getState;
  return () => {
    if (smoothScrollState === getState) smoothScrollState = undefined;
  };
}

/** Share scroll activity tracking and defer synchronous GPU setup until input is quiet. */
export function acquireScrollIdle() {
  shared ??= new ScrollIdle();
  return shared.acquire();
}
