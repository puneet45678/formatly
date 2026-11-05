import { formatError, TooComplexError } from "../errors";
import type { FormatResult } from "../types";

// The only formatter that touches `document`: Mermaid measures text in the DOM,
// so it runs on the main thread (its definition says runsOn: "main").

/**
 * Mermaid's own limits, set explicitly so we can check them ourselves. Past
 * MAX_DIAGRAM_CHARS, Mermaid doesn't fail: it quietly draws a placeholder box
 * ("Maximum text size in diagram exceeded") in place of the user's diagram.
 * Past MAX_DIAGRAM_EDGES it throws. Both are about size, not syntax, so both
 * become a TooComplexError rather than an error "at line 1".
 *
 * Rendering runs on the page's main thread, so these also bound how long a
 * render can freeze typing: about 2.3 s at 500 nodes (see docs/adr/0001).
 */
export const MAX_DIAGRAM_CHARS = 50_000;
export const MAX_DIAGRAM_EDGES = 500;

// Loaded lazily and set up once, so pages that never draw a diagram don't download Mermaid.
let ready: Promise<typeof import("mermaid").default> | undefined;

function loadMermaid() {
  ready ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false, // we call render ourselves; don't scan the page
      securityLevel: "strict", // diagram text is untrusted input: no scripts, no raw HTML
      maxTextSize: MAX_DIAGRAM_CHARS,
      maxEdges: MAX_DIAGRAM_EDGES,
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

/**
 * The SVG goes into the page as HTML (and out through Copy and Download), so it
 * is sanitized here, once, for every consumer. securityLevel "strict" already
 * cleans the diagram text inside Mermaid; this is a second, independent control,
 * so one bug in either does not become script running on our page.
 *
 * Flowchart labels are HTML inside <foreignObject>, hence the html profile.
 */
async function sanitizeSvg(svg: string): Promise<string> {
  const { default: DOMPurify } = await import("dompurify");
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true, html: true },
    ADD_TAGS: ["foreignObject"],
    // Without this, DOMPurify keeps <foreignObject> but removes the HTML inside
    // it, which would delete every flowchart label. The HTML is still sanitized.
    HTML_INTEGRATION_POINTS: { foreignobject: true },
  });
}

/** Parses the diagram and draws it as an SVG string. */
export async function renderMermaid(source: string): Promise<FormatResult> {
  if (source.length > MAX_DIAGRAM_CHARS) {
    throw new TooComplexError(
      `This diagram is too large to draw (${source.length.toLocaleString("en")} characters; the limit is ${MAX_DIAGRAM_CHARS.toLocaleString("en")})`,
    );
  }
  const mermaid = await loadMermaid();
  const id = `formatly-mermaid-${++renderCount}`;
  try {
    await mermaid.parse(source); // throws on a syntax error, before anything is drawn
    const { svg } = await mermaid.render(id, source);
    return { ok: true, output: await sanitizeSvg(svg) };
  } catch (err) {
    if (isEdgeLimitError(err)) {
      throw new TooComplexError(`This diagram has more than ${MAX_DIAGRAM_EDGES} connections, the most that can be drawn`);
    }
    const { line, column } = mermaidErrorPosition(err);
    return formatError(errorMessage(err), line, column);
  } finally {
    // A failed render can leave scratch elements in the page: `d<id>` (the wrapper) and sometimes `<id>`.
    document.getElementById(`d${id}`)?.remove();
    document.getElementById(id)?.remove();
  }
}

/** Mermaid reports too many edges only through its message: "Edge limit exceeded. N edges found, …". */
function isEdgeLimitError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("Edge limit exceeded");
}

/**
 * Mermaid's own message starts with "Parse error on line N:", where N counts differently from the
 * position we show, and is followed by ASCII art. So for parser errors we write our own sentence.
 */
function errorMessage(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  const lastLine = lines.at(-1) ?? "";

  // Jison parsers (flowchart, sequence, ...) attach hash = { text, token, line, loc, expected }.
  const hash = (err as { hash?: { token?: unknown; text?: unknown } } | null)?.hash;
  if (hash && typeof hash === "object") {
    if (hash.token === "EOF" || /got 'EOF'$/.test(lastLine)) return "The diagram ends before it is complete";
    if (typeof hash.text === "string" && hash.text !== "") return `Unexpected "${hash.text}"`;
  }
  // No usable hash: Mermaid's last line says what it wanted, e.g. "Expecting 'SQE', got 'PS'".
  if (lastLine.startsWith("Expecting")) return lastLine;
  // Anything else (e.g. unknown diagram type) already has a readable first line.
  return lines[0] ?? "Invalid diagram";
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
