import type { FormatDefinition } from "../types";

export const mermaid = {
  id: "mermaid",
  label: "Mermaid",
  glyph: "->",
  extension: "svg",
  mime: "image/svg+xml",
  output: "diagram",
  // Mermaid measures text with the DOM, which a Web Worker doesn't have.
  runsOn: "main",
  settings: [],
  examples: {
    valid: "graph TD; A-->B",
    invalid: "graph TD; A-->",
  },
  load: () => import("../formatters/mermaid").then((m) => m.renderMermaid),
} as const satisfies FormatDefinition;
