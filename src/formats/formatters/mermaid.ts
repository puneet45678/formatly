import { formatError } from "../errors";
import type { FormatResult } from "../types";

// The only formatter that touches `document`: Mermaid measures text in the DOM,
// so it runs on the main thread (its definition says runsOn: "main").

// Loaded lazily and set up once, so pages that never draw a diagram don't download Mermaid.
let ready: Promise<typeof import("mermaid").default> | undefined;

function loadMermaid() {
  ready ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false, // we call render ourselves; don't scan the page
      securityLevel: "strict", // diagram text is untrusted input: no scripts, no raw HTML
      theme: "dark",
      fontFamily: "var(--font-inter), sans-serif",
      themeVariables: {
        background: "transparent",
        primaryColor: "#111111",
        primaryTextColor: "#ededed",
        primaryBorderColor: "#3a3a3a",
        lineColor: "#8f8f8f",
      },
    });
    return mermaid;
  });
  // Don't cache a failed download: the next render should try again.
  ready.catch(() => (ready = undefined));
  return ready;
}

// Mermaid wants a unique element id per render, or two renders can clash.
let renderCount = 0;

/** Parses the diagram and draws it as an SVG string. */
export async function renderMermaid(source: string): Promise<FormatResult> {
  const mermaid = await loadMermaid();
  const id = `formatly-mermaid-${++renderCount}`;
  try {
    await mermaid.parse(source); // throws on a syntax error, before anything is drawn
    const { svg } = await mermaid.render(id, source);
    return { ok: true, output: svg };
  } catch (err) {
    const { line, column } = mermaidErrorPosition(err);
    return formatError(errorMessage(err), line, column);
  } finally {
    // A failed render can leave scratch elements in the page: `d<id>` (the wrapper) and sometimes `<id>`.
    document.getElementById(`d${id}`)?.remove();
    document.getElementById(id)?.remove();
  }
}

/** Only the first line: Mermaid's messages continue with an ASCII-art pointer that wraps badly in the UI. */
function errorMessage(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  return text.split("\n")[0] || "Invalid diagram";
}

/** Finds where Mermaid says the error is: the parser's location, else "line N" in the message, else line 1. */
export function mermaidErrorPosition(err: unknown): { line: number; column?: number } {
  // Parser errors carry `hash.loc` (1-based line, 0-based column). Not part of Mermaid's types, so read it defensively.
  const loc = (err as { hash?: { loc?: { first_line?: number; first_column?: number } } } | null)?.hash?.loc;
  if (typeof loc?.first_line === "number") {
    return typeof loc.first_column === "number"
      ? { line: loc.first_line, column: loc.first_column + 1 }
      : { line: loc.first_line };
  }
  const message = err instanceof Error ? err.message : String(err);
  const match = /line (\d+)/i.exec(message);
  return { line: match ? Number(match[1]) : 1 };
}
