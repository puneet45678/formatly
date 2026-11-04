import type { FormatId, FormatResult, FormatSettings } from "./types";

export type WorkerRequest = { id: number; format: FormatId; input: string; settings: FormatSettings };
export type WorkerResponse = { id: number; result: FormatResult };

/** The slice of a Web Worker the client uses, so tests can pass a fake. */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  terminate(): void;
  onmessage: ((event: { data: WorkerResponse }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

/** A job older than this is treated as "probably a huge paste": a new request replaces its worker. */
export const SUPERSEDE_AFTER_MS = 300;
/** A job that takes longer than this is given up on. */
export const TIMEOUT_MS = 15_000;

const failure = (message: string): FormatResult => ({ ok: false, error: { message, line: 1 } });
const SUPERSEDED = failure("Superseded");
const TIMED_OUT = failure("Formatting took too long (over 15 seconds)");
const CRASHED = failure("The formatter stopped unexpectedly. Try again.");

type PendingJob = {
  resolve: (result: FormatResult) => void;
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
 * Results never reject: failures come back as `{ ok: false }` like any other
 * format error, so callers have a single path to handle.
 */
export function createWorkerClient(spawn: () => WorkerLike) {
  let worker: WorkerLike | null = null;
  let nextId = 1;
  // Like a Dictionary<int, TaskCompletionSource<FormatResult>> of pending requests:
  // the worker's replies arrive later and carry only an id, so this is how we
  // find which caller's promise to resolve.
  const pending = new Map<number, PendingJob>();

  /** Resolves every waiting job with `result`. */
  function settleAll(result: FormatResult) {
    for (const job of pending.values()) {
      clearTimeout(job.timer);
      job.resolve(result);
    }
    pending.clear();
  }

  /** Throws the current worker away (a new one is spawned on the next request) and settles all waiting jobs. */
  function discardWorker(result: FormatResult) {
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
    run(format: FormatId, input: string, settings: FormatSettings): Promise<FormatResult> {
      // If an earlier job is still running after a while, it is likely a huge input
      // that the user has already typed past. Drop it rather than queue behind it.
      const now = Date.now();
      const busy = [...pending.values()].some((job) => now - job.startedAt >= SUPERSEDE_AFTER_MS);
      if (busy) discardWorker(SUPERSEDED);

      const id = nextId++;
      return new Promise<FormatResult>((resolve) => {
        const timer = setTimeout(() => {
          // We can't stop one job inside a worker, so a stuck job means replacing the worker.
          discardWorker(TIMED_OUT);
        }, TIMEOUT_MS);
        pending.set(id, { resolve, startedAt: now, timer });
        getWorker().postMessage({ id, format, input, settings });
      });
    },

    /** Stops the worker. Jobs still waiting resolve as superseded. */
    dispose() {
      discardWorker(SUPERSEDED);
    },
  };
}
