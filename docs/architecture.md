# formatly architecture

formatly formats text in the browser: nothing you paste leaves the page. This note explains how the code is laid out, the rules that keep it that way, and how to add a format.

## The big idea: each format is described once

Everything the app knows about a format lives in three places, and nowhere else:

1. **A definition** (`src/formats/definitions/<id>.ts`): plain data. Its id, label, capsule symbol, file type, settings, where it runs, two example inputs, and a `load()` that fetches its formatter.
2. **A formatter** (`src/formats/formatters/<id>.ts`): a pure function, `(input, settings) → FormatResult`.
3. **A UI entry** (`src/components/format-ui.ts`): its CodeMirror language and, optionally, a preview component.

The rest of the app loops over the list of definitions and never names a format. The route, the capsule button, the tagline word, the download file name, the settings dropdowns and the formatter dispatch all come from the definition.

## File structure

```
src/formats/                       CORE: no React, no DOM except mermaid's formatter
  types.ts                         FormatResult, FormatError, FormatSettings, Formatter, FormatDefinition, FormatSetting
  errors.ts                        positionAt(), formatError()                          (coming in phase 2)
  definitions/
    index.ts                       FORMATS (ordered list); FormatId type derived from it
    json.ts yaml.ts mermaid.ts xml.ts sql.ts markdown.ts   one definition each
  registry.ts                      getFormat(), isFormatId(), DEFAULT_FORMAT, defaultSettings(), sanitizeSettings()
  formatters/
    echo.ts                        phase-1 stub, used until each real formatter lands
    json.ts yaml.ts sql.ts xml.ts markdown.ts mermaid.ts                              (coming in phase 2)
  formatInput.ts                   formatInput(): definition.load() + error safety net   (coming in phase 2)
  format.worker.ts                 worker entry: formatInput for runsOn "worker"         (coming in phase 2)
  workerClient.ts                  ids, supersede, timeout, crash recovery               (coming in phase 2)
  runFormatter.ts                  THE seam: routes by definition.runsOn
src/components/format-ui.ts        UI per format: editor language loader, optional preview loader
docs/architecture.md               this file
```

Files marked "coming in phase 2" are planned in `docs/superpowers/plans/2026-11-04-phase2-formatters.md` and don't exist yet. Until then every definition's `load()` returns a stub from `formatters/echo.ts`, and `runFormatter` calls it directly on the page.

## Dependency rules

Dependencies point one way: **UI → core, never core → UI.** "Core" is `src/formats`. "UI" is `src/components`, `src/state` and `src/hooks`.

1. **The core never imports React, Next.js, CodeMirror (`@codemirror/*`, `@uiw/*`), `@/components`, `@/state` or `@/hooks`.** It has to run in a Web Worker and in plain Node tests, where none of those exist.
   *Enforced by* an ESLint `no-restricted-imports` block for `src/formats/**`, and by `tests/architecture.test.ts` (which also catches dynamic `import()`).
2. **A formatter imports only its own library, `../errors` and `../types`.** It knows nothing about the registry, the worker, `formatInput` or other formats, so it can be tested on its own and loaded on its own.
   *Enforced by* a second ESLint block for `src/formats/formatters/**`. It forbids `../definitions*`, `../registry`, `../runFormatter`, `../worker*` and `../formatInput`.
3. **The UI reaches formatting through one function only: `runFormatter(id, input, settings)`.** Components never import a formatter. That keeps one place to change how formatting runs: on the page today, in a worker later.
4. **The UI never branches on a format id.** There is no `=== "sql"` or `=== "markdown"` in `src/components`, `src/state` or `src/hooks`. Behavior comes from the definition (`output`, `settings`, …) or from `format-ui.ts`. That file is the one UI file allowed to name formats.
   *Enforced by* `tests/architecture.test.ts`, which scans those folders for format-id comparisons.

## How adding a format works

Say you want to add TOML:

1. **Formatter.** Create `src/formats/formatters/toml.ts` exporting a `Formatter`: `formatToml(input, settings): FormatResult`.
2. **Definition.** Create `src/formats/definitions/toml.ts` with the metadata, two example inputs, and `load: () => import("../formatters/toml").then((m) => m.formatToml)`.
3. **Register it.** Add `toml` to the list in `src/formats/definitions/index.ts`. Its position in the list is its position in the capsule.
4. **UI entry.** Add one entry to `src/components/format-ui.ts` with its CodeMirror language. You can't forget this step: `FORMAT_UI` is a `Record<FormatId, …>`, so TypeScript refuses to compile until the entry exists.

Nothing else changes. The route (`/toml`), capsule button, tagline word, file extension, worker dispatch and the shared contract tests all pick it up from the definition.

- **A per-format setting** (like the SQL dialect) is one entry in the definition's `settings` array. The dropdown, the per-format storage (`formatly:settings:<id>`), cleaning up bad stored values and passing the value to the formatter all happen automatically.
- **A preview** (like Markdown's rendered view) is one line in `format-ui.ts`: `preview: () => import("./TomlPreview").then((m) => m.TomlPreview)`. The output pane then shows Preview / Source buttons and loads the component only when it's first shown.

## Loading

Every format-specific piece loads on demand: the formatter (`definition.load()`), the editor language and the preview (`format-ui.ts`). So opening `/json` downloads no SQL grammar, Markdown renderer or Mermaid.
