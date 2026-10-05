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
  private lastActivity = performance.now();
  private timer: number | undefined;
  private idle: { id: number; native: boolean } | undefined;
  private disposed = false;

  constructor() {
    const options = { capture: true, passive: true };
    window.addEventListener("wheel", this.onActivity, options);
    window.addEventListener("scroll", this.onActivity, options);
    window.addEventListener("touchmove", this.onActivity, options);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  acquire() {
    this.clients += 1;
    const client: Client = { released: false };
    return {
      run: <T>(task: () => T, signal: AbortSignal): Promise<T> => {
        if (client.released || signal.aborted) return Promise.reject(aborted());
        return new Promise<T>((resolve, reject) => {
          const removeAbortListener = () => signal.removeEventListener("abort", cancel);
          const cancel = () => {
            this.jobs = this.jobs.filter((queued) => queued !== job);
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
          this.jobs.push(job);
          this.schedule();
        });
      },
      isScrolling: () => this.isScrolling(),
      release: () => {
        if (client.released) return;
        client.released = true;
        for (const job of [...this.jobs]) {
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

  private isScrolling() {
    return document.hidden || performance.now() - this.lastActivity < quietMilliseconds;
  }

  private onActivity = () => {
    this.lastActivity = performance.now();
    this.cancelScheduled();
    this.schedule();
  };

  private onVisibilityChange = () => {
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
  }

  private schedule() {
    if (this.disposed || document.hidden || this.jobs.length === 0) {
      this.cancelScheduled();
      return;
    }
    if (this.timer !== undefined || this.idle !== undefined) return;
    const remaining = quietMilliseconds - (performance.now() - this.lastActivity);
    if (remaining > 0) {
      this.timer = window.setTimeout(() => {
        this.timer = undefined;
        this.schedule();
      }, remaining);
    } else if (typeof window.requestIdleCallback === "function") {
      this.idle = { id: window.requestIdleCallback(this.dispatch), native: true };
    } else {
      // A separate task yields to input even when requestIdleCallback is unavailable.
      this.idle = { id: window.setTimeout(this.dispatch, 0), native: false };
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

  private dispose() {
    this.disposed = true;
    this.cancelScheduled();
    window.removeEventListener("wheel", this.onActivity, true);
    window.removeEventListener("scroll", this.onActivity, true);
    window.removeEventListener("touchmove", this.onActivity, true);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    for (const job of [...this.jobs]) job.cancel();
  }
}

let shared: ScrollIdle | undefined;

/** Share scroll activity tracking and defer synchronous GPU setup until input is quiet. */
export function acquireScrollIdle() {
  shared ??= new ScrollIdle();
  return shared.acquire();
}
