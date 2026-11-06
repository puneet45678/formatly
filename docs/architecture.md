# formatly architecture

formatly formats text in the browser: nothing you paste leaves the page. This note explains how the code is laid out, the rules that keep it that way, and how to add a format.

## The big idea: each format is described once

Everything the app knows about a format lives in three places, and nowhere else:

1. **A definition** (`src/formats/definitions/<id>.ts`): plain data. Its id, label, capsule symbol, file type, settings, where it runs, two example inputs, and a `load()` that fetches its formatter. The fields are documented on `FormatDefinition` in `src/formats/types.ts`.
2. **A formatter** (`src/formats/formatters/<id>.ts`): a pure function, `(input, settings) → FormatResult`.
3. **A UI entry** (`src/components/format-ui.ts`): its CodeMirror language and, optionally, a preview component.

The rest of the app loops over the list of definitions and never names a format. The route, the capsule button, the tagline word, the download file name, the settings dropdowns and the formatter dispatch all come from the definition.

## File structure

```
src/formats/                       CORE: no React, no DOM except mermaid's formatter
  types.ts                         FormatResult, FormatError, FormatSettings, Formatter, FormatDefinition, FormatSetting
  errors.ts                        positionAt(), formatError(message, line, column?)
  definitions/
    index.ts                       FORMATS (ordered list); FormatId type derived from it
    json.ts yaml.ts mermaid.ts xml.ts sql.ts markdown.ts   one definition each
  registry.ts                      getFormat(), isFormatId(), DEFAULT_FORMAT, defaultSettings(), sanitizeSettings()
  formatters/
    json.ts yaml.ts sql.ts xml.ts markdown.ts mermaid.ts   one pure formatter each
    echo.ts                        phase-1 stand-in; no definition uses it any more
  formatInput.ts                   formatInput(): definition.load() + sanitized settings + error safety net
  format.worker.ts                 worker entry: calls formatInput for each message
  workerClient.ts                  request ids, supersede, timeout, crash recovery
  runFormatter.ts                  THE seam: routes by definition.runsOn
src/components/format-ui.ts        UI per format: editor language loader, optional preview loader
tests/formats/contract.test.ts     shared checks that every worker format must pass
docs/architecture.md               this file
```

## How a format runs

`runFormatter(id, input, settings)` is the only door the UI uses. It looks at the definition's `runsOn`:

- **`"worker"`** (JSON, YAML, SQL, XML, Markdown): the request goes to `workerClient`, which posts it to a Web Worker (`format.worker.ts`). The worker calls `formatInput` and replies. A big paste therefore can't freeze typing. The client tags each request with an id, and if a slow job is still running when a newer request arrives it throws that worker away and starts a fresh one. A job that takes over 15 seconds, or a worker that crashes, comes back as a normal `{ ok: false }` error, so callers never see a rejected promise.
- **`"main"`** (Mermaid only): it needs the DOM to render, which a worker doesn't have, so `formatInput` runs on the page. The same happens for every format when the browser has no `Worker` (and in tests).

Either way the last step is `formatInput`: it loads the formatter with `definition.load()`, cleans the settings, runs it, and turns any thrown exception into a `{ ok: false }` result. A formatter can therefore just return errors or even throw. Errors carry a 1-based `line` and an optional `column`; use `formatError(message, line, column)` to build one, and `positionAt(text, offset)` to turn a character offset into a line and column.

## Dependency rules

Dependencies point one way: **UI → core, never core → UI.** "Core" is `src/formats`. "UI" is `src/components`, `src/state` and `src/hooks`.

1. **The core never imports React, Next.js, CodeMirror (`@codemirror/*`, `@uiw/*`), `@/components`, `@/state` or `@/hooks`.** It has to run in a Web Worker and in plain Node tests, where none of those exist.
   *Enforced by* an ESLint `no-restricted-imports` block for `src/formats/**`, and by `tests/architecture.test.ts` (which also catches dynamic `import()`).
2. **A formatter imports only its own library, `../errors` and `../types`.** It knows nothing about the registry, the worker, `formatInput` or other formats, so it can be tested on its own and loaded on its own.
   *Enforced by* a second ESLint block for `src/formats/formatters/**`. It forbids `../definitions*`, `../registry`, `../runFormatter`, `../worker*` and `../formatInput`.
3. **The UI reaches formatting through one function only: `runFormatter(id, input, settings)`.** Components never import a formatter. That keeps one place to change how formatting runs (worker or page).
4. **The UI never branches on a format id.** There is no `=== "sql"` or `=== "markdown"` in `src/components`, `src/state` or `src/hooks`. Behavior comes from the definition (`output`, `settings`, …) or from `format-ui.ts`. That file is the one UI file allowed to name formats.
   *Enforced by* `tests/architecture.test.ts`, which scans those folders for format-id comparisons.

