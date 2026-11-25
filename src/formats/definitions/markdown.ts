import type { FormatDefinition } from "../types";

// Each kind of Markdown marking adds a little; one alone is not enough to be sure.
const MARKDOWN_SIGNALS: [RegExp, number][] = [
  [/^#{1,6}[ \t]+\S/m, 0.5], // heading
  [/^```/m, 0.4], // code fence
  [/\[[^\][\n]{1,200}\]\([^)\s]{1,300}\)/, 0.4], // link or image
  [/\*\*[^*\n]{1,200}\*\*|__[^_\n]{1,200}__/, 0.3], // bold
  [/^\|.*\|[ \t]*$/m, 0.3], // table row
  [/^[ \t]*(?:[-*+]|\d+\.)[ \t]+\S/m, 0.2], // list item
  [/^>[ \t]/m, 0.2], // quote
];

function detectMarkdown(input: string): number {
  // The start is enough to tell, and a cap keeps the patterns quick on huge pastes.
  const head = input.slice(0, 50_000);
  const score = MARKDOWN_SIGNALS.reduce((sum, [pattern, weight]) => sum + (pattern.test(head) ? weight : 0), 0);
  return Math.min(0.95, score);
}

export const markdown = {
  id: "markdown",
  label: "Markdown",
  glyph: "#",
  extension: "md",
  mime: "text/markdown",
  output: "text",
  runsOn: "worker",
  settings: [],
  examples: {
    valid: "# Notes\n* one\n* two\n\n__bold__ text",
    // Any text is valid Markdown, so there is no invalid example.
    invalid: "",
  },
  detect: detectMarkdown,
  load: () => import("../formatters/markdown").then((m) => m.formatMarkdown),
} as const satisfies FormatDefinition;
