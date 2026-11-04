# Formatter Phase 2 (Real Formatters) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the phase-1 stub with real formatting for all six formats. Restructure the code so that adding a format later, or a per-format feature such as a setting or a preview, means adding files rather than editing scattered ones.

**Architecture:** Each format is described once, as data.
- **A pure core definition** (`src/formats/definitions/`): id, label, glyph, file type, settings, where it runs, and example inputs.
- **A pure formatter module** (`src/formats/formatters/`): `input → FormatResult`.
- **A UI entry** (`src/components/format-ui.ts`): the editor language and an optional preview.

Everything else iterates over the registry and contains no format names: routes, the capsule, the tagline, the settings controls, the dispatcher, the worker. The type system makes a forgotten piece a compile error. Dependencies point one way: UI → core, never core → UI, and ESLint enforces it.

**Tech Stack:** `jsonc-parser` 3.3, `yaml` 2.9, `sql-formatter` 15.9, `fast-xml-parser` 5.12 + `xml-formatter` 3.7, `prettier` 3.9 (standalone + markdown plugin), `mermaid` 12.3. Existing: Next.js 16 static export, React 19, CodeMirror 6, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-11-04-formatter-design.md` (phase 1 plan: `docs/superpowers/plans/2026-11-04-phase1-ui.md`)

## How adding a format will work (the target)

Adding TOML after this plan:
1. `src/formats/formatters/toml.ts`: `formatToml(input, settings): FormatResult`.
2. `src/formats/definitions/toml.ts`: the metadata, two example inputs, and `load: () => import("../formatters/toml").then(m => m.formatToml)`.
3. Add it to the list in `src/formats/definitions/index.ts`.
4. Add one entry to `src/components/format-ui.ts` (its CodeMirror language). TypeScript refuses to compile until you do.

Nothing else changes. The route, capsule button, tagline word, file extension, worker dispatch and the shared contract tests all pick it up. A per-format **setting** (like the SQL dialect) is one array entry in the definition; the dropdown, storage and wiring are generic. A **preview** (like Markdown's) is one line in `format-ui.ts`.

## Dependency rules (enforced)

1. **The core (`src/formats/**`) never imports React, Next.js, CodeMirror, `@/components`, `@/state` or `@/hooks`.** It can run in a Web Worker and in plain Node tests. Enforced by ESLint `no-restricted-imports` scoped to `src/formats/**`.
2. **Formatter modules import only their own library and `../errors`.** They know nothing about the registry, the worker or other formats. Enforced by a second `no-restricted-imports` block for `src/formats/formatters/**` that forbids `../definitions*`, `../registry`, `../runFormatter`, `../worker*`.
3. **The UI reaches formatting through one function only:** `runFormatter(id, input, settings)`. Components never import a formatter.
4. **The UI never branches on a format id.** No `=== "sql"` or `=== "markdown"` anywhere in `src/components`, `src/state` or `src/hooks`; behavior comes from the definition or `format-ui.ts`. A test greps for this (Task 1).

## Library facts (checked on 2026-11-04 with the versions above)

- **JSON:** Prettier keeps minified JSON on one line, so don't use it for JSON.
  - `jsonc-parser`: `applyEdits(t, format(t, undefined, { tabSize: 2, insertSpaces: true, eol: "\n" }))` fully expands and keeps every literal exactly (`1.50`, `1e400`, 23-digit integers).
  - `parse(t, errors, { disallowComments: true, allowTrailingComma: false, allowEmptyContent: false })` reports `{ error, offset, length }`; `printParseErrorCode(error)` names the code.
  - A trailing comma reports `ValueExpected` at the `]`.
  - `{'a':1}` and `{a:1}` both give `InvalidSymbol`, `PropertyNameExpected`, `ValueExpected`.
- **Deep nesting:** `jsonc-parser` throws `RangeError` while parsing 100 000 nested `[`. Formatting that input ran Node **out of memory** (the output grows quadratically), so JSON must check the depth first.
- **YAML:** `parseAllDocuments(t)` and `d.toString({ indent: 2, lineWidth: 0 })` joined with `""` keeps quotes, comments and document markers. Without `lineWidth: 0`, it re-wraps long lines.
  - Errors are on `doc.errors`, each with `message` (first line ends in ` at line N, column M:`) and `linePos[0] = { line, col }`.
  - Duplicate keys are errors.
  - Empty input gives `[]`.
- **SQL:** `sql-formatter` `format(t, { language, keywordCase: "upper" })` throws messages whose first line contains ` at line L column C`.
  - A query that stops early says `Parse error at token: «EOF» at line 2 column 15`.
  - With the standard dialect, SQL Server's `[id]` fails with `Parse error: Unexpected "[id] from " at line 1 column 8.`
- **XML:** `xml-formatter` formats broken XML without complaint. Check first with `fast-xml-parser` `XMLValidator.validate(t)`, which returns `true` or `{ err: { msg, line, col } }`.
  - `xmlFormatter(t, { indentation: "  ", collapseContent: true, lineSeparator: "\n" })` leaves mixed content alone.
  - `<a>\n  <b></a>` → `"Expected closing tag 'b' (opened in line 2, col 3) instead of closing tag 'a'."`, line 2, column 6.
- **Markdown:** `prettier/standalone` with `prettier/plugins/markdown`: `# T\n* one\n* two\n\n__bold__` → `# T\n\n- one\n- two\n\n**bold**\n`.
- **Workers:** Next 16 / Turbopack bundles `new Worker(new URL("./x.ts", import.meta.url), { type: "module" })` natively.

## Global Constraints

- **Formatting keeps the meaning the same.** Values, key order and content are unchanged. Normal formatter style changes are fine.
- **Indent:** 2 spaces for JSON, YAML and XML.
- **JSON is strict.** Comments, trailing commas, single quotes and unquoted keys are errors with a line and column. Big numbers keep their exact digits. No more than 1000 levels of nesting.
- **YAML:** keep the original quote style and keep comments.
- **XML:** leave whitespace inside mixed content alone.
- **SQL:** uppercase keywords, with dialects `sql | transactsql | postgresql | mysql` (labels Standard, SQL Server, PostgreSQL, MySQL). The default is `sql` and the choice is remembered.
- **Mermaid:** `securityLevel: "strict"` and a dark theme matching the site.
- **Client-side only:** no network requests from formatting.
- **Lazy loading:** opening `/json` loads no Mermaid, Prettier or `sql-formatter` code, and no other format's CodeMirror language.
- **Typing never freezes** on a ~1 MB paste. Text formats run in a Web Worker.
- **Result contract:** `FormatResult = { ok: true; output } | { ok: false; error: { message; line; column? } }`, with 1-based lines and columns.
- **Existing behavior must not regress.** All phase-1 tests keep passing, apart from intended API renames updated in Task 1.
- **Branch:** `phase-2-formatters`, created from `phase-1-ui`. Open the PR with base `phase-1-ui`.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Very deeply nested JSON** (100 000 `[`): a clear error, with no crash, hang or out-of-memory. (Task 3: `rejects absurd nesting with a clear message`)
2. **A ~1 MB paste followed by more typing:** the old job is abandoned and typing stays smooth. (Task 8: `replaces a worker that is busy with an old job`)
3. **A formatter throws or the worker crashes:** an error at line 1, and the next keystroke works. (Task 8: `recovers after the worker crashes`, Task 2: `turns unexpected throws into an error at line 1`)
4. **A Mermaid syntax error:** shows a line number and leaves no stray error graphics in `<body>`. (Task 9: `cleans up after a failed render`)
5. **A saved setting that no longer exists** (e.g. stored SQL dialect `oracle`, or invalid JSON in storage): falls back to the default without crashing. (Task 1: `ignores unknown or corrupt stored settings`)

---

## File Structure

```
src/formats/                       CORE: no React, no DOM except mermaid's formatter
  types.ts                         FormatResult, FormatError, FormatSettings, Formatter, FormatDefinition, FormatSetting
  errors.ts                        positionAt(), formatError()
  definitions/
    index.ts                       FORMATS (ordered list); FormatId type derived from it
    json.ts yaml.ts mermaid.ts xml.ts sql.ts markdown.ts   one definition each
  registry.ts                      getFormat(), isFormatId(), DEFAULT_FORMAT, defaultSettings(), sanitizeSettings()
  formatters/
    echo.ts                        phase-1 stub, used until each real formatter lands
    json.ts yaml.ts sql.ts xml.ts markdown.ts mermaid.ts
  formatInput.ts                   formatInput(): definition.load() + error safety net
  format.worker.ts                 worker entry: formatInput for runsOn "worker"
  workerClient.ts                  ids, supersede, timeout, crash recovery
  runFormatter.ts                  THE seam: routes by definition.runsOn
src/components/format-ui.ts        UI per format: editor language loader, optional preview loader
docs/architecture.md               the rules above + "how to add a format"
```

---

### Task 1: Format definitions and the registry-driven UI (refactor, no visible change)

The biggest task, and the one that makes everything after it simple. Behavior stays exactly as today. Only the structure changes.

**Files:**
- Create: `src/formats/definitions/{index,json,yaml,mermaid,xml,sql,markdown}.ts`, `src/formats/formatters/echo.ts`, `src/components/format-ui.ts`, `docs/architecture.md`
- Modify: `src/formats/types.ts`, `src/formats/registry.ts`, `src/formats/runFormatter.ts`, `src/lib/storage.ts`, `src/state/WorkbenchContext.tsx`, `src/hooks/useFormattedOutput.ts`, `src/components/{CodeEditor,InputPane,OutputPane,OutputActions,Workbench}.tsx`, `eslint.config.mjs`
- Test: `tests/formats/registry.test.ts` (extend), `tests/architecture.test.ts` (new), plus the existing tests updated for the renamed APIs

**Interfaces:**
- Produces (`src/formats/types.ts`):
```ts
export type FormatSettings = Readonly<Record<string, string>>;
export type Formatter = (input: string, settings: FormatSettings) => FormatResult | Promise<FormatResult>;
export interface FormatSetting { key: string; label: string; options: readonly { value: string; label: string }[]; default: string }
export interface FormatDefinition {
  id: string; label: string; glyph: string; extension: string; mime: string;
  output: "text" | "diagram";
  runsOn: "worker" | "main";          // main = needs the DOM (Mermaid)
  settings: readonly FormatSetting[];
  examples: { valid: string; invalid: string };
  load: () => Promise<Formatter>;      // lazy: each format is its own chunk
}
```
- Produces (`definitions/index.ts`): `export const FORMATS = [json, yaml, mermaid, xml, sql, markdown] as const satisfies readonly FormatDefinition[]` and `export type FormatId = (typeof FORMATS)[number]["id"]`. `types.ts` re-exports `FormatId` from here, so the hand-written union goes away.
- Produces (`registry.ts`): the existing `FORMATS`, `DEFAULT_FORMAT`, `isFormatId` and `getFormat` keep their names, plus:
  - `defaultSettings(id: FormatId): FormatSettings`
  - `sanitizeSettings(id: FormatId, raw: unknown): FormatSettings` (keeps only known keys with allowed values; fills defaults)
  - `SQL_DIALECTS` and `SqlDialect` are **removed**, because the dialects now live in the SQL definition's `settings`.
- Produces (`format-ui.ts`): `export const FORMAT_UI: Record<FormatId, { language: () => Promise<Extension>; preview?: () => Promise<ComponentType<{ source: string }>> }>`. Mermaid's language resolves to `[]`; Markdown's preview loads `MarkdownPreview` (its prop is renamed `markdown` → `source`).
- Produces (state): `useWorkbench()` swaps `sqlDialect`/`setSqlDialect` for `settings: Record<FormatId, FormatSettings>` and `setSetting(id: FormatId, key: string, value: string): void`, persisted per format as JSON under `formatly:settings:<id>`. `STORAGE_KEYS.sqlDialect` is replaced by `settingsKey(id: FormatId): string`.
- Produces: `runFormatter(id: FormatId, input: string, settings: FormatSettings): Promise<FormatResult>` and `useFormattedOutput(id, input, settings: FormatSettings)`. Inside the hook, the effect dependency is `JSON.stringify(settings)`.
- `echo.ts` exports two stubs: `echo: Formatter` (returns the input) and `placeholderDiagram: Formatter` (returns the existing placeholder SVG). Every text definition's `load` returns `echo`, and Mermaid's returns `placeholderDiagram`. Tasks 3–9 swap in the real ones.
- SQL definition `settings`: `[{ key: "dialect", label: "SQL dialect", default: "sql", options: [{ value: "sql", label: "Standard" }, { value: "transactsql", label: "SQL Server" }, { value: "postgresql", label: "PostgreSQL" }, { value: "mysql", label: "MySQL" }] }]`.
- Examples (also used later by the contract suite):
  - JSON: valid `{"name":"Asha","roles":["admin","dev"],"active":true}`, invalid `{"a": 1,}`
  - YAML: valid `server:\n    port: 8080\n    tags: ['a', "b"]  # note\n`, invalid `a: 1\nc: [1, 2\n`
  - SQL: valid `select id, name from users where active = 1 order by name`, invalid `select *\nfrom t where (`
  - XML: valid `<a><b x="1">t</b><c/></a>`, invalid `<a>\n  <b></a>`
  - Markdown: valid `# Notes\n* one\n* two\n\n__bold__ text`, invalid `""` (empty means "no invalid input exists"; the contract suite skips it)
  - Mermaid: valid `graph TD; A-->B`, invalid `graph TD; A-->`

- [ ] **Step 1: Branch.** `git switch -c phase-2-formatters phase-1-ui`. Commit the plan file first: `docs: phase 2 plan`.
- [ ] **Step 2: Failing tests**
```ts
// registry.test.ts (add)
it('derives ids, labels and order from the definitions', () =>
  expect(FORMATS.map(f => f.id)).toEqual(['json','yaml','mermaid','xml','sql','markdown']));
it('has unique ids, glyphs and extensions', () => {
  for (const key of ['id', 'glyph', 'extension'] as const)
    expect(new Set(FORMATS.map(f => f[key])).size).toBe(FORMATS.length);
});
it('only mermaid runs on the main thread', () =>
  expect(FORMATS.filter(f => f.runsOn === 'main').map(f => f.id)).toEqual(['mermaid']));
it('gives every format a UI entry', () =>
  expect(Object.keys(FORMAT_UI).sort()).toEqual(FORMATS.map(f => f.id).sort()));
it('every setting default is one of its options', () => {
  for (const f of FORMATS) for (const s of f.settings) expect(s.options.map(o => o.value)).toContain(s.default);
});
it('defaultSettings fills each setting', () =>
  expect(defaultSettings('sql')).toEqual({ dialect: 'sql' }));
it('ignores unknown or corrupt stored settings', () => {
  expect(sanitizeSettings('sql', { dialect: 'oracle', extra: 'x' })).toEqual({ dialect: 'sql' });
  expect(sanitizeSettings('sql', 'not an object')).toEqual({ dialect: 'sql' });
  expect(sanitizeSettings('sql', { dialect: 'mysql' })).toEqual({ dialect: 'mysql' });
});
// architecture.test.ts (new; reads files with node:fs)
it('UI code never branches on a format id', () => {
  // every .ts/.tsx under src/components, src/state, src/hooks except format-ui.ts
  // must not match /(===|!==)\s*["'](json|yaml|mermaid|xml|sql|markdown)["']/ or /\.id\s*===\s*["']/
});
it('core code never imports UI or React', () => {
  // every file under src/formats must not import from 'react', 'next', '@codemirror', '@/components', '@/state', '@/hooks'
});
// WorkbenchContext.test.tsx: replace the sqlDialect tests with
it('starts each format with its default settings', ...)          // settings.sql → { dialect: 'sql' }, settings.json → {}
it('changes and remembers a setting', ...)                       // setSetting('sql','dialect','mysql') → settings.sql.dialect 'mysql'; localStorage 'formatly:settings:sql' === '{"dialect":"mysql"}'
it('restores stored settings, ignoring bad ones', ...)           // stored '{"dialect":"postgresql"}' → postgresql; stored '{oops' → default
// Workbench.test.tsx: the existing dialect tests keep passing unchanged (the combobox is still named "SQL dialect"):
it('passes the chosen dialect to the formatter', ...)            // now expects runFormatter(…, 'sql', 'select 1', { dialect: 'postgresql' })
// OutputPane.test.tsx: the Preview/Source tests become async (findByRole), because the preview loads lazily
```
- [ ] **Step 3: Run** `npm test`. Expected: the new tests FAIL; existing tests that use renamed APIs fail to compile until updated.
- [ ] **Step 4: Implement.**
  - **Definitions and registry:** as in Interfaces. `registry.ts` re-exports `FORMATS` and keeps `getFormat`/`isFormatId`/`DEFAULT_FORMAT`.
  - **InputPane:** renders one `<select aria-label={setting.label}>` per `definition.settings` entry, so the SQL `select` stays identical for users.
  - **OutputPane:** shows Preview/Source when `FORMAT_UI[id].preview` exists, loading the component with `React.lazy` + `<Suspense>`; the fallback is the source editor. It uses `definition.output` instead of `outputKind`.
  - **CodeEditor:** loads `FORMAT_UI[id].language()` in an effect into state (no extension until it resolves), replacing the static map.
  - **Workbench:** passes `settings[formatId]`; there are no format checks.
  - **ESLint:** add the two `no-restricted-imports` blocks from "Dependency rules".
  - **`docs/architecture.md`:** the diagram from File Structure, the four dependency rules, and the "How adding a format will work" checklist from this plan, written for a reader new to the codebase.
- [ ] **Step 5: Run** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Expected: all pass, with the same test count plus the new ones.
- [ ] **Step 6:** Quick browser check (dev server `formatly-dev`): every format page loads, typing echoes, the SQL dropdown persists across a reload, and Markdown Preview/Source still works.
- [ ] **Step 7: Commit** `refactor: describe each format once; UI reads everything from the registry`.

---

### Task 2: Error helpers, safety net and the shared formatter contract

**Files:**
- Create: `src/formats/errors.ts`, `src/formats/formatInput.ts`
- Test: `tests/formats/errors.test.ts`, `tests/formats/formatInput.test.ts`, `tests/formats/contract.test.ts`

**Interfaces:**
- Produces:
  - `positionAt(text: string, offset: number): { line: number; column: number }` (1-based; handles `\r\n`)
  - `formatError(message: string, line: number, column?: number): FormatResult` (leaves out `column` when undefined)
  - `formatInput(id: FormatId, input: string, settings: FormatSettings): Promise<FormatResult>`: `await getFormat(id).load()`, then call it with `sanitizeSettings(id, settings)`. A `RangeError` becomes "This is nested too deeply to format" at line 1; any other throw becomes `formatError(message, 1)`.
- `contract.test.ts` is the guarantee every current and future formatter must meet. It loops over `FORMATS.filter(f => f.runsOn === "worker")`, calls `formatInput`, and is **skipped per format while its `load` still points at `echo`** (detect with `(await f.load()) === echo`).

- [ ] **Step 1: Failing tests**
```ts
// errors
it('positionAt counts lines and columns from 1', () => {
  expect(positionAt('ab\ncd', 4)).toEqual({ line: 2, column: 2 });
  expect(positionAt('ab\r\ncd', 5)).toEqual({ line: 2, column: 2 });
});
it('formatError builds a failed result', () =>
  expect(formatError('Bad', 3)).toEqual({ ok: false, error: { message: 'Bad', line: 3 } }));
// formatInput (vi.doMock a definition's load to throw)
it('turns unexpected throws into an error at line 1', ...)        // load → () => { throw new Error('boom') } → { ok:false, error:{ message:'boom', line:1 } }
it('turns a stack overflow into a nesting error', ...)            // throws RangeError → 'This is nested too deeply to format'
it('passes sanitized settings to the formatter', ...)             // ('sql', 'x', { dialect: 'oracle' }) → formatter called with { dialect: 'sql' }
// contract: for each real (non-echo) worker format f
it(`${f.id}: formats its valid example`, ...)                     // ok === true, output non-empty
it(`${f.id}: formatting is stable`, ...)                          // format(format(x).output).output === format(x).output
it(`${f.id}: rejects its invalid example with a usable position`, ...) // when examples.invalid !== '': ok false, 1 <= line <= input line count, message non-empty
```
- [ ] **Step 2: Run** `npm test -- errors formatInput contract`. Expected: FAIL (contract cases are all skipped for now, which is fine).
- [ ] **Step 3: Implement** the three modules.
- [ ] **Step 4: Run** the same tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: formatter safety net and shared contract tests`.

---

### Task 3: JSON

**Files:** Create `src/formats/formatters/json.ts`; Modify `src/formats/definitions/json.ts` (`load`); Test `tests/formats/formatters/json.test.ts`

**Interfaces:** Produces `MAX_JSON_DEPTH = 1000` and `formatJson(input: string): FormatResult` (it ignores settings).

- [ ] **Step 1:** `npm i jsonc-parser@3.3.1`
- [ ] **Step 2: Failing tests**
```ts
it('expands minified JSON with 2 spaces', () =>
  expect(formatJson('{"a":[1,2],"o":{}}')).toEqual({ ok: true, output: '{\n  "a": [\n    1,\n    2\n  ],\n  "o": {}\n}' }));
it('keeps number literals exactly', () => {
  const out = (formatJson('{"big":12345678901234567890123,"f":1.50,"e":1e400}') as { output: string }).output;
  for (const lit of ['12345678901234567890123', '1.50', '1e400']) expect(out).toContain(lit);
});
it('keeps key order and meaning', ...)                          // JSON.parse(output) deep-equals JSON.parse(input); "z" before "a"
it('reports a missing comma with line and column', () =>
  expect(formatJson('{\n  "a": 1\n  "b": 2\n}')).toEqual({ ok: false, error: { message: 'Expected a comma', line: 3, column: 3 } }));
it('rejects trailing commas', () =>
  expect(formatJson('[1,2,]')).toEqual({ ok: false, error: { message: "Trailing commas aren't allowed in JSON", line: 1, column: 6 } }));
it('rejects comments', () =>
  expect(formatJson('{"a":1 // hi\n}')).toEqual({ ok: false, error: { message: "Comments aren't allowed in JSON", line: 1, column: 8 } }));
it('rejects single quotes', () =>
  expect(formatJson("{'a':1}")).toEqual({ ok: false, error: { message: 'Strings must use double quotes', line: 1, column: 2 } }));
it('rejects unquoted keys', () =>
  expect(formatJson('{a:1}')).toEqual({ ok: false, error: { message: 'Property names must be in double quotes', line: 1, column: 2 } }));
it('formats a ~1 MB document', ...)                             // 20 000 objects, length > 1_000_000 → ok
it('rejects absurd nesting with a clear message', () =>
  expect(formatJson('['.repeat(100_000) + ']'.repeat(100_000))).toEqual({ ok: false, error: { message: 'This is nested too deeply to format', line: 1 } }));
it('allows normal nesting', () =>
  expect(formatJson('['.repeat(MAX_JSON_DEPTH) + ']'.repeat(MAX_JSON_DEPTH)).ok).toBe(true));
it('ignores brackets inside strings when measuring depth', () =>
  expect(formatJson(JSON.stringify({ s: '['.repeat(5000) })).ok).toBe(true));
```
- [ ] **Step 3: Run** `npm test -- formatters/json`. Expected: FAIL.
- [ ] **Step 4: Implement.**
  - **Steps, in order:**
    1. **Depth check:** one scan, skipping string contents including escaped quotes. Over `MAX_JSON_DEPTH` → the nesting error. This always runs first.
    2. **Strict parse:** report only the first error, positioned with `positionAt`.
    3. **Format.**
  - **Error messages,** by code: `ValueExpected` → "Expected a value", `CommaExpected` → "Expected a comma", `ColonExpected` → "Expected a colon", `PropertyNameExpected` → "Property names must be in double quotes", `InvalidCommentToken` → "Comments aren't allowed in JSON", `CloseBraceExpected` → "Expected }", `CloseBracketExpected` → "Expected ]", `EndOfFileExpected` → "Unexpected content after the JSON value", `UnexpectedEndOfString` → "This string never ends", `InvalidSymbol` → "Unexpected character"; anything else → "Invalid JSON".
  - **Overrides:**
    - `ValueExpected` where the last non-space character before the offset is `,` and the character at the offset is `]`/`}` → the trailing-comma message.
    - `InvalidSymbol` followed by `PropertyNameExpected`: at a `'` → "Strings must use double quotes"; otherwise → "Property names must be in double quotes".
  - **Definition:** point `load` at `formatJson`.
- [ ] **Step 5: Run** `npm test`. Expected: PASS, including the JSON contract cases, which now run.
- [ ] **Step 6: Commit** `feat: strict JSON formatter`.

---

### Task 4: YAML

**Files:** Create `src/formats/formatters/yaml.ts`; Modify `definitions/yaml.ts`; Test `tests/formats/formatters/yaml.test.ts`

**Interfaces:** Produces `formatYaml(input: string): FormatResult`.

- [ ] **Step 1:** `npm i yaml@2.9.1`
- [ ] **Step 2: Failing tests**
```ts
it('re-indents to 2 spaces', () => expect(formatYaml('list:\n    - a\n    - b\n')).toEqual({ ok: true, output: 'list:\n  - a\n  - b\n' }));
it('keeps quotes and comments', () =>
  expect(formatYaml("name:   'single'   # comment\nb: \"dq\"\n")).toEqual({ ok: true, output: "name: 'single' # comment\nb: \"dq\"\n" }));
it('keeps long lines unwrapped', ...)                 // 'text: ' + 30 words → unchanged
it('keeps multiple documents', () => expect(formatYaml('a: 1\n---\nb: 2\n')).toEqual({ ok: true, output: 'a: 1\n---\nb: 2\n' }));
it('keeps meaning', ...)                              // parse(output) deep-equals parse(input) using 'yaml'
it('reports the first error with its position', () => expect(formatYaml('a: 1\nc: [1, 2\n')).toMatchObject({ ok: false, error: { line: 3, column: 1 } }));
it('drops the " at line…" suffix from messages', ...) // message doesn't match / at line \d+/
it('reports duplicate keys', () => expect(formatYaml('a: 1\na: 2\n')).toMatchObject({ ok: false, error: { message: 'Map keys must be unique', line: 2 } }));
```
- [ ] **Step 3: Run**. Expected: FAIL.
- [ ] **Step 4: Implement.**
  - `parseAllDocuments(input)`.
  - The first error across documents: message = the first line of `message` with `/ at line \d+, column \d+:?$/` removed; position = `linePos[0]`.
  - Otherwise `docs.map(d => d.toString({ indent: 2, lineWidth: 0 })).join("")`.
  - Point the definition's `load` at it.
- [ ] **Step 5: Run** `npm test`. Expected: PASS (YAML contract runs).
- [ ] **Step 6: Commit** `feat: YAML formatter that keeps quotes and comments`.

---

### Task 5: SQL

**Files:** Create `src/formats/formatters/sql.ts`; Modify `definitions/sql.ts`; Test `tests/formats/formatters/sql.test.ts`

**Interfaces:** Produces `formatSql(input: string, settings: FormatSettings): FormatResult`, which reads `settings.dialect` (default `"sql"`).

- [ ] **Step 1:** `npm i sql-formatter@15.9.0`
- [ ] **Step 2: Failing tests**
```ts
it('formats with uppercase keywords', () =>
  expect(formatSql('select id,name from users where active=1', { dialect: 'sql' })).toEqual({ ok: true, output: 'SELECT\n  id,\n  name\nFROM\n  users\nWHERE\n  active = 1' }));
it('uses the chosen dialect', () => expect(formatSql('select top 5 [id] from dbo.users', { dialect: 'transactsql' }).ok).toBe(true));
it('suggests choosing a dialect when Standard fails', () =>
  expect(formatSql('select [id] from t', { dialect: 'sql' })).toEqual({ ok: false, error: {
    message: 'Unexpected "[id] from " — if this is SQL Server, MySQL or PostgreSQL, pick it in the dialect menu', line: 1, column: 8 } }));
it('explains a query that stops too early, with its position', () =>
  expect(formatSql('select *\nfrom t where (', { dialect: 'postgresql' })).toEqual({ ok: false, error: { message: 'The query ends before it is complete', line: 2, column: 15 } }));
it('does not add the dialect hint for a specific dialect', ...)
```
- [ ] **Step 3: Run**. Expected: FAIL.
- [ ] **Step 4: Implement.**
  - `format(input, { language: dialect, keywordCase: "upper" })`.
  - **On a throw:** take the first line of the message.
    - Line and column come from `/at line (\d+) column (\d+)/` (default line 1).
    - If the line contains `«EOF»`, the message is "The query ends before it is complete".
    - Otherwise strip `Parse error:` / `Parse error at token:` and the ` at line … column ….` part.
    - With dialect `sql`, append ` — if this is SQL Server, MySQL or PostgreSQL, pick it in the dialect menu`.
  - Point the definition's `load` at it.
- [ ] **Step 5: Run** `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: SQL formatter with dialect-aware errors`.

---

### Task 6: XML

**Files:** Create `src/formats/formatters/xml.ts`; Modify `definitions/xml.ts`; Test `tests/formats/formatters/xml.test.ts`

**Interfaces:** Produces `formatXml(input: string): FormatResult`.

- [ ] **Step 1:** `npm i fast-xml-parser@5.12.0 xml-formatter@3.7.0`
- [ ] **Step 2: Failing tests**
```ts
it('indents with 2 spaces', () => expect(formatXml('<a><b x="1">t</b><c/></a>')).toEqual({ ok: true, output: '<a>\n  <b x="1">t</b>\n  <c/>\n</a>' }));
it('leaves mixed content alone', () => expect(formatXml('<p>Hello <b>world</b>, again</p>')).toEqual({ ok: true, output: '<p>Hello <b>world</b>, again</p>' }));
it('keeps meaning', ...)                               // XMLParser({ ignoreAttributes:false, trimValues:true }).parse(output) deep-equals parse(input)
it('keeps the declaration and comments', ...)
it('reports mismatched tags with line and column', () =>
  expect(formatXml('<a>\n  <b></a>')).toEqual({ ok: false, error: { message: "Expected closing tag 'b' (opened in line 2, col 3) instead of closing tag 'a'.", line: 2, column: 6 } }));
it('rejects text that is not XML', () => expect(formatXml('hello').ok).toBe(false));
```
- [ ] **Step 3: Run**. Expected: FAIL.
- [ ] **Step 4: Implement.** Validate first; then `xmlFormatter(input, { indentation: "  ", collapseContent: true, lineSeparator: "\n" })`, with a throw becoming line 1. Point the definition's `load` at it.
- [ ] **Step 5: Run** `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: XML formatter with validation`.

---

### Task 7: Markdown

**Files:** Create `src/formats/formatters/markdown.ts`; Modify `definitions/markdown.ts`; Test `tests/formats/formatters/markdown.test.ts`

**Interfaces:** Produces `formatMarkdown(input: string): Promise<FormatResult>`.

- [ ] **Step 1:** `npm i prettier@3.9.10`
- [ ] **Step 2: Failing tests**
```ts
it('normalizes Markdown', async () =>
  expect(await formatMarkdown('# T\n* one\n* two\n\n__bold__')).toEqual({ ok: true, output: '# T\n\n- one\n- two\n\n**bold**\n' }));
it('keeps links and text', ...)                        // '[a link](https://x.dev)' survives
```
- [ ] **Step 3: Run**. Expected: FAIL.
- [ ] **Step 4: Implement.** Dynamically import `prettier/standalone` and `prettier/plugins/markdown` inside the function. A throw becomes `formatError(firstLine, e.loc?.start?.line ?? 1, e.loc?.start?.column)`. Point the definition's `load` at it.
- [ ] **Step 5: Run** `npm test`. Expected: PASS (the Markdown contract runs its valid and stable cases; the invalid case is skipped because `examples.invalid` is `""`).
- [ ] **Step 6: Commit** `feat: Markdown formatter`.

---

### Task 8: Web Worker and client

**Files:** Create `src/formats/format.worker.ts`, `src/formats/workerClient.ts`; Modify `src/formats/runFormatter.ts`; Test `tests/formats/workerClient.test.ts`, `tests/formats/runFormatter.test.ts`

**Interfaces:**
- `type WorkerRequest = { id: number; format: FormatId; input: string; settings: FormatSettings }`
- `type WorkerResponse = { id: number; result: FormatResult }`
- `interface WorkerLike { postMessage(m: WorkerRequest): void; terminate(): void; onmessage: ((e: { data: WorkerResponse }) => void) | null; onerror: ((e: unknown) => void) | null }`
- `SUPERSEDE_AFTER_MS = 300`, `TIMEOUT_MS = 15_000`
- `createWorkerClient(spawn: () => WorkerLike): { run(format: FormatId, input: string, settings: FormatSettings): Promise<FormatResult>; dispose(): void }`
- `runFormatter` routes by `getFormat(id).runsOn`:
  - `"main"` → `formatInput` on the page;
  - `"worker"` → the client when `typeof Worker !== "undefined"`, else `formatInput` directly.
  - It contains no format names.

- [ ] **Step 1: Failing tests** (a `FakeWorker` that records posts, offers `respond(id, result)` / `crash()` and counts `terminate()`, plus fake timers)
```ts
it('sends the request and resolves with the matching response', ...)
it('spawns the worker lazily, once', ...)
it('keeps a worker that answers quickly', ...)
it('replaces a worker that is busy with an old job', ...)   // run A; +300ms; run B → terminate once, new spawn, B on new worker; A → { ok:false, error:{ message:'Superseded', line:1 } }
it('does not replace a worker that only just started', ...) // +100ms → same worker
it('times out a job that never finishes', ...)              // +15000 → 'Formatting took too long (over 15 seconds)', worker terminated
it('recovers after the worker crashes', ...)                // crash → 'The formatter stopped unexpectedly. Try again.'; next run spawns and works
it('ignores responses for unknown ids', ...)
// runFormatter
it('runs worker formats in the worker when available', ...)
it('falls back to the page when Worker is missing', ...)
it('runs main-thread formats on the page', ...)              // mermaid → formatInput, never the worker
```
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Worker:** `self.onmessage = async ({ data }) => postMessage({ id: data.id, result: await formatInput(data.format, data.input, data.settings) })`.
  - **Client:** keeps a map of pending jobs (`resolve`, `startedAt`, `timer`).
    1. Before posting, if any pending job is at least 300 ms old: terminate the worker, resolve every pending job with "Superseded", and spawn fresh on the next post.
    2. Each job gets a 15 s timer.
    3. `onerror` resolves all pending jobs with the crash message and drops the worker.
  - **`runFormatter`:** a module-level client with `() => new Worker(new URL("./format.worker.ts", import.meta.url), { type: "module" })`.
- [ ] **Step 4: Run** `npm test` and `npm run build`. Expected: all pass; a worker chunk is in `out/_next/static/`.
- [ ] **Step 5: Commit** `feat: format text in a Web Worker`.

---

### Task 9: Mermaid

**Files:** Create `src/formats/formatters/mermaid.ts`; Modify `definitions/mermaid.ts`; Delete `placeholderDiagram` from `echo.ts`; Test `tests/formats/formatters/mermaid.test.ts`

**Interfaces:** Produces `renderMermaid(source: string): Promise<FormatResult>` (the output is SVG) and `mermaidErrorPosition(err: unknown): { line: number; column?: number }`. This is the only formatter allowed to touch `document`; its definition has `runsOn: "main"`.

- [ ] **Step 1:** `npm i mermaid@12.3.0`
- [ ] **Step 2: Failing tests** (`vi.mock("mermaid", …)`)
```ts
it('initializes once with strict security and a dark theme', ...)  // initialize once, objectContaining({ startOnLoad:false, securityLevel:'strict', theme:'dark' })
it('returns the rendered SVG', ...)
it('reports syntax errors with the line from the parser', ...)     // hash.loc { first_line:3, first_column:4 } → line 3, column 5; message = first line
it('falls back to the line in the message', ...)                   // 'Lexical error on line 2. …' → line 2
it('falls back to line 1', ...)
it('cleans up after a failed render', ...)                         // elements #d<id> / #<id> added by the mock are removed
it('uses a fresh element id for each render', ...)
```
- [ ] **Step 3: Run**. Expected: FAIL.
- [ ] **Step 4: Implement.**
  - **Load and initialize:** lazy `import("mermaid")`, initialized once with `{ startOnLoad: false, securityLevel: "strict", theme: "dark", fontFamily: "var(--font-inter), sans-serif", themeVariables: { background: "transparent", primaryColor: "#111111", primaryTextColor: "#ededed", primaryBorderColor: "#3a3a3a", lineColor: "#8f8f8f" } }`.
  - **Render:** `await mermaid.parse(source)`, then `mermaid.render("formatly-mermaid-" + n, source)`. In `finally`, remove `#d<id>` and `#<id>` if they're still attached.
  - **Error position:** `hash.loc.first_line` and `first_column + 1`; else `/line (\d+)/i` in the message; else line 1.
  - **Definition:** point `load` at `renderMermaid`.
- [ ] **Step 5: Run** `npm test`, `npm run build`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: render Mermaid diagrams`.

---

### Task 10: Prove the architecture, verify in the browser, review, PR

**Files:**
- Modify: `docs/architecture.md` (final pass), anything the checks turn up
- Modify: `~/.claude/launch.json`: add `formatly-static` (`npx serve out -l 3101`, cwd `~/formatly`, port 3101)

- [ ] **Step 1: Dry run of "add a format".** On a scratch branch, add a throwaway `csv` format by following only `docs/architecture.md`: a formatter that trims each line, a definition, the list entry and a `FORMAT_UI` entry.
  - Expected: `npm test` passes and runs the CSV contract cases; `/csv` exists with a capsule button and a tagline word.
  - **Count the files you had to touch. It must be exactly 4.** If it's more, fix the architecture and the doc.
  - Delete the scratch branch.
- [ ] **Step 2:** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Expected: all clean.
- [ ] **Step 3:** Serve `out/` and check every format with real input in the browser:
  - **JSON:** minified input expands; missing comma, trailing comma and comment errors show the right message, line and column, with the line highlighted.
  - **YAML:** quotes and comments are kept; a duplicate key is reported.
  - **SQL:** `[id]` under Standard shows the dialect hint and works under SQL Server; the dialect is remembered.
  - **XML:** formats; mixed content is untouched; a mismatched tag is reported.
  - **Markdown:** Preview renders and Source shows the normalized text.
  - **Mermaid:** renders a dark diagram; zoom/pan and SVG/PNG downloads work; a syntax error shows a line with no stray graphics in `<body>`.
- [ ] **Step 4: Lazy loading and privacy.**
  - A fresh `/json` loads no `mermaid`, `prettier`, `sql-formatter` or other-language chunks.
  - `/mermaid` loads `mermaid`.
  - There are no requests to other origins.
- [ ] **Step 5: Responsiveness.**
  - A ~1 MB JSON paste followed by more typing stays smooth.
  - `"[".repeat(100000)` shows the nesting error and the tab stays usable.
- [ ] **Step 6:** Final whole-branch review (fresh reviewer, most capable model), with the Dependency rules and the 4-file promise as explicit review items. Fix Important and Critical findings test-first.
- [ ] **Step 7:** Push `phase-2-formatters` and open a PR with base `phase-1-ui`.
