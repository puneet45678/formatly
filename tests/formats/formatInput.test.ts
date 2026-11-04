import { afterEach, describe, expect, it, vi } from "vitest";
import { formatInput } from "@/formats/formatInput";
import { getFormat } from "@/formats/registry";
import type { Formatter } from "@/formats/types";

// getFormat() returns the same object every time, so spying on its `load`
// swaps the formatter for these tests only (restored in afterEach).
function stubFormatter(id: "json" | "sql", formatter: Formatter) {
  vi.spyOn(getFormat(id), "load").mockResolvedValue(formatter);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("formatInput", () => {
  it("returns the formatter's result", async () => {
    stubFormatter("json", (input) => ({ ok: true, output: input.toUpperCase() }));
    await expect(formatInput("json", "abc", {})).resolves.toEqual({ ok: true, output: "ABC" });
  });

  it("turns unexpected throws into an error at line 1", async () => {
    stubFormatter("json", () => {
      throw new Error("boom");
    });
    await expect(formatInput("json", "x", {})).resolves.toEqual({ ok: false, error: { message: "boom", line: 1 } });
  });

  it("turns a rejected promise into an error at line 1", async () => {
    stubFormatter("json", () => Promise.reject(new Error("later")));
    await expect(formatInput("json", "x", {})).resolves.toEqual({ ok: false, error: { message: "later", line: 1 } });
  });

  it("turns a failure to load the formatter into an error at line 1", async () => {
    vi.spyOn(getFormat("json"), "load").mockRejectedValue(new Error("chunk failed"));
    await expect(formatInput("json", "x", {})).resolves.toEqual({
      ok: false,
      error: { message: "chunk failed", line: 1 },
    });
  });

  it("turns a stack overflow into a nesting error", async () => {
    stubFormatter("json", () => {
      throw new RangeError("Maximum call stack size exceeded");
    });
    await expect(formatInput("json", "x", {})).resolves.toEqual({
      ok: false,
      error: { message: "This is nested too deeply to format", line: 1 },
    });
  });

  it("passes sanitized settings to the formatter", async () => {
    const formatter = vi.fn<Formatter>(() => ({ ok: true, output: "" }));
    stubFormatter("sql", formatter);
    await formatInput("sql", "x", { dialect: "oracle" });
    expect(formatter).toHaveBeenCalledWith("x", { dialect: "sql" });
  });
});
