import type { FormatId, FormatMeta, SqlDialect } from "./types";

/** Every supported format, in the order the rail shows them. */
export const FORMATS: readonly FormatMeta[] = [
  { id: "json", label: "JSON", glyph: "{ }", extension: "json", mime: "application/json", outputKind: "text" },
  { id: "yaml", label: "YAML", glyph: "---", extension: "yaml", mime: "application/yaml", outputKind: "text" },
  { id: "mermaid", label: "Mermaid", glyph: "->", extension: "svg", mime: "image/svg+xml", outputKind: "diagram" },
  { id: "xml", label: "XML", glyph: "</>", extension: "xml", mime: "application/xml", outputKind: "text" },
  { id: "sql", label: "SQL", glyph: "SQL", extension: "sql", mime: "application/sql", outputKind: "text" },
  { id: "markdown", label: "Markdown", glyph: "#", extension: "md", mime: "text/markdown", outputKind: "text" },
];

export const SQL_DIALECTS: readonly { id: SqlDialect; label: string }[] = [
  { id: "sql", label: "Standard" },
  { id: "transactsql", label: "SQL Server" },
  { id: "postgresql", label: "PostgreSQL" },
  { id: "mysql", label: "MySQL" },
];

export const DEFAULT_FORMAT: FormatId = "json";

export function isFormatId(value: unknown): value is FormatId {
  return FORMATS.some((f) => f.id === value);
}

export function getFormat(id: FormatId): FormatMeta {
  const format = FORMATS.find((f) => f.id === id);
  if (!format) throw new Error(`Unknown format: ${id}`);
  return format;
}
