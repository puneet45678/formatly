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
  it("returns the formatter's output", async () => {
    stubFormatter("json", (input) => ({ ok: true, output: input.toUpperCase() }));
    await expect(formatInput("json", "abc", {})).resolves.toEqual({ kind: "ok", output: "ABC" });
  });

  it("reports the formatter's syntax error as invalid input, with its position", async () => {
    stubFormatter("json", () => ({ ok: false, error: { message: "Expected a comma", line: 3, column: 7 } }));
    await expect(formatInput("json", "x", {})).resolves.toEqual({
      kind: "invalid",
      error: { message: "Expected a comma", line: 3, column: 7 },
    });
  });

  // A throw is our failure, not a syntax error, so it carries no line for the editor to mark.
  it("turns unexpected throws into an internal failure with no position", async () => {
    stubFormatter("json", () => {
      throw new Error("boom");
    });
    await expect(formatInput("json", "x", {})).resolves.toEqual({ kind: "failed", reason: "internal", message: "boom" });
  });

  it("turns a rejected promise into an internal failure", async () => {
    stubFormatter("json", () => Promise.reject(new Error("later")));
    await expect(formatInput("json", "x", {})).resolves.toEqual({ kind: "failed", reason: "internal", message: "later" });
  });

  it("turns a failure to load the formatter into an internal failure", async () => {
    vi.spyOn(getFormat("json"), "load").mockRejectedValue(new Error("chunk failed"));
    await expect(formatInput("json", "x", {})).resolves.toEqual({ kind: "failed", reason: "internal", message: "chunk failed" });
  });

  it("turns a stack overflow into a too-complex failure", async () => {
    stubFormatter("json", () => {
      throw new RangeError("Maximum call stack size exceeded");
    });
    await expect(formatInput("json", "x", {})).resolves.toEqual({
      kind: "failed",
      reason: "too-complex",
      message: "This is nested too deeply to format",
    });
  });

  it("passes sanitized settings to the formatter", async () => {
    const formatter = vi.fn<Formatter>(() => ({ ok: true, output: "" }));
    stubFormatter("sql", formatter);
    await formatInput("sql", "x", { dialect: "oracle" });
    expect(formatter).toHaveBeenCalledWith("x", { dialect: "sql" });
  });
});
