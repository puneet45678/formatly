import { describe, expect, it } from "vitest";
import { sortJsonKeys } from "@/formats/canonicalizers/json";

describe("sortJsonKeys", () => {
  it("sorts object keys at every level", () => {
    expect(sortJsonKeys('{"b": 1, "a": {"d": true, "c": null}}')).toBe('{"a":{"c":null,"d":true},"b":1}');
  });

  it("keeps array order, since it is data", () => {
    expect(sortJsonKeys('{"list": [3, 1, {"z": 0, "y": 0}]}')).toBe('{"list":[3,1,{"y":0,"z":0}]}');
  });

  it("keeps numbers and strings exactly as written", () => {
    expect(sortJsonKeys('{"x": 1e400, "id": 12345678901234567890123, "s": "\\u00e9\\n", "pad": 1.50}')).toBe(
      '{"id":12345678901234567890123,"pad":1.50,"s":"\\u00e9\\n","x":1e400}',
    );
  });

  it("makes documents with the same data equal", () => {
    expect(sortJsonKeys('{"name": "Asha", "roles": ["admin"]}')).toBe(sortJsonKeys('{\n  "roles": ["admin"],\n  "name": "Asha"\n}'));
  });

  it("handles top-level arrays and scalars", () => {
    expect(sortJsonKeys("[{\"b\":1,\"a\":2}]")).toBe('[{"a":2,"b":1}]');
    expect(sortJsonKeys("42")).toBe("42");
  });

  it("refuses invalid JSON", () => {
    expect(() => sortJsonKeys('{"a": 1,}')).toThrow("Only valid JSON");
  });
});
