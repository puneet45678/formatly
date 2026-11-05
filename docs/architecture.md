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

- **`"worker"`** (JSON, YAML, SQL, XML, Markdown): the request goes to `workerClient`, which posts it to a Web Worker (`format.worker.ts`). The worker calls `formatInput` and replies. A big paste therefore can't freeze typing. The client tags each request with an id, and if a job has been running for more than 50 ms when a newer request arrives, it throws that worker away and starts a fresh one (`SUPERSEDE_AFTER_MS`). The old job's result would be discarded anyway, and a respawn measured 20–50 ms in Chromium, so replacing the worker is cheaper than waiting. A job that takes over 15 seconds or a worker that crashes comes back as `{ kind: "failed" }`, and a replaced job as `{ kind: "cancelled" }`, so callers never see a rejected promise.
- **`"main"`** (Mermaid only): it needs the DOM to render, which a worker doesn't have, so `formatInput` runs on the page. Its output is SVG sanitized with DOMPurify before anything uses it, and diagrams over Mermaid's limits (50,000 characters, 500 edges) are refused as too complex. Why it doesn't run in a sandboxed iframe: [ADR 0001](adr/0001-mermaid-stays-on-the-main-thread.md). The same happens for every format when the browser has no `Worker` (and in tests).

Either way the last step is `formatInput`: it loads the formatter with `definition.load()`, cleans the settings and runs it. A formatter returns a `FormatResult`: its output, or a syntax error with a 1-based `line` and optional `column` (build one with `formatError(message, line, column)`; `positionAt(text, offset)` turns a character offset into a line and column). A formatter can also just throw.

### Outcomes: invalid input is not the same as a failure

`formatInput`, the worker and `runFormatter` return a `FormatOutcome`, which keeps apart things the UI must treat differently:

| `kind` | Meaning | Has a position? | UI |
| --- | --- | --- | --- |
| `ok` | Formatted output | — | Output, "Valid" |
| `invalid` | The formatter found a syntax error | Yes | Red "Error", "Line N", the line marked in the editor |
| `failed` | We couldn't finish: `timeout`, `crashed`, `too-complex` (stack overflow, or a formatter's `TooComplexError`), `internal` (a throw or a failed download) | No | Neutral "Couldn't format"; "Try again" only for `crashed` and `internal` |
| `cancelled` | A newer request replaced this one | — | Nothing changes |

Only `invalid` carries a line, so a timeout or crash can never mark line 1 of the input as if it were wrong.

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

**Existing tests that list the formats.** A few older tests spell out the current set of formats on purpose (the registry order, labels, glyphs and extensions, the format rail, the tagline words, the empty-inputs state). Adding a format makes them fail until you add it to those lists. That is the tests doing their job, not a fifth place to edit in the app.

- **A per-format setting** (like the SQL dialect, or the shared indent choice in `definitions/indent.ts`) is one entry in the definition's `settings` array. Settings are choices from a fixed list; see [ADR 0002](adr/0002-settings-stay-string-choices.md) for why they aren't typed numbers or booleans. The dropdown, the per-format storage (`formatly:settings:<id>`), cleaning up bad stored values and passing the value to the formatter all happen automatically.
- **A preview** (like Markdown's rendered view) is one line in `format-ui.ts`: `preview: () => import("./TomlPreview").then((m) => m.TomlPreview)`. The output pane then shows Preview / Source buttons and loads the component only when it's first shown.

## Loading

Every format-specific piece loads on demand: the formatter (`definition.load()`), the editor language and the preview (`format-ui.ts`). So opening `/json` downloads no SQL grammar, Markdown renderer or Mermaid.

## Guardrails

Three checks keep the rules above true over time. All run in CI (`.github/workflows/ci.yml`) on every pull request and on `main`.

- **CI** runs `lint` (including the core/UI import rules), `typecheck`, `test`, `test:perf` and `build`. `typecheck` runs `next typegen` first: `PageProps` and `LayoutProps` are global types Next generates into `.next/types`, so a plain `tsc` fails on a fresh checkout.
- **Performance budgets** (`tests/perf/`, run with `npm run test:perf`) format generated 256 KB to 1 MB inputs in plain Node and fail if a formatter gets about 3x slower than measured. They are regression tripwires, not product targets; measured numbers are in the test file. A timeout cannot interrupt synchronous code, so the cheap JSON guard runs first with `bail: 1`, and the CI job's `timeout-minutes` is the outer kill switch (the same reason `workerClient` terminates its worker).
- **Content Security Policy** (`src/lib/csp.ts`, added as a `<meta>` tag in production builds). `connect-src 'self'` is what makes "nothing you paste leaves the page" enforced by the browser rather than promised. Limits of a `<meta>` policy on a static export: `script-src` needs `'unsafe-inline'` for Next's bootstrap scripts (no server, so no nonces); Next puts its own script tags before the tag, so their fetches are not covered; `frame-ancestors` and reporting are ignored. A policy sent as an HTTP header by the host would close those gaps. `img-src` allows `https:` only for Markdown preview's click-to-load remote images.

Known performance limits (from the measurements, not yet fixed): SQL and Markdown grow faster than linearly, and Markdown takes about 13 s at 1 MB, close to the worker's 15 s timeout. These are what limit live formatting of large inputs: no cancellation policy can show fresh output faster than the formatter produces it.

### Patched dependencies

`patches/` holds fixes to dependencies, applied by `patch-package` on every `npm install` and `npm ci` (the `postinstall` script). A patch names an exact version, so a dependency upgrade that no longer matches fails the install loudly instead of silently dropping the fix.

- **`xml-parser-xo+4.1.6.patch`**: its `is(prefix)` used `indexOf(prefix) === 0`, which scans the whole remaining input whenever the prefix isn't there. Called for every attribute loop, that made XML formatting quadratic: 3.1 s at 1 MB, now about 105 ms, with byte-identical output. Remove the patch once upstream switches to `startsWith`; the XML perf budget fails if the slow version returns.

