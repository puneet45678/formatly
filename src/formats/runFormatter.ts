import { getFormat } from "./registry";
import type { FormatId, FormatOptions, FormatResult } from "./types";

export const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120">' +
  '<rect x="1" y="1" width="318" height="118" rx="10" fill="#111" stroke="#232323"/>' +
  '<text x="160" y="66" text-anchor="middle" fill="#8f8f8f" font-family="sans-serif" font-size="14">' +
  "Diagram preview (phase 2)</text></svg>";

/**
 * The single place where formatting happens. Every part of the UI calls this.
 *
 * Phase 1 stub: text formats echo the input and Mermaid returns a placeholder.
 * Phase 2 replaces this body with real formatters running in a Web Worker,
 * keeping the same signature.
 */
export async function runFormatter(id: FormatId, input: string, options?: FormatOptions): Promise<FormatResult> {
  void options;
  if (getFormat(id).outputKind === "diagram") return { ok: true, output: PLACEHOLDER_SVG };
  return { ok: true, output: input };
}
