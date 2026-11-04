import { describe, expect, it } from "vitest";
import { formatJson, MAX_JSON_DEPTH } from "@/formats/formatters/json";

describe("formatJson", () => {
  it("expands minified JSON with 2 spaces", () =>
    expect(formatJson('{"a":[1,2],"o":{}}')).toEqual({
      ok: true,
      output: '{\n  "a": [\n    1,\n    2\n  ],\n  "o": {}\n}',
    }));

  it("keeps number literals exactly", () => {
    const out = (formatJson('{"big":12345678901234567890123,"f":1.50,"e":1e400}') as { output: string }).output;
    for (const lit of ["12345678901234567890123", "1.50", "1e400"]) expect(out).toContain(lit);
  });

  it("keeps key order and meaning", () => {
    const input = '{"z":1,"a":{"y":[true,null,"x"],"b":2.5}}';
    const out = (formatJson(input) as { output: string }).output;
    expect(JSON.parse(out)).toEqual(JSON.parse(input));
    expect(out.indexOf('"z"')).toBeLessThan(out.indexOf('"a"'));
  });

  it("reports a missing comma with line and column", () =>
    expect(formatJson('{\n  "a": 1\n  "b": 2\n}')).toEqual({
      ok: false,
      error: { message: "Expected a comma", line: 3, column: 3 },
    }));

  it("rejects trailing commas", () =>
    expect(formatJson("[1,2,]")).toEqual({
      ok: false,
      error: { message: "Trailing commas aren't allowed in JSON", line: 1, column: 6 },
    }));

  it("rejects comments", () =>
    expect(formatJson('{"a":1 // hi\n}')).toEqual({
      ok: false,
      error: { message: "Comments aren't allowed in JSON", line: 1, column: 8 },
    }));

  it("rejects single quotes", () =>
    expect(formatJson("{'a':1}")).toEqual({
      ok: false,
      error: { message: "Strings must use double quotes", line: 1, column: 2 },
    }));

  it("rejects unquoted keys", () =>
    expect(formatJson("{a:1}")).toEqual({
      ok: false,
      error: { message: "Property names must be in double quotes", line: 1, column: 2 },
    }));

  it("formats a ~1 MB document", () => {
    const doc = JSON.stringify(Array.from({ length: 20_000 }, (_, i) => ({ id: i, name: `item number ${i}`, tags: ["alpha", "beta"], ok: true })));
    expect(doc.length).toBeGreaterThan(1_000_000);
    expect(formatJson(doc).ok).toBe(true);
  });

  it("rejects absurd nesting at the bracket that crosses the limit", () =>
    // The first MAX_JSON_DEPTH brackets are allowed; the next one (column MAX_JSON_DEPTH + 1) is not.
    expect(formatJson("[".repeat(100_000) + "]".repeat(100_000))).toEqual({
      ok: false,
      error: { message: "This is nested too deeply to format", line: 1, column: MAX_JSON_DEPTH + 1 },
    }));

  it("points at the right line when deep nesting starts further down", () => {
    const input = '{\n  "a":\n' + "[".repeat(MAX_JSON_DEPTH + 1) + "]".repeat(MAX_JSON_DEPTH + 1) + "\n}";
    expect(formatJson(input)).toEqual({
      ok: false,
      error: { message: "This is nested too deeply to format", line: 3, column: MAX_JSON_DEPTH },
    });
  });

  it("allows normal nesting", () =>
    expect(formatJson("[".repeat(MAX_JSON_DEPTH) + "]".repeat(MAX_JSON_DEPTH)).ok).toBe(true));

  it("ignores brackets inside strings when measuring depth", () =>
    expect(formatJson(JSON.stringify({ s: "[".repeat(5000) })).ok).toBe(true));

  it("ignores escaped quotes when skipping strings", () =>
    expect(formatJson(JSON.stringify({ s: '\\"' + "[".repeat(5000) })).ok).toBe(true));
});
