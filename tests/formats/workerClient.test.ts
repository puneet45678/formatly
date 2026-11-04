import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkerClient, SUPERSEDE_AFTER_MS, TIMEOUT_MS } from "@/formats/workerClient";
import type { WorkerLike, WorkerRequest } from "@/formats/workerClient";
import type { FormatOutcome } from "@/formats/types";

// A stand-in for a real Web Worker: records what was posted and lets a test
// decide when (and whether) it answers.
class FakeWorker implements WorkerLike {
  posted: WorkerRequest[] = [];
  terminated = 0;
  onmessage: WorkerLike["onmessage"] = null;
  onerror: WorkerLike["onerror"] = null;

  postMessage(message: WorkerRequest) {
    this.posted.push(message);
  }
  terminate() {
    this.terminated += 1;
  }
  respond(id: number, result: FormatOutcome) {
    this.onmessage?.({ data: { id, result } });
  }
  crash() {
    this.onerror?.(new Error("worker crashed"));
  }
}

const ok = (output: string): FormatOutcome => ({ kind: "ok", output });
const invalid = (message: string): FormatOutcome => ({ kind: "invalid", error: { message, line: 1 } });

let workers: FakeWorker[];
const spawn = vi.fn(() => {
  const worker = new FakeWorker();
  workers.push(worker);
  return worker;
});

