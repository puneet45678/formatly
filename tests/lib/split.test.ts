import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT,
  DIVIDER_PX,
  MIN_PANE_PX,
  clampFraction,
  fractionFromPointer,
  nudge,
  sanitizeLayout,
  shouldCollapse,
} from "@/lib/split";

describe("clampFraction", () => {
  it("keeps both panes at least the minimum width", () => {
    expect(clampFraction(0.05, 1000)).toBeCloseTo(MIN_PANE_PX / 1000);
    expect(clampFraction(0.99, 1000)).toBeCloseTo(1 - MIN_PANE_PX / 1000);
  });
  it("leaves a fraction that already fits alone", () => expect(clampFraction(0.4, 1000)).toBe(0.4));
  it("never goes outside 10% to 90%, even on a huge window where 240px is under 10%", () => {
    // 3000px of pane space: 240px is only 8%, but sanitizeLayout rejects anything under 10%.
    expect(clampFraction(0.01, 3000)).toBe(0.1);
    expect(clampFraction(0.99, 3000)).toBe(0.9);
    expect(sanitizeLayout({ inputFraction: clampFraction(0.01, 3000) }).inputFraction).toBe(0.1);
    expect(sanitizeLayout({ inputFraction: clampFraction(0.99, 3000) }).inputFraction).toBe(0.9);
  });
  it("falls back to an even split when the container is too narrow for two panes", () =>
    expect(clampFraction(0.2, 400)).toBe(0.5));
});

describe("fractionFromPointer", () => {
  it("maps the pointer position inside the container to a fraction of the pane space", () => {
    const rect = { left: 100, width: 800 + DIVIDER_PX };
    // The divider's center is under the pointer, so 300px in from the left edge is 300 - 6 of 800.
    expect(fractionFromPointer(100 + 300, rect)).toBeCloseTo((300 - DIVIDER_PX / 2) / 800);
  });
  it("goes below 0 and above 1 when the pointer leaves the container (callers clamp)", () => {
    const rect = { left: 100, width: 812 };
    expect(fractionFromPointer(0, rect)).toBeLessThan(0);
    expect(fractionFromPointer(2000, rect)).toBeGreaterThan(1);
  });
});

describe("shouldCollapse", () => {
  it("only collapses when dragged well past the minimum", () => {
    expect(shouldCollapse(MIN_PANE_PX / 1000, 1000)).toBe(false); // exactly at the minimum
    expect(shouldCollapse((MIN_PANE_PX - 40) / 1000, 1000)).toBe(false); // a little past
    expect(shouldCollapse((MIN_PANE_PX - 100) / 1000, 1000)).toBe(true); // well past
  });
});

describe("nudge", () => {
  it("moves 2%, or 10% with Shift", () => {
    expect(nudge(0.5, 1, false)).toBeCloseTo(0.52);
    expect(nudge(0.5, -1, true)).toBeCloseTo(0.4);
  });
  it("stays within 10% to 90%", () => {
    expect(nudge(0.11, -1, true)).toBe(0.1);
    expect(nudge(0.89, 1, true)).toBe(0.9);
  });
});

describe("sanitizeLayout", () => {
  it("keeps a valid layout", () =>
    expect(sanitizeLayout({ inputFraction: 0.3, inputCollapsed: true })).toEqual({
      inputFraction: 0.3,
      inputCollapsed: true,
    }));
  it("ignores out-of-range, non-numeric and non-boolean values", () => {
    expect(sanitizeLayout({ inputFraction: 9, inputCollapsed: "yes" })).toEqual(DEFAULT_LAYOUT);
    expect(sanitizeLayout({ inputFraction: NaN })).toEqual(DEFAULT_LAYOUT);
    expect(sanitizeLayout({ inputFraction: "0.3" })).toEqual(DEFAULT_LAYOUT);
    expect(sanitizeLayout({ inputFraction: 0.05 })).toEqual(DEFAULT_LAYOUT);
  });
  it("copes with anything that is not an object", () => {
    for (const raw of [null, undefined, 3, "x", [], [0.3]]) expect(sanitizeLayout(raw)).toEqual(DEFAULT_LAYOUT);
  });
  it("fixes one bad field without losing the good one", () =>
    expect(sanitizeLayout({ inputFraction: 0.35, inputCollapsed: 1 })).toEqual({
      inputFraction: 0.35,
      inputCollapsed: false,
    }));
});
