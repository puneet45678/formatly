import type { FormatId, FormatOutcome, FormatSettings } from "./types";

export type WorkerRequest = { id: number; format: FormatId; input: string; settings: FormatSettings };
export type WorkerResponse = { id: number; result: FormatOutcome };

/** The slice of a Web Worker the client uses, so tests can pass a fake. */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  terminate(): void;
  onmessage: ((event: { data: WorkerResponse }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

/**
 * When a new request arrives, an older job still running past this is dropped
 * by replacing its worker.
 *
 * The older job's result is thrown away either way (the newest request wins),
 * so letting it finish costs its remaining time, while replacing the worker
 * costs a respawn: measured at 20-50 ms in Chromium (new Worker + the cached
 * formatter chunk, Markdown the slowest). A job that has already run this long
 * is likely to run longer than a respawn takes, so replacing it is cheaper.
 * Jobs younger than this are left to finish, since most inputs format in a few
 * milliseconds.
 *
 * Typing is debounced by 300 ms, so this matters for requests that skip the
 * debounce, such as switching format right after a large paste.
 */
export const SUPERSEDE_AFTER_MS = 50;
/** A job that takes longer than this is given up on. */
export const TIMEOUT_MS = 15_000;

const CANCELLED: FormatOutcome = { kind: "cancelled" };
const TIMED_OUT: FormatOutcome = { kind: "failed", reason: "timeout", message: "Formatting took too long (over 15 seconds)" };
const CRASHED: FormatOutcome = { kind: "failed", reason: "crashed", message: "The formatter stopped unexpectedly" };

type PendingJob = {
  resolve: (result: FormatOutcome) => void;
  startedAt: number;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Talks to one Web Worker on behalf of the page.
 *
 * A worker handles one message at a time and can't be interrupted, so a slow
 * format (say a 1 MB paste) would make every later request wait behind it.
 * Instead, when a new request arrives and an old one has been running for a
 * while, we throw that worker away and start a fresh one.
 *
 * Results never reject: a timeout or crash comes back as `{ kind: "failed" }`
 * and a dropped job as `{ kind: "cancelled" }`, so callers have one path to handle.
 */
export function createWorkerClient(spawn: () => WorkerLike) {
  let worker: WorkerLike | null = null;
  let nextId = 1;
  // Like a Dictionary<int, TaskCompletionSource<FormatOutcome>> of pending requests:
  // the worker's replies arrive later and carry only an id, so this is how we
  // find which caller's promise to resolve.
  const pending = new Map<number, PendingJob>();

  /** Resolves every waiting job with `result`. */
  function settleAll(result: FormatOutcome) {
    for (const job of pending.values()) {
      clearTimeout(job.timer);
      job.resolve(result);
    }
    pending.clear();
  }

  /** Throws the current worker away (a new one is spawned on the next request) and settles all waiting jobs. */
  function discardWorker(result: FormatOutcome) {
    const old = worker;
    worker = null;
    old?.terminate();
    settleAll(result);
  }

  function getWorker(): WorkerLike {
    if (worker) return worker;
    const created = spawn();
    created.onmessage = ({ data }) => {
      // A reply for a job we already gave up on (timed out or superseded): ignore it.
      const job = pending.get(data.id);
      if (!job) return;
      clearTimeout(job.timer);
      pending.delete(data.id);
      job.resolve(data.result);
    };
    created.onerror = () => {
      // Only react to the current worker; a discarded one may still fire late.
      if (worker === created) discardWorker(CRASHED);
    };
    worker = created;
    return created;
  }

  return {
    run(format: FormatId, input: string, settings: FormatSettings): Promise<FormatOutcome> {
      // An earlier job still running after a while is likely a big input the user
      // has moved past. Drop it rather than queue behind it (see SUPERSEDE_AFTER_MS).
      const now = Date.now();
      const busy = [...pending.values()].some((job) => now - job.startedAt >= SUPERSEDE_AFTER_MS);
      if (busy) discardWorker(CANCELLED);

      const id = nextId++;
      return new Promise<FormatOutcome>((resolve) => {
        const timer = setTimeout(() => {
          // We can't stop one job inside a worker, so a stuck job means replacing the worker.
          discardWorker(TIMED_OUT);
        }, TIMEOUT_MS);
        pending.set(id, { resolve, startedAt: now, timer });
        getWorker().postMessage({ id, format, input, settings });
      });
    },

    /** Stops the worker. Jobs still waiting resolve as cancelled. */
    dispose() {
      discardWorker(CANCELLED);
    },
  };
}
