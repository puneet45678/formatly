import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { FormatId, FormatOutcome, FormatSettings } from "@/formats/types";

const runFormatter = vi.fn<(id: FormatId, input: string, settings: FormatSettings) => Promise<FormatOutcome>>();
vi.mock("@/formats/runFormatter", () => ({ runFormatter: (...args: Parameters<typeof runFormatter>) => runFormatter(...args) }));

import { FORMAT_DEBOUNCE_MS, useFormattedOutput } from "@/hooks/useFormattedOutput";

type Props = { id: FormatId; input: string; settings?: FormatSettings };

const NO_SETTINGS: FormatSettings = {};

function setup(initial: Props) {
  return renderHook((p: Props) => useFormattedOutput(p.id, p.input, p.settings ?? NO_SETTINGS), { initialProps: initial });
}

/** Let the debounce elapse and pending promises settle. */
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(FORMAT_DEBOUNCE_MS);
  });
}

function deferred() {
  let resolve!: (r: FormatOutcome) => void;
  const promise = new Promise<FormatOutcome>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
  runFormatter.mockReset();
  runFormatter.mockImplementation(async (_id, input) => ({ kind: "ok", output: input }));
});
afterEach(() => vi.useRealTimers());

describe("useFormattedOutput", () => {
  it("debounces 300ms", () => {
    expect(FORMAT_DEBOUNCE_MS).toBe(300);
  });

  it("is empty for blank input without calling the formatter", async () => {
    const { result } = setup({ id: "json", input: "   \n" });
    await flush();
    expect(result.current).toEqual({ status: "empty" });
    expect(runFormatter).not.toHaveBeenCalled();
  });

  it("runs formatter once for a burst of changes", async () => {
    // Mount empty, then type: only the typing itself is debounced.
    const { rerender } = setup({ id: "json", input: "" });
    for (const input of ["a", "ab", "abc"]) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      rerender({ id: "json", input });
    }
    await flush();
    expect(runFormatter).toHaveBeenCalledTimes(1);
    expect(runFormatter).toHaveBeenCalledWith("json", "abc", {});
  });

  it("shows ok output", async () => {
    runFormatter.mockResolvedValue({ kind: "ok", output: "X" });
    const { result } = setup({ id: "json", input: "x" });
    await flush();
    expect(result.current).toEqual({ status: "ok", output: "X" });
  });

  it("replaces old output with the error", async () => {
    runFormatter.mockResolvedValueOnce({ kind: "ok", output: "X" });
    const { result, rerender } = setup({ id: "json", input: "x" });
    await flush();
    runFormatter.mockResolvedValueOnce({ kind: "invalid", error: { message: "bad", line: 3 } });
    rerender({ id: "json", input: "x," });
    await flush();
    expect(result.current).toEqual({ status: "invalid", error: { message: "bad", line: 3 } });
  });

  it("keeps the previous state during the debounce wait", async () => {
    runFormatter.mockResolvedValueOnce({ kind: "ok", output: "X" });
    const { result, rerender } = setup({ id: "json", input: "x" });
    await flush();
    rerender({ id: "json", input: "xy" });
    expect(result.current).toEqual({ status: "ok", output: "X" });
  });

  it("ignores a stale result", async () => {
    const first = deferred();
    const second = deferred();
    runFormatter.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = setup({ id: "json", input: "one" });
    await flush();
    rerender({ id: "json", input: "two" });
    await flush();
    await act(async () => second.resolve({ kind: "ok", output: "TWO" }));
    await act(async () => first.resolve({ kind: "ok", output: "ONE" }));
    expect(result.current).toEqual({ status: "ok", output: "TWO" });
  });

  it("ignores a result from the previous format", async () => {
    const pending = deferred();
    runFormatter.mockReturnValueOnce(pending.promise);
    const { result, rerender } = setup({ id: "json", input: "{}" });
    await flush();
    rerender({ id: "yaml", input: "" });
    await act(async () => pending.resolve({ kind: "ok", output: "JSON RESULT" }));
    expect(result.current).toEqual({ status: "empty" });
  });

  it("never shows the previous format's output after switching", async () => {
    runFormatter.mockResolvedValueOnce({ kind: "ok", output: "JSON OUT" });
    const { result, rerender } = setup({ id: "json", input: "{}" });
    await flush();
    runFormatter.mockResolvedValueOnce({ kind: "ok", output: "YAML OUT" });
    rerender({ id: "yaml", input: "a: 1" });
    expect(result.current).not.toEqual({ status: "ok", output: "JSON OUT" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toEqual({ status: "ok", output: "YAML OUT" });
  });

  it("formats right away when mounted with existing text", async () => {
    // Switching routes remounts the page, so returning to a format mounts the hook fresh.
    const { result } = setup({ id: "yaml", input: "a: 1" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toEqual({ status: "ok", output: "a: 1" });
  });

  it("returns to empty when input is cleared after an error", async () => {
    runFormatter.mockResolvedValueOnce({ kind: "invalid", error: { message: "bad", line: 1 } });
    const { result, rerender } = setup({ id: "json", input: "x" });
    await flush();
    rerender({ id: "json", input: "" });
    expect(result.current).toEqual({ status: "empty" });
  });

  it("passes settings through", async () => {
    setup({ id: "sql", input: "select 1", settings: { dialect: "mysql" } });
    await flush();
    expect(runFormatter).toHaveBeenCalledWith("sql", "select 1", { dialect: "mysql" });
  });

  it("formats again when a setting changes, but not for an equal settings object", async () => {
    const { rerender } = setup({ id: "sql", input: "select 1", settings: { dialect: "sql" } });
    await flush();
    rerender({ id: "sql", input: "select 1", settings: { dialect: "sql" } });
    await flush();
    expect(runFormatter).toHaveBeenCalledTimes(1);
    rerender({ id: "sql", input: "select 1", settings: { dialect: "mysql" } });
    await flush();
    expect(runFormatter).toHaveBeenCalledTimes(2);
    expect(runFormatter).toHaveBeenLastCalledWith("sql", "select 1", { dialect: "mysql" });
  });

  it("turns a rejected formatter into a retryable internal failure, not a line error", async () => {
    runFormatter.mockRejectedValueOnce(new Error("boom"));
    const { result } = setup({ id: "json", input: "x" });
    await flush();
    expect(result.current).toEqual({ status: "failed", reason: "internal", message: "boom", retry: expect.any(Function) });
  });

  it("shows a timeout as a failure without a retry, since the same input would time out again", async () => {
    runFormatter.mockResolvedValueOnce({ kind: "failed", reason: "timeout", message: "Formatting took too long" });
    const { result } = setup({ id: "json", input: "x" });
    await flush();
    expect(result.current).toEqual({ status: "failed", reason: "timeout", message: "Formatting took too long" });
  });

  it("offers a retry after a crash, and the retry runs right away", async () => {
    runFormatter.mockResolvedValueOnce({ kind: "failed", reason: "crashed", message: "stopped" });
    const { result } = setup({ id: "json", input: "x" });
    await flush();
    const state = result.current;
    expect(state).toMatchObject({ status: "failed", reason: "crashed" });
    if (state.status !== "failed" || !state.retry) throw new Error("expected a retry");

    runFormatter.mockResolvedValueOnce({ kind: "ok", output: "X" });
    act(() => state.retry!());
    // No debounce: a retry is a deliberate click, not typing.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(runFormatter).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({ status: "ok", output: "X" });
  });

  it("leaves the output alone when a job is cancelled", async () => {
    runFormatter.mockResolvedValueOnce({ kind: "ok", output: "X" });
    const { result, rerender } = setup({ id: "json", input: "x" });
    await flush();
    runFormatter.mockResolvedValueOnce({ kind: "cancelled" });
    rerender({ id: "json", input: "xy" });
    await flush();
    expect(result.current).toEqual({ status: "ok", output: "X" });
  });
});
