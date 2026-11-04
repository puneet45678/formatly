import type { Formatter } from "../types";

// Stand-in formatters from phase 1. Each format's definition points at these
// until its real formatter lands; then this file goes away.

export const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120">' +
  '<rect x="1" y="1" width="318" height="118" rx="10" fill="#111" stroke="#232323"/>' +
  '<text x="160" y="66" text-anchor="middle" fill="#8f8f8f" font-family="sans-serif" font-size="14">' +
  "Diagram preview (phase 2)</text></svg>";

/** Returns the input unchanged. */
export const echo: Formatter = (input) => ({ ok: true, output: input });

/** Returns a fixed placeholder diagram, whatever the input. */
export const placeholderDiagram: Formatter = () => ({ ok: true, output: PLACEHOLDER_SVG });
