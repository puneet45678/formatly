import { describe, expect, it } from "vitest";
import { formatError, positionAt } from "@/formats/errors";

describe("positionAt", () => {
  it("counts lines and columns from 1", () => {
    expect(positionAt("ab\ncd", 4)).toEqual({ line: 2, column: 2 });
    expect(positionAt("ab\r\ncd", 5)).toEqual({ line: 2, column: 2 });
  });

  it("starts at line 1, column 1", () => {
    expect(positionAt("abc", 0)).toEqual({ line: 1, column: 1 });
  });

  it("clamps an offset past the end to the end of the text", () => {
    expect(positionAt("ab\ncd", 99)).toEqual({ line: 2, column: 3 });
  });
});

describe("formatError", () => {
  it("builds a failed result", () => {
    expect(formatError("Bad", 3)).toEqual({ ok: false, error: { message: "Bad", line: 3 } });
  });

  it("includes the column when given", () => {
    expect(formatError("Bad", 3, 7)).toEqual({ ok: false, error: { message: "Bad", line: 3, column: 7 } });
  });

  it("leaves out the column key when undefined", () => {
    const result = formatError("Bad", 3, undefined);
    expect(result.ok === false && "column" in result.error).toBe(false);
  });
});