## How adding a format works

Say you want to add TOML. It is exactly four files:

1. **Formatter.** Create `src/formats/formatters/toml.ts` exporting a `Formatter`: `formatToml(input, settings): FormatResult`. Return `{ ok: true, output }`, or `formatError(message, line, column?)` from `../errors`. The `settings` parameter can be left out if you don't use it. Copy `formatters/xml.ts` as a model.
2. **Definition.** Create `src/formats/definitions/toml.ts`. Copy `definitions/xml.ts` and change the fields: `id`, `label`, `glyph` (the capsule symbol), `extension`, `mime`, `output` (`"text"`, or `"diagram"` for rendered SVG), `runsOn` (`"worker"` unless it needs the DOM), `settings` (`[]` for none), `examples` (`valid` and `invalid` input) and `load: () => import("../formatters/toml").then((m) => m.formatToml)`. Keep the `as const satisfies FormatDefinition` ending: it keeps `id` a literal type. If every text is valid input, set `examples.invalid` to `""`.
3. **Register it.** In `src/formats/definitions/index.ts`, import the definition and add it to the `FORMATS` array. Its position in the array is its position in the capsule.
4. **UI entry.** Add one entry to `FORMAT_UI` in `src/components/format-ui.ts`. Use a CodeMirror language package if one exists (`import("@codemirror/lang-…")`), or `language: async () => []` for plain text, as Mermaid does. You can't forget this step: `FORMAT_UI` is a `Record<FormatId, …>`, so TypeScript refuses to compile until the entry exists.

Nothing else changes. The route (`/toml`), capsule button, tagline word, file extension, worker dispatch and the shared contract tests all pick it up from the definition.

**The contract tests.** `tests/formats/contract.test.ts` loops over every `runsOn: "worker"` definition and checks three things with its `examples`: the valid example formats to non-empty output; formatting that output again changes nothing (stable); and the invalid example is rejected with a message and a line number inside the input. You write no test code for these. (Mermaid runs on the main thread, so it has its own test in `tests/formats/formatters/mermaid.test.ts`.) Add a `tests/formats/formatters/<id>.test.ts` for format-specific behaviour.

**Existing tests.** No test other than `tests/formats/registry.test.ts` spells out the list of formats; they read it from `FORMATS`, and `tests/architecture.test.ts` catches the common way of breaking that (three or more format ids listed together); a count such as `toHaveLength(6)` it cannot see, so derive counts from `FORMATS` too. So adding a format changes no existing test (checked by adding a throwaway CSV format: exactly the four files above changed and the suite stayed green).

- **A per-format setting** (like the SQL dialect) is one entry in the definition's `settings` array. The dropdown, the per-format storage (`formatly:settings:<id>`), cleaning up bad stored values and passing the value to the formatter all happen automatically.
- **Recognising pasted text** is one optional field: `detect(input): number` in the definition (0 = no, 1 = certain). When text is pasted into an empty input, `detectFormat()` (`src/formats/detect.ts`) compares every format's score and, if another format is clearly the better fit, the input shows "This looks like YAML. Switch to YAML". A format without `detect` is simply never suggested. Rules for a detector: cheap (it runs on the page, on a paste), no library imports (that would pull the library in eagerly), no pattern that can backtrack on a long line (`tests/formats/detect.test.ts` runs every detector over pathological pastes, and checks each format's own example is never mistaken for another).
- **A preview** (like Markdown's rendered view) is one line in `format-ui.ts`: `preview: () => import("./TomlPreview").then((m) => m.TomlPreview)`. The output pane then shows Preview / Source buttons and loads the component only when it's first shown.

## The page around the tool

- **Layout.** `Workbench` is one format's page: the tool (format capsule, intro, panes) fills the first screen on desktop and the About text sits below it, so the page scrolls and the tool does not. While the output is expanded the capsule, intro and About text are hidden and the output gets the full width.
- **Split view.** `SplitView` puts a draggable divider between the input and output (desktop only; on phones they stack). Dragging writes a CSS variable directly and commits once on release; arrow keys, Home/End, Enter (collapse) and double-click (reset) work on the divider. The input can collapse to a rail. The maths lives in `src/lib/split.ts`; the layout is stored under `formatly:layout` and sanitized on read.
- **Site text.** The intro above the panes and the About text below are the same on every format and live in `src/content/site.ts`. They state only what the product does (see `tests/content/site.test.ts` and the no-network check in `tests/architecture.test.ts`). Adding a format changes none of it: the format list in the copy is read from `FORMATS`.

## Loading

Every format-specific piece loads on demand: the formatter (`definition.load()`), the editor language and the preview (`format-ui.ts`). So opening `/json` downloads no SQL grammar, Markdown renderer or Mermaid.
