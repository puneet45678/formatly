import { describe, expect, it } from "vitest";
import { repairJson } from "@/formats/repairers/json";
import { formatJson } from "@/formats/formatters/json";

// Every repair must give JSON the strict formatter accepts.
const fixes = (input: string) => {
  const output = repairJson(input);
  expect(formatJson(output).ok, `repaired: ${output}`).toBe(true);
  return output;
};

describe("repairJson", () => {
  it.each([
    ["trailing commas", '{"a": 1, "b": [1, 2,],}', '{"a": 1, "b": [1, 2]}'],
    ["single quotes", "{'a': 'b'}", '{"a": "b"}'],
    ["unquoted keys", "{a: 1, b: true}", '{"a": 1, "b": true}'],
    ["Python constants", '{"a": None, "b": True, "c": False}', '{"a": null, "b": true, "c": false}'],
    ["a missing comma", '{"a": 1 "b": 2}', '{"a": 1, "b": 2}'],
    ["missing closing brackets", '{"a": [1, 2', '{"a": [1, 2]}'],
    ["a JSONP wrapper", 'callback({"a": 1});', '{"a": 1}'],
  ])("fixes %s", (_name, input, expected) => {
    expect(fixes(input)).toBe(expected);
  });

  it("removes comments", () => {
    expect(JSON.parse(fixes('{\n  // note\n  "a": 1 /* x */\n}'))).toEqual({ a: 1 });
  });

  it("keeps numbers exactly as written", () => {
    // The formatter's promise: no rounding of long integers or out-of-range values.
    expect(fixes("{id: 12345678901234567890123, x: 1e400, pad: 1.50}")).toBe('{"id": 12345678901234567890123, "x": 1e400, "pad": 1.50}');
  });

  it("leaves valid JSON exactly as it is", () => {
    const valid = '{\n  "a": [1, 2],\n  "b": "text"\n}';
    expect(repairJson(valid)).toBe(valid);
  });

  it("throws, with a position, when the text can't be repaired", () => {
    expect(() => repairJson("{{{")).toThrow(expect.objectContaining({ position: expect.any(Number) }));
  });
});
