// Shared types for the formatting core. No React or DOM types here: this code
// also runs in a Web Worker and in plain Node tests.

// Type-only re-export: FormatId is derived from the list of definitions.
// `export type` is erased at runtime, so this creates no import cycle
// (definitions import these types, and lazily import the formatters).
export type { FormatId } from "./definitions";

export type FormatError = { message: string; line: number; column?: number };

/**
 * What a formatter returns: its output, or a syntax error in the input.
 * This is the formatter's whole contract; it knows nothing about workers or timeouts.
 */
export type FormatResult = { ok: true; output: string } | { ok: false; error: FormatError };

/**
 * Why formatting stopped without telling us anything about the input's syntax.
 * None of these has a position, so the editor never highlights a line for them.
 * - timeout: ran longer than the worker allows.
 * - crashed: the worker died.
 * - too-complex: the formatter ran out of stack (deeply nested input).
 * - internal: the formatter threw, or its code failed to download.
 */
export type FailureReason = "timeout" | "crashed" | "too-complex" | "internal";

/**
 * What running a format produced, as the UI sees it. Returned by formatInput,
 * the worker and runFormatter. It keeps "your input is wrong" (invalid) apart
 * from "we couldn't finish" (failed) and "nobody wants this any more" (cancelled).
 */
export type FormatOutcome =
  | { kind: "ok"; output: string }
  | { kind: "invalid"; error: FormatError }
  | { kind: "failed"; reason: FailureReason; message: string }
  | { kind: "cancelled" };

/** A format's chosen settings, e.g. `{ dialect: "mysql" }` for SQL. Empty for formats without settings. */
export type FormatSettings = Readonly<Record<string, string>>;

/** Turns input text into formatted output, or an error with a line number. */
export type Formatter = (input: string, settings: FormatSettings) => FormatResult | Promise<FormatResult>;

/** One user-facing choice for a format, shown as a dropdown above the input. */
export interface FormatSetting {
  key: string;
  /** Also the dropdown's accessible name. */
  label: string;
  options: readonly { value: string; label: string }[];
  default: string;
}

/** Everything the app knows about one format. Each format is described once, in definitions/. */
export interface FormatDefinition {
  id: string;
  label: string;
  /** Short monospace symbol shown in the format capsule. */
  glyph: string;
  /** File extension for downloads, without the dot. */
  extension: string;
  mime: string;
  /** "diagram" means the output is rendered SVG instead of text. */
  output: "text" | "diagram";
  /** Where the formatter runs: "main" only when it needs the DOM (Mermaid). */
  runsOn: "worker" | "main";
  settings: readonly FormatSetting[];
  /**
   * Sample inputs, also used by the shared formatter contract tests.
   * An empty `invalid` means the format has no invalid input (any text is valid).
   */
  examples: { valid: string; invalid: string };
  /** Loads the formatter on first use, so each format's library is its own chunk. */
  load: () => Promise<Formatter>;
}
