import type { FormatDefinition } from "../types";

const DIAGRAM_START =
  /^(?:(?:graph|flowchart)\b|sequenceDiagram\b|classDiagram\b|stateDiagram(?:-v2)?\b|erDiagram\b|journey\b|gantt\b|pie\b|gitGraph\b|mindmap\b|timeline\b|quadrantChart\b|requirementDiagram\b|C4(?:Context|Container|Component|Dynamic|Deployment)\b|(?:xychart|sankey|block|architecture|packet|radar|treemap)(?:-beta)?\b|kanban\b)/;

/** The first real line names the diagram type. Frontmatter and %% comments before it are skipped. */
function detectMermaid(input: string): number {
  let text = input.trimStart();
  const frontmatter = /^---[ \t]*\n[\s\S]*?\n---[ \t]*(?:\n|$)/.exec(text);
  if (frontmatter) text = text.slice(frontmatter[0].length);
  for (const line of text.split(/\r?\n/, 200)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("%%")) continue;
    return DIAGRAM_START.test(trimmed) ? 0.95 : 0;
  }
  return 0;
}

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
  detect: detectMermaid,
  load: () => import("../formatters/mermaid").then((m) => m.renderMermaid),
} as const satisfies FormatDefinition;
