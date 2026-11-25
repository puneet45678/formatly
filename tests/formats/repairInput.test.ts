import { afterEach, describe, expect, it, vi } from "vitest";
import { repairInput } from "@/formats/repairInput";
import { getFormat } from "@/formats/registry";

afterEach(() => vi.restoreAllMocks());

describe("repairInput", () => {
  it("returns the fixed text when the format accepts it", async () => {
    await expect(repairInput("json", '{"a": 1,}', {})).resolves.toEqual({ kind: "repaired", output: '{"a": 1}' });
  });

  it("reports where an unrepairable text goes wrong, as a line and column", async () => {
    // Text after a complete value is something jsonrepair won't guess about.
    const outcome = await repairInput("json", '{\n  "a": 1\n}\n:::', {});
    expect(outcome).toEqual({ kind: "unrepairable", message: 'Unexpected character ":" at line 4, column 1' });
  });

  it("refuses a partial fix: the result must pass the format's own formatter", async () => {
    // A repairer that returns something still invalid must not replace the user's text.
    vi.spyOn(getFormat("json"), "repair").mockResolvedValue(() => '{"a": 1,}');
    const outcome = await repairInput("json", "{a: 1,}", {});
    expect(outcome.kind).toBe("unrepairable");
    if (outcome.kind === "unrepairable") expect(outcome.message).toMatch(/^Only part of it could be fixed/);
  });

  it("says so for a format with no automatic fix", async () => {
    await expect(repairInput("yaml", "a: [", {})).resolves.toEqual({ kind: "unrepairable", message: "YAML has no automatic fix" });
  });

  it("turns a stack overflow into a too-complex failure", async () => {
    vi.spyOn(getFormat("json"), "repair").mockResolvedValue(() => {
      throw new RangeError("Maximum call stack size exceeded");
    });
    await expect(repairInput("json", "[", {})).resolves.toMatchObject({ kind: "failed", reason: "too-complex" });
  });
});
