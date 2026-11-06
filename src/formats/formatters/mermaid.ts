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
    const { line, column } = mermaidErrorPosition(err, source);
    return formatError(errorMessage(err), line, column);
  } finally {
    // A failed render can leave scratch elements in the page: `d<id>` (the wrapper) and sometimes `<id>`.
    document.getElementById(`d${id}`)?.remove();
    document.getElementById(id)?.remove();
  }
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

// Before parsing, Mermaid removes the frontmatter block, `%%{...}%%` directives, `%%` comment lines and
// leading whitespace, then reports lines of what is left. These are the same patterns it uses (mermaid 12).
const FRONTMATTER = /^[ \t]*---[ \t]*\n[\s\S]*?\n[ \t]*---[ \t]*(?:\n|$)/;
const DIRECTIVE = /%{2}{\s*(?:(\w+)\s*:|(\w+))\s*(?:(\w+)|((?:(?!}%{2}).|\r?\n)*))?\s*(?:}%{2})?/gi;
const COMMENT_LINE = /^\s*%%(?!{)[^\n]+\n?/gm;
const LEADING_SPACE = /^\s+/;

/**
 * Turns a line (and column) of the text Mermaid actually parsed back into the line of `source`.
 * It replays Mermaid's cleanup while remembering where each remaining character came from.
 */
function toSourcePosition(source: string, line: number, column?: number): { line: number; column?: number } {
  const normalized = source.replace(/\r\n?/g, "\n");
  let text = normalized;
  let origin = Array.from({ length: text.length }, (_, i) => i); // origin[i]: where text[i] was in `normalized`

  for (const pattern of [FRONTMATTER, DIRECTIVE, COMMENT_LINE, LEADING_SPACE]) {
    const keptText: string[] = [];
    const keptOrigin: number[] = [];
    let last = 0;
    for (const match of text.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))) {
      keptText.push(text.slice(last, match.index));
      keptOrigin.push(...origin.slice(last, match.index));
      last = match.index + match[0].length;
    }
    keptText.push(text.slice(last));
    keptOrigin.push(...origin.slice(last));
    text = keptText.join("");
    origin = keptOrigin;
  }

  // Start of the reported line within the cleaned text (clamped to the end if the line is past it).
  let start = 0;
  for (let n = 1; n < line; n++) {
    const next = text.indexOf("\n", start);
    if (next === -1) break;
    start = next + 1;
  }
  const at = origin[Math.min(start, origin.length - 1)] ?? 0;
  const lineStart = normalized.lastIndexOf("\n", at - 1) + 1;
  const sourceLine = normalized.slice(0, at).split("\n").length;
  return column === undefined ? { line: sourceLine } : { line: sourceLine, column: column + (at - lineStart) };
}

/**
 * Finds where Mermaid says the error is: the parser's location, else "line N" in the message, else line 1.
 * Pass `source` to get the line in the text you typed rather than in the text Mermaid parsed.
 */
export function mermaidErrorPosition(err: unknown, source?: string): { line: number; column?: number } {
  const position = parserPosition(err);
  // With no location in the error, the line 1 fallback is already a line of the source.
  if (source === undefined || !hasLocation(err)) return position;
  return toSourcePosition(source, position.line, position.column);
}

function hasLocation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return typeof (err as { hash?: { loc?: { first_line?: unknown } } } | null)?.hash?.loc?.first_line === "number" || /line (\d+)/i.test(message);
}

function parserPosition(err: unknown): { line: number; column?: number } {
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
