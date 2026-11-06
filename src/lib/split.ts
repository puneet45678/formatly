// The maths behind the draggable divider between the input and output panes.
// Pure functions only, so they can be tested without a browser.

export interface SplitLayout {
  /** Share of the pane space (the width without the divider) the input takes. */
  inputFraction: number;
  inputCollapsed: boolean;
}

export const DEFAULT_LAYOUT: SplitLayout = { inputFraction: 0.5, inputCollapsed: false };

/** Each pane keeps at least this width while dragging. */
export const MIN_PANE_PX = 240;
/** Width of the strip the collapsed input shrinks to. */
export const RAIL_PX = 44;
/** Width of the drag handle between the panes. */
export const DIVIDER_PX = 12;

const COLLAPSE_OVERSHOOT_PX = 60;
const MIN_FRACTION = 0.1;
const MAX_FRACTION = 0.9;

/** Keeps both panes at least MIN_PANE_PX wide; an even split if there isn't room for two. */
export function clampFraction(fraction: number, paneSpacePx: number): number {
  if (paneSpacePx < MIN_PANE_PX * 2) return 0.5;
  const min = MIN_PANE_PX / paneSpacePx;
  return Math.min(1 - min, Math.max(min, fraction));
}

/** The input's share of the pane space for a pointer at `clientX`. Not clamped. */
export function fractionFromPointer(clientX: number, rect: { left: number; width: number }): number {
  return (clientX - rect.left - DIVIDER_PX / 2) / (rect.width - DIVIDER_PX);
}

/** True once the divider has been dragged well past the minimum width. */
export function shouldCollapse(rawFraction: number, paneSpacePx: number): boolean {
  return rawFraction * paneSpacePx < MIN_PANE_PX - COLLAPSE_OVERSHOOT_PX;
}

/** Arrow-key step: 2%, or 10% with Shift. */
export function nudge(fraction: number, direction: -1 | 1, big: boolean): number {
  const next = fraction + direction * (big ? 0.1 : 0.02);
  return Math.min(MAX_FRACTION, Math.max(MIN_FRACTION, next));
}

/** Reads a stored layout, falling back to the default for anything missing or out of range. */
export function sanitizeLayout(raw: unknown): SplitLayout {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return DEFAULT_LAYOUT;
  const { inputFraction, inputCollapsed } = raw as Record<string, unknown>;
  const fractionOk =
    typeof inputFraction === "number" && Number.isFinite(inputFraction) && inputFraction >= MIN_FRACTION && inputFraction <= MAX_FRACTION;
  return {
    inputFraction: fractionOk ? inputFraction : DEFAULT_LAYOUT.inputFraction,
    inputCollapsed: typeof inputCollapsed === "boolean" ? inputCollapsed : DEFAULT_LAYOUT.inputCollapsed,
  };
}
