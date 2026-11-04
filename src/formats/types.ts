export type FormatId = "json" | "yaml" | "mermaid" | "xml" | "sql" | "markdown";

/** sql-formatter language ids, so phase 2 can pass them straight through. */
export type SqlDialect = "sql" | "transactsql" | "postgresql" | "mysql";

export interface FormatMeta {
  id: FormatId;
  label: string;
  /** Short monospace symbol shown in the format rail. */
  glyph: string;
  /** File extension for downloads, without the dot. */
  extension: string;
  mime: string;
  /** "diagram" means the output is rendered SVG instead of text. */
  outputKind: "text" | "diagram";
}

export type FormatError = { message: string; line: number; column?: number };

export type FormatResult = { ok: true; output: string } | { ok: false; error: FormatError };

export type FormatOptions = { sqlDialect?: SqlDialect };