beforeEach(() => {
  vi.useFakeTimers();
  workers = [];
  spawn.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createWorkerClient", () => {
  it("sends the request and resolves with the matching response", async () => {
    const client = createWorkerClient(spawn);
    const promise = client.run("json", '{"a":1}', { indent: "2" });

    expect(workers[0].posted).toEqual([{ id: expect.any(Number), format: "json", input: '{"a":1}', settings: { indent: "2" } }]);
    workers[0].respond(workers[0].posted[0].id, ok("done"));

    await expect(promise).resolves.toEqual(ok("done"));
  });

  it("spawns the worker lazily, once", async () => {
    const client = createWorkerClient(spawn);
    expect(spawn).not.toHaveBeenCalled();

    const first = client.run("json", "1", {});
    workers[0].respond(workers[0].posted[0].id, ok("1"));
    await first;

    const second = client.run("json", "2", {});
    workers[0].respond(workers[0].posted[1].id, ok("2"));
    await second;

    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("keeps a worker that answers quickly", async () => {
    const client = createWorkerClient(spawn);
    const first = client.run("json", "1", {});
    vi.advanceTimersByTime(SUPERSEDE_AFTER_MS - 1);
    workers[0].respond(workers[0].posted[0].id, ok("1"));
    await first;

    // Much later, but nothing is pending, so there is nothing to give up on.
    vi.advanceTimersByTime(5000);
    const second = client.run("json", "2", {});
    workers[0].respond(workers[0].posted[1].id, ok("2"));
    await second;

    expect(spawn).toHaveBeenCalledTimes(1);
    expect(workers[0].terminated).toBe(0);
  });

  it("replaces a worker that is busy with an old job", async () => {
    const client = createWorkerClient(spawn);
    const jobA = client.run("json", "A", {});

    vi.advanceTimersByTime(SUPERSEDE_AFTER_MS);
    const jobB = client.run("json", "B", {});

    expect(workers[0].terminated).toBe(1);
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(workers[1].posted.map((p) => p.input)).toEqual(["B"]);
    await expect(jobA).resolves.toEqual({ kind: "cancelled" });

    workers[1].respond(workers[1].posted[0].id, ok("B done"));
    await expect(jobB).resolves.toEqual(ok("B done"));
  });

  it("does not replace a worker that only just started", async () => {
    const client = createWorkerClient(spawn);
    const jobA = client.run("json", "A", {});

    vi.advanceTimersByTime(SUPERSEDE_AFTER_MS - 1);
    const jobB = client.run("json", "B", {});

    expect(workers).toHaveLength(1);
    expect(workers[0].terminated).toBe(0);
    expect(workers[0].posted.map((p) => p.input)).toEqual(["A", "B"]);

    // Both jobs are in flight on the same worker, and each gets its own answer.
    workers[0].respond(workers[0].posted[1].id, ok("B done"));
    workers[0].respond(workers[0].posted[0].id, ok("A done"));
    await expect(jobA).resolves.toEqual(ok("A done"));
    await expect(jobB).resolves.toEqual(ok("B done"));
  });

  // The bug the 50 ms threshold fixes: with the old 300 ms, switching format
  // 100 ms into a slow job queued the new request behind it for the whole job.
  it("does not make a new request wait behind a slow job that is 100 ms in", async () => {
    const client = createWorkerClient(spawn);
    const slow = client.run("markdown", "huge paste", {});

    vi.advanceTimersByTime(100);
    const next = client.run("json", "{}", {});

    expect(workers[0].terminated).toBe(1);
    expect(workers[1].posted.map((p) => p.format)).toEqual(["json"]);
    await expect(slow).resolves.toEqual({ kind: "cancelled" });
    workers[1].respond(workers[1].posted[0].id, ok("{}"));
    await expect(next).resolves.toEqual(ok("{}"));
  });

  it("keeps the threshold well under the typing debounce and near the measured respawn cost", () => {
    // Respawning measured 20-50 ms in Chromium; typing is debounced 300 ms.
    expect(SUPERSEDE_AFTER_MS).toBeGreaterThanOrEqual(20);
    expect(SUPERSEDE_AFTER_MS).toBeLessThan(300);
  });

  it("times out a job that never finishes", async () => {
    const client = createWorkerClient(spawn);
    const promise = client.run("json", "huge", {});

    vi.advanceTimersByTime(TIMEOUT_MS);

    // A failure with no position: a timeout says nothing about line 1 of the input.
    await expect(promise).resolves.toEqual({
      kind: "failed",
      reason: "timeout",
      message: "Formatting took too long (over 15 seconds)",
    });
    expect(workers[0].terminated).toBe(1);
  });

  it("recovers after the worker crashes", async () => {
    const client = createWorkerClient(spawn);
    const crashed = client.run("json", "bad", {});

    workers[0].crash();
    await expect(crashed).resolves.toEqual({ kind: "failed", reason: "crashed", message: "The formatter stopped unexpectedly" });

    const retry = client.run("json", "good", {});
    expect(spawn).toHaveBeenCalledTimes(2);
    workers[1].respond(workers[1].posted[0].id, ok("good"));
    await expect(retry).resolves.toEqual(ok("good"));
  });

  it("ignores responses for unknown ids", async () => {
    const client = createWorkerClient(spawn);
    const promise = client.run("json", "A", {});

    workers[0].respond(9999, invalid("stray"));
    workers[0].respond(workers[0].posted[0].id, ok("A done"));

    await expect(promise).resolves.toEqual(ok("A done"));
  });

  it("clears a job's timer once it has answered", async () => {
    const client = createWorkerClient(spawn);
    const promise = client.run("json", "A", {});
    workers[0].respond(workers[0].posted[0].id, ok("A done"));
    await promise;

    vi.advanceTimersByTime(TIMEOUT_MS * 2);
    expect(workers[0].terminated).toBe(0);
  });

  it("terminates the worker and settles pending jobs when disposed", async () => {
    const client = createWorkerClient(spawn);
    const promise = client.run("json", "A", {});

    client.dispose();

    await expect(promise).resolves.toEqual({ kind: "cancelled" });
    expect(workers[0].terminated).toBe(1);
  });

  it("passes the worker's invalid-input result through unchanged", async () => {
    const client = createWorkerClient(spawn);
    const promise = client.run("json", "{", {});
    workers[0].respond(workers[0].posted[0].id, invalid("Expected }"));
    await expect(promise).resolves.toEqual(invalid("Expected }"));
  });
});
