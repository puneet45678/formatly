// Guards the dependency rules in docs/architecture.md by reading the source files.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../src");

/** Every .ts/.tsx file under `dir`, as paths relative to src/. */
function sourceFiles(dir: string): string[] {
  const absolute = path.join(SRC, dir);
  return readdirSync(absolute).flatMap((name) => {
    const full = path.join(absolute, name);
    const relative = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(relative);
    return /\.tsx?$/.test(name) ? [relative] : [];
  });
}

/** Module specifiers from static imports, re-exports and dynamic import(). */
function importsOf(source: string): string[] {
  return [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g)].map((m) => m[1]);
}

describe("architecture", () => {
  it("UI code never branches on a format id", () => {
    const uiFiles = ["components", "state", "hooks"]
      .flatMap(sourceFiles)
      .filter((file) => path.basename(file) !== "format-ui.ts");
    expect(uiFiles.length).toBeGreaterThan(0);

    const offenders = uiFiles.filter((file) => {
      const source = readFileSync(path.join(SRC, file), "utf8");
      return (
        /(===|!==)\s*["'](json|yaml|mermaid|xml|sql|markdown)["']/.test(source) || /\.id\s*===\s*["']/.test(source)
      );
    });
    expect(offenders).toEqual([]);
  });

  it("core code never imports UI or React", () => {
    const forbidden = /^(react|react-dom|next|@codemirror|@uiw|@lezer|@\/components|@\/state|@\/hooks)(\/|$)/;
    const offenders = sourceFiles("formats").flatMap((file) =>
      importsOf(readFileSync(path.join(SRC, file), "utf8"))
        .filter((specifier) => forbidden.test(specifier))
        .map((specifier) => `${file} imports ${specifier}`),
    );
    expect(offenders).toEqual([]);
  });
});
