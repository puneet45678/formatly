import { describe, expect, it } from "vitest";
import { Text } from "@codemirror/state";
import { summarize } from "@/components/MergeEditor";

const doc = (...lines: string[]) => Text.of(lines);
const span = (d: Text, fromLine: number, toLine: number) => ({ from: d.line(fromLine).from, to: d.line(toLine).to + 1 });

describe("summarize", () => {
  it("is empty when nothing changed", () => {
    expect(summarize([], doc("a"), doc("a"))).toEqual({ changes: 0, added: 0, removed: 0 });
  });

  it("counts lines removed from the original and added in the changed text", () => {
    const a = doc("{", '  "role": "dev",', '  "id": 1', "}");
    const b = doc("{", '  "role": "admin",', '  "team": "core",', '  "id": 1', "}");
    const ra = span(a, 2, 2);
    const rb = span(b, 2, 3);
    expect(summarize([{ fromA: ra.from, toA: ra.to, fromB: rb.from, toB: rb.to }], a, b)).toEqual({ changes: 1, added: 2, removed: 1 });
  });

  it("counts a pure insertion as added lines only", () => {
    const a = doc("x", "z");
    const b = doc("x", "y", "z");
    const at = a.line(2).from;
    const rb = span(b, 2, 2);
    expect(summarize([{ fromA: at, toA: at, fromB: rb.from, toB: rb.to }], a, b)).toEqual({ changes: 1, added: 1, removed: 0 });
  });
});
