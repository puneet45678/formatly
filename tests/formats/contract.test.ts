// The guarantee every formatter must meet. Add a format and it is tested here
// automatically: no per-format test code needed.
//
// Formats whose `load` still points at the phase-1 `echo` stand-in are skipped,
// because echo can't reject anything and would make these checks meaningless.
import { describe, expect, it } from "vitest";
import { echo } from "@/formats/formatters/echo";
import { formatInput } from "@/formats/formatInput";
import { defaultSettings, FORMATS } from "@/formats/registry";

// `it.skipIf` needs the answer at collection time, and describe callbacks can't be async,
// so work out which formats are still stubs here (top-level await) before describing them.
const cases = await Promise.all(
  FORMATS.filter((f) => f.runsOn === "worker").map(async (f) => ({
    f,
    isStub: (await f.load()) === echo,
  })),
);

describe.each(cases.map((c) => [c.f.id, c] as const))("formatter contract: %s", (_id, { f, isStub }) => {
  const settings = defaultSettings(f.id);

  it.skipIf(isStub)("formats its valid example", async () => {
    const result = await formatInput(f.id, f.examples.valid, settings);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.output).not.toBe("");
  });

  it.skipIf(isStub)("formatting is stable", async () => {
    const first = await formatInput(f.id, f.examples.valid, settings);
    if (first.kind !== "ok") throw new Error("valid example failed to format");
    const second = await formatInput(f.id, first.output, settings);
    expect(second).toEqual({ kind: "ok", output: first.output });
  });

  it.skipIf(isStub || f.examples.invalid === "")("rejects its invalid example with a usable position", async () => {
    const result = await formatInput(f.id, f.examples.invalid, settings);
    // A syntax error with a position, not a crash or timeout.
    expect(result.kind).toBe("invalid");
    if (result.kind !== "invalid") return;
    const lineCount = f.examples.invalid.split(/\r\n|\r|\n/).length;
    expect(result.error.message).not.toBe("");
    expect(result.error.line).toBeGreaterThanOrEqual(1);
    expect(result.error.line).toBeLessThanOrEqual(lineCount);
  });
});
