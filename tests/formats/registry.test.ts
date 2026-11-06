import { describe, expect, it } from "vitest";
import {
  FORMATS,
  DEFAULT_FORMAT,
  defaultSettings,
  getFormat,
  isFormatId,
  sanitizeSettings,
} from "@/formats/registry";
import { FORMAT_UI } from "@/components/format-ui";

describe("format registry", () => {
  it("includes the shipped formats", () => {
    expect(FORMATS.map((f) => f.id)).toEqual(
      expect.arrayContaining(["json", "yaml", "mermaid", "xml", "sql", "markdown"]),
    );
  });

  it("has unique labels, glyphs and extensions", () => {
    for (const key of ["label", "glyph", "extension"] as const)
      expect(new Set(FORMATS.map((f) => f[key])).size).toBe(FORMATS.length);
  });

  it("uses bare file extensions", () => {
    for (const f of FORMATS) expect(f.extension).toMatch(/^[a-z0-9]+$/);
  });

  it("gives diagrams an svg extension and text formats their own", () => {
    for (const f of FORMATS) if (f.output === "diagram") expect(f.extension).toBe("svg");
  });

  it("runs on the main thread only the formats that draw diagrams", () => {
    for (const f of FORMATS) if (f.runsOn === "main") expect(f.output).toBe("diagram");
  });

  it("keeps the shipped formats in rail order", () => {
    const shipped = ["json", "yaml", "mermaid", "xml", "sql", "markdown"];
    expect(FORMATS.map((f) => f.id).filter((id) => shipped.includes(id))).toEqual(shipped);
  });

  it("keeps each valid example short, because it is shown as the input's placeholder", () => {
    for (const f of FORMATS) {
      expect(f.examples.valid.trim()).not.toBe("");
      expect(f.examples.valid.split("\n").length).toBeLessThanOrEqual(8);
      expect(f.examples.valid.length).toBeLessThanOrEqual(200);
    }
  });

  it("isFormatId accepts known and rejects others", () => {
    expect(isFormatId("yaml")).toBe(true);
    for (const v of ["not-a-format", "", null, undefined, 42, "JSON"]) expect(isFormatId(v)).toBe(false);
  });

  it("getFormat returns the matching definition", () => {
    expect(getFormat("sql").label).toBe("SQL");
  });

  it("defaults to json", () => {
    expect(DEFAULT_FORMAT).toBe("json");
  });

  it("lists SQL dialects in order as the SQL setting", () => {
    const [dialect] = getFormat("sql").settings;
    expect(dialect.key).toBe("dialect");
    expect(dialect.label).toBe("SQL dialect");
    expect(dialect.options.map((o) => o.label)).toEqual(["Standard", "SQL Server", "PostgreSQL", "MySQL"]);
    expect(dialect.options.map((o) => o.value)).toEqual(["sql", "transactsql", "postgresql", "mysql"]);
  });

  it("has unique ids", () => expect(new Set(FORMATS.map((f) => f.id)).size).toBe(FORMATS.length));

  it("gives every format a UI entry", () =>
    expect(Object.keys(FORMAT_UI).sort()).toEqual(FORMATS.map((f) => f.id).sort()));

  it("every setting default is one of its options", () => {
    for (const f of FORMATS) for (const s of f.settings) expect(s.options.map((o) => o.value)).toContain(s.default);
  });

  it("defaultSettings fills each setting", () => {
    expect(defaultSettings("sql")).toEqual({ dialect: "sql" });
    expect(defaultSettings("json")).toEqual({});
  });

  it("ignores unknown or corrupt stored settings", () => {
    expect(sanitizeSettings("sql", { dialect: "oracle", extra: "x" })).toEqual({ dialect: "sql" });
    expect(sanitizeSettings("sql", "not an object")).toEqual({ dialect: "sql" });
    expect(sanitizeSettings("sql", null)).toEqual({ dialect: "sql" });
    expect(sanitizeSettings("sql", ["mysql"])).toEqual({ dialect: "sql" });
    expect(sanitizeSettings("sql", { dialect: "mysql" })).toEqual({ dialect: "mysql" });
  });
});
