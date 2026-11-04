import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { FormatId, FormatOptions, FormatResult } from "@/formats/types";

const runFormatter = vi.fn<(id: FormatId, input: string, options?: FormatOptions) => Promise<FormatResult>>();
vi.mock("@/formats/runFormatter", () => ({ runFormatter: (...args: Parameters<typeof runFormatter>) => runFormatter(...args) }));

import { FORMAT_DEBOUNCE_MS, useFormattedOutput } from "@/hooks/useFormattedOutput";

type Props = { id: FormatId; input: string; options?: FormatOptions };

function setup(initial: Props) {
  return renderHook((p: Props) => useFormattedOutput(p.id, p.input, p.options), { initialProps: initial });
}

/** Let the debounce elapse and pending promises settle. */
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(FORMAT_DEBOUNCE_MS);
  });
}

function deferred() {
  let resolve!: (r: FormatResult) => void;
  const promise = new Promise<FormatResult>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
  runFormatter.mockReset();
  runFormatter.mockImplementation(async (_id, input) => ({ ok: true, output: input }));
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
    const { rerender } = setup({ id: "json", input: "a" });
    for (const input of ["ab", "abc"]) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      rerender({ id: "json", input });
    }
    await flush();
    expect(runFormatter).toHaveBeenCalledTimes(1);
    expect(runFormatter).toHaveBeenCalledWith("json", "abc", undefined);
  });

  it("shows ok output", async () => {
    runFormatter.mockResolvedValue({ ok: true, output: "X" });
    const { result } = setup({ id: "json", input: "x" });
    await flush();
    expect(result.current).toEqual({ status: "ok", output: "X" });
  });

  it("replaces old output with the error", async () => {
    runFormatter.mockResolvedValueOnce({ ok: true, output: "X" });
    const { result, rerender } = setup({ id: "json", input: "x" });
    await flush();
    runFormatter.mockResolvedValueOnce({ ok: false, error: { message: "bad", line: 3 } });
    rerender({ id: "json", input: "x," });
    await flush();
    expect(result.current).toEqual({ status: "error", error: { message: "bad", line: 3 } });
  });

  it("keeps the previous state during the debounce wait", async () => {
    runFormatter.mockResolvedValueOnce({ ok: true, output: "X" });
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
    await act(async () => second.resolve({ ok: true, output: "TWO" }));
    await act(async () => first.resolve({ ok: true, output: "ONE" }));
    expect(result.current).toEqual({ status: "ok", output: "TWO" });
  });

  it("ignores a result from the previous format", async () => {
    const pending = deferred();
    runFormatter.mockReturnValueOnce(pending.promise);
    const { result, rerender } = setup({ id: "json", input: "{}" });
    await flush();
    rerender({ id: "yaml", input: "" });
    await act(async () => pending.resolve({ ok: true, output: "JSON RESULT" }));
    expect(result.current).toEqual({ status: "empty" });
  });

  it("never shows the previous format's output after switching", async () => {
    runFormatter.mockResolvedValueOnce({ ok: true, output: "JSON OUT" });
    const { result, rerender } = setup({ id: "json", input: "{}" });
    await flush();
    runFormatter.mockResolvedValueOnce({ ok: true, output: "YAML OUT" });
    rerender({ id: "yaml", input: "a: 1" });
    expect(result.current).not.toEqual({ status: "ok", output: "JSON OUT" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toEqual({ status: "ok", output: "YAML OUT" });
  });

  it("returns to empty when input is cleared after an error", async () => {
    runFormatter.mockResolvedValueOnce({ ok: false, error: { message: "bad", line: 1 } });
    const { result, rerender } = setup({ id: "json", input: "x" });
    await flush();
    rerender({ id: "json", input: "" });
    expect(result.current).toEqual({ status: "empty" });
  });

  it("passes sqlDialect through", async () => {
    setup({ id: "sql", input: "select 1", options: { sqlDialect: "mysql" } });
    await flush();
    expect(runFormatter).toHaveBeenCalledWith("sql", "select 1", { sqlDialect: "mysql" });
  });

  it("turns a rejected formatter into an error at line 1", async () => {
    runFormatter.mockRejectedValueOnce(new Error("boom"));
    const { result } = setup({ id: "json", input: "x" });
    await flush();
    expect(result.current).toEqual({ status: "error", error: { message: "boom", line: 1 } });
  });
});
