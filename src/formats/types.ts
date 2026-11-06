// Shared types for the formatting core. No React or DOM types here: this code
// also runs in a Web Worker and in plain Node tests.

// Type-only re-export: FormatId is derived from the list of definitions.
// `export type` is erased at runtime, so this creates no import cycle
// (definitions import these types, and lazily import the formatters).
export type { FormatId } from "./definitions";

export type FormatError = { message: string; line: number; column?: number };

export type FormatResult = { ok: true; output: string } | { ok: false; error: FormatError };

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
  /**
   * How likely `input` is this format, from 0 (not at all) to 1 (certainly). Optional: a format without
   * one is simply never suggested. It runs on the page whenever something is pasted into an empty
   * input, so it must be quick and must not import the format's library (that would defeat lazy loading).
   */
  detect?: (input: string) => number;
  /** Loads the formatter on first use, so each format's library is its own chunk. */
  load: () => Promise<Formatter>;
}
