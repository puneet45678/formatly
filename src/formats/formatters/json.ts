import { format, parse, printParseErrorCode, type Edit, type ParseError } from "jsonc-parser";
import { formatError, positionAt } from "../errors";
import type { FormatResult } from "../types";

// Strict JSON: no comments, no trailing commas, no single quotes, no unquoted keys.
// The settings argument is ignored, so this fits the Formatter type with one parameter.

/** Deeper than this is refused. Real documents are nowhere near it. */
export const MAX_JSON_DEPTH = 1000;

// The one place that turns the parser's error codes into messages for people.
const MESSAGES: Record<string, string> = {
  ValueExpected: "Expected a value",
  CommaExpected: "Expected a comma",
  ColonExpected: "Expected a colon",
  PropertyNameExpected: "Property names must be in double quotes",
  InvalidCommentToken: "Comments aren't allowed in JSON",
  CloseBraceExpected: "Expected }",
  CloseBracketExpected: "Expected ]",
  EndOfFileExpected: "Unexpected content after the JSON value",
  UnexpectedEndOfString: "This string never ends",
  InvalidSymbol: "Unexpected character",
};

const TRAILING_COMMA = "Trailing commas aren't allowed in JSON";
const SINGLE_QUOTES = "Strings must use double quotes";
const TOO_DEEP = "This is nested too deeply to format";

/**
 * Finds how deep the brackets nest, stopping early once past the limit.
 * Skips string contents so brackets inside strings don't count.
 * This must run before parsing: the parser and formatter recurse, and
 * 100 000 nested "[" ran Node out of memory.
 */
function isNestedTooDeeply(text: string): boolean {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++; // skip the escaped character, so \" doesn't end the string
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === "[" || ch === "{") {
      if (++depth > MAX_JSON_DEPTH) return true;
    } else if (ch === "]" || ch === "}") {
      depth--;
    }
  }
  return false;
}

/** Picks the message for the parser's first error, with friendlier wording for common mistakes. */
function describeError(text: string, errors: ParseError[]): string {
  const first = errors[0];
  const code = printParseErrorCode(first.error);

  // "[1,2,]" and '{"a":1,}': the parser wants a value (or a key) after the comma,
  // but the comma is the real problem.
  const closer = text[first.offset];
  if (
    (code === "ValueExpected" && (closer === "]" || closer === "}")) ||
    (code === "PropertyNameExpected" && closer === "}")
  ) {
    if (text.slice(0, first.offset).trimEnd().endsWith(",")) return TRAILING_COMMA;
  }
  // 'a' and a (bare word) both come back as InvalidSymbol then PropertyNameExpected.
  if (code === "InvalidSymbol" && errors[1] && printParseErrorCode(errors[1].error) === "PropertyNameExpected") {
    return text[first.offset] === "'" ? SINGLE_QUOTES : MESSAGES.PropertyNameExpected;
  }
  return MESSAGES[code] ?? "Invalid JSON";
}

/**
 * Applies the formatter's whitespace edits in one pass.
 * jsonc-parser's own applyEdits rebuilds the whole string once per edit, which
 * took over a minute on a 1 MB document. The edits never overlap, so we can
 * sort them and copy the text between them once.
 */
function applyAllEdits(text: string, edits: Edit[]): string {
  const sorted = [...edits].sort((a, b) => a.offset - b.offset);
  const pieces: string[] = [];
  let last = 0;
  for (const edit of sorted) {
    pieces.push(text.slice(last, edit.offset), edit.content);
    last = edit.offset + edit.length;
  }
  pieces.push(text.slice(last));
  return pieces.join("");
}

export function formatJson(input: string): FormatResult {
  if (isNestedTooDeeply(input)) return formatError(TOO_DEEP, 1);

  const errors: ParseError[] = [];
  parse(input, errors, { disallowComments: true, allowTrailingComma: false, allowEmptyContent: false });
  if (errors.length > 0) {
    const { line, column } = positionAt(input, errors[0].offset);
    return formatError(describeError(input, errors), line, column);
  }

  // format() only moves whitespace, so number literals stay exactly as typed
  // (JSON.parse + JSON.stringify would round 1e400 and long integers).
  const edits = format(input, undefined, { tabSize: 2, insertSpaces: true, eol: "\n" });
  return { ok: true, output: applyAllEdits(input, edits) };
}
