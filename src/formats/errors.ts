import type { FormatResult } from "./types";

// Helpers every formatter uses to report problems the same way.
// Imports types only: formatter modules import this file, so it must stay tiny.

/**
 * Turns a character offset into a 1-based line and column.
 * Handles "\r\n" (counted as one line break) and offsets past the end of the text.
 */
export function positionAt(text: string, offset: number): { line: number; column: number } {
  const end = Math.max(0, Math.min(offset, text.length));
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < end; i++) {
    if (text[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
    // A lone "\r" (old Mac line ending) also breaks the line; "\r\n" is handled by the "\n" above.
    else if (text[i] === "\r" && text[i + 1] !== "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: end - lineStart + 1 };
}

/** A failed result. `column` is left out entirely (not set to undefined) when unknown. */
export function formatError(message: string, line: number, column?: number): FormatResult {
  return { ok: false, error: column === undefined ? { message, line } : { message, line, column } };
}

/**
 * Thrown by a formatter when the input is valid but too large or complex to
 * process (a diagram over the renderer's limits, for example). It is not a
 * syntax error, so it has no position: formatInput reports it as a
 * "too-complex" failure, and the editor marks no line.
 */
export class TooComplexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TooComplexError";
  }
}
