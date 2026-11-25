# Formatly Polish Plan: finish phase 2, then Markdown colors, full-width expand, resizable input, per-format "About" text

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status: APPROVED 2026-11-07. Part A is done (PR #12). Part B is being built on `phase-3-polish`.**

## Decisions from the mockup review (2026-11-07) — these override the older text below

- **Text below the tool is ONE shared text for the whole site, not per format.** Layout A (one centered column). Task B4 below is replaced by B4 (shared text, `src/content/site-about.ts` + `SiteAbout` component; nothing in format definitions) and B4b (the intro). The "add a format = 4 files" promise is untouched because no copy lives in definitions.
- **Intro above the panes: variant 5a** ("Paste anything. Get it formatted." + three icon facts + a looping before/after demo). Same on every format, no buttons. It shrinks to one line ("Paste. Format. Done. · Runs entirely in your browser, nothing is uploaded.") when the current format's input is not empty, and returns when it is empty. Hidden while the output is expanded. Phones: the demo is hidden.
- Everything else (Markdown colours, full-width expand, draggable/collapsible input) is built as written in B1–B3.
- Copy may only state what the product does: nothing is uploaded; errors give line and column; big pastes are handled off the main thread; six formats; no accounts; settings and layout are remembered, pasted text is not.


**Goal:** (A) close out phase 2 properly; (B) act on the owner's feedback: professional text at the end of each page, colorful-enough Markdown, an expanded output that really uses the full width, and an input pane that can be dragged narrower or collapsed.

**Architecture:** Everything stays generic. Per-format text lives in each format's definition file (so "add a format = 4 files" still holds). The split pane is one generic component driven by a small pure-logic module. Layout preferences are stored like the existing ones (safe storage, sanitized on read).

**Tech Stack:** unchanged (Next.js 16 static export, React 19, CodeMirror 6, Tailwind 4, Vitest 5). No new dependencies.

**Specs and context:** `docs/superpowers/specs/2026-11-04-formatter-design.md`, `docs/architecture.md`, ledger `.superpowers/sdd/2026-11-04-phase2-formatters/progress.md`.

---

## What the owner asked for, and how I read it

| # | Owner said | My reading | Confidence |
|---|---|---|---|
| 1 | "I don't like the text we are keeping in the end: not good, not professional, not UI pleasing" (then pasted an example: a "Mermaid diagram viewer" title, intro, "What it does" bullets, "Questions" with answers) | The page currently ends abruptly after the two panes, with no explanatory text. The owner wants a professional section at the end of every format page, written like the pasted example. | **Medium. Please confirm.** I checked the app: that text exists nowhere in it, and the page has nothing below the tool. |
| 2 | "in md we are not using colour… just use one colour if you want" | Markdown *source* (input and output "Source" view) is plain grey except headings. Use one accent color plus bold/italic, and dim the punctuation marks. | High (confirmed in the browser) |
| 3 | "when I am extending to full screen for preview it should cover complete width" | Expanded output currently starts 84px from the left (space reserved for the format capsule) and ends 18px from the right. It should be symmetric and use the full width. | High (measured: output spans 84px → 1006px of 1024px) |
| 4 | "left part can be adjustable and collapsible, like drop and decrease the width" | A draggable divider between Input and Output, plus a way to collapse the Input pane. | High |

Assumptions I'm making (tell me if any is wrong):
- **A1.** "The text at the end" = the explanatory text below the tool, not the typewriter tagline in the top bar. (The tagline briefly shows a bare "format your" while it erases a word; I'll leave it alone unless you say it's the one you meant.)
- **A2.** "Expanded" keeps the top bar, hides the format capsule and the input, and gives the output equal side margins. It is not a browser-fullscreen mode.
- **A3.** Markdown colors apply to the **Source** view and the input. The rendered **Preview** gets small accents in the same color.
- **A4.** Resizing is desktop-only (≥768px). On phones the panes stay stacked.

## Facts checked before planning

- Markdown highlighting: the parser already emits tags for bold (`strong`), italic (`emphasis`), URLs (`url`), inline code (`monospace`), quotes (`quote`) and the punctuation marks (`processingInstruction`: `#`, `**`, `-`, `>`, backticks). Our highlight style styles none of them. That is the whole reason it looks grey. (`node_modules/@lezer/markdown/dist/index.js:2008-2014`)
- CodeMirror re-measures itself when its container resizes (it has a `ResizeObserver`), so dragging a divider needs no extra work for the editors.
- Current layout: `src/components/Workbench.tsx` pads the panes by 84px (capsule closed) or 196px (open) on the left, in every mode, including expanded.
- The page is exactly viewport height (`h-dvh`), so there is nowhere for text "at the end" to live yet.
- Phase 2's final review was stopped before reporting. Two Important issues are known (see Part A).

## Sequence and branches

1. **Part A on `phase-2-formatters`:** fix the two known issues, run the final review, open the phase 2 PR (base `phase-1-ui`).
2. **Part B on a new branch `phase-3-polish`** cut from `phase-2-formatters` (stacked PR, base `phase-2-formatters`), so the formatter work and the look-and-feel work stay separately reviewable. Part B starts with a **mockup** you pick from, as for every UI decision so far.

## Global Constraints (carried over, plus new)

- The UI never branches on a format id; per-format data comes from the definition or `format-ui.ts`. Adding a format stays a 4-file change, **including its tests and its "About" text** (Task A2 makes the tests honor this).
- Dark theme only; honor `prefers-reduced-motion` (no width animations then).
- Nothing pasted is stored or sent anywhere. Layout preferences are the only new thing stored.
- Every stored value is read through `src/lib/storage.ts` and sanitized (unknown/corrupt → defaults).
- **Page text may only claim what the product really does.** Each sentence is tied to a test or a check in the claims table (Task B4).
- All existing tests keep passing. Commits end with the attribution line the session specifies.

## Review Focus

1. **Dragging the divider while text is selected or an editor is focused:** no accidental text selection, and releasing the mouse outside the window or tab still ends the drag. (Task B3)
2. **Corrupt or out-of-range stored layout** (`{"inputFraction":9}`, `NaN`, invalid JSON): falls back to the default without crashing. (Task B3)
3. **A window just wider than 768px:** both panes stay usable (240px minimum each) or the layout falls back sensibly; nothing overlaps the format capsule. (Task B3)
4. **Expand → exit:** the previous split and collapsed state come back, the capsule returns, Esc still works from inside editors and not from inside the Shortcuts dialog. (Task B2)
5. **Phones:** the new text is reachable by normal page scrolling (no nested scroll area trapping it) and is not hidden behind the floating format bar. (Task B4)

---

# Part A: finish phase 2 (branch `phase-2-formatters`)

### Task A1: JSON trailing comma inside an object

**Files:** Modify `src/formats/formatters/json.ts`; Test `tests/formats/formatters/json.test.ts`

**Interfaces:** none new.

- [ ] **Step 1: Failing tests**
```ts
it('names a trailing comma in an object', () =>
  expect(formatJson('{"a": 1,}')).toEqual({ ok: false, error: { message: "Trailing commas aren't allowed in JSON", line: 1, column: 9 } }));
it('names a trailing comma in a nested object', () =>
  expect(formatJson('[1,{"a":{"b":1,},"c":2}]')).toMatchObject({ ok: false, error: { message: "Trailing commas aren't allowed in JSON" } }));
it('still says unquoted key for {a:1}', () =>
  expect(formatJson('{a:1}')).toMatchObject({ ok: false, error: { message: 'Property names must be in double quotes', column: 2 } }));
it('does not call a missing key after a comma a trailing comma', () =>
  expect(formatJson('{"a":1,,"b":2}')).toMatchObject({ ok: false }));   // keep whatever message the library gives; just never "Trailing"
```
- [ ] **Step 2:** Run `npm test -- formatters/json`. Expected: the first two FAIL (message is "Property names must be in double quotes").
- [ ] **Step 3: Implement.** Extend the existing trailing-comma override: when the code is `PropertyNameExpected` **and** the last non-space character before the offset is `,` **and** the character at the offset is `}`, return the trailing-comma message. One shared helper for the array and object cases.
- [ ] **Step 4:** Run the JSON tests and the contract tests. Expected: PASS.
- [ ] **Step 5: Commit** `fix: name trailing commas inside JSON objects`.

### Task A2: tests must not pin the list of formats

**Files:** Modify `tests/formats/registry.test.ts`, `tests/components/FormatRail.test.tsx`, `tests/components/TopBar.test.tsx`, `tests/state/WorkbenchContext.test.tsx`, `tests/components/RootRedirect.test.tsx`

**Goal:** adding a format changes **no** existing test.

- [ ] **Step 1: Write the acceptance test first** (it is the dry run, automated): `tests/architecture.test.ts` gets `'adding a format does not require editing other tests'` — temporarily it can't add files, so instead add a lint-style check: no test file other than `tests/formats/registry.test.ts` contains a literal array of three or more format ids, and no test uses a real format id as its "unknown id". (Regex over `tests/**`; allow-list the files that legitimately name one format, e.g. `json.test.ts`.) Run it: expected FAIL, listing the five files.
- [ ] **Step 2: Change the tests:**
  - `registry.test.ts`: assert *properties* (unique ids/glyphs/extensions, `.` not in extensions, every `runsOn: "main"` format has `output: "diagram"`, order is stable) and keep one `SHIPPED_FORMATS` expectation as a **subset** check (`expect(ids).toEqual(expect.arrayContaining([...]))`).
  - `FormatRail.test.tsx`: derive expected hrefs from `FORMATS.map(f => "/" + f.id)`.
  - `TopBar.test.tsx`: derive the tagline sentence from `FORMATS`.
  - `WorkbenchContext.test.tsx`: derive the empty-inputs object from `FORMATS`.
  - `RootRedirect.test.tsx`: use `"not-a-format"` for unknown values.
- [ ] **Step 3:** Run `npm test`. Expected: PASS.
- [ ] **Step 4: Prove it.** On a scratch branch add the throwaway `csv` format from the architecture guide, run `npm test`, expect **0 failures**, record the file list (must be exactly the 4 app files), delete the branch.
- [ ] **Step 5: Commit** `test: adding a format no longer breaks unrelated tests`.

### Task A3: final review, fix pass, PR

- [ ] **Step 1:** Re-dispatch the final whole-branch review (most capable model) with the package already built at `.superpowers/sdd/2026-11-04-phase2-formatters/review-ec63582..HEAD`. Give it the Review Focus from the phase 2 plan and the ledger's deferred minors for triage.
- [ ] **Step 2:** One fix wave for everything Important/Critical, then one scoped re-review.
- [ ] **Step 3:** Push and open the PR into `phase-1-ui`. List every ruling made during phase 2 in the PR description.

---

# Part B: polish (branch `phase-3-polish`)

### Task B0: mockup first

One HTML page with working interactions so you choose before anything is built: (1) the draggable divider with a collapsed-input rail, (2) expanded output at full width, (3) the end-of-page text section below the fold with real draft copy for two formats, (4) Markdown source in the proposed colors next to today's. **Exit criteria:** you say which variant of each you want. No source changes in this task.

### Task B1: Markdown colors (one accent)

**Files:** Create `src/components/editor-theme.ts` (move the highlight style and theme out of `CodeEditor.tsx`); Modify `src/components/CodeEditor.tsx`, `src/app/globals.css`; Test `tests/components/editor-theme.test.ts`, `tests/components/CodeEditor.test.tsx`

**Design:** one accent color, the site blue (`#7dd3fc`), plus weight and style.

| Markdown piece | Look |
|---|---|
| Headings (`heading`) | accent, bold |
| `**strong**` | bright text, bold |
| `*emphasis*` | bright text, italic |
| Links and URLs (`link`, `url`) | accent; URL part dimmer |
| `` `inline code` `` (`monospace`) | accent |
| Quote text (`quote`) | muted italic |
| Marks: `#`, `**`, `-`, `>`, backticks, table pipes (`processingInstruction`) | dim grey (same as punctuation elsewhere) |
| Rule `---` (`contentSeparator`) | dim grey |

Preview (rendered) gets three small accents in the same blue: list bullets (`li::marker`), the blockquote left rule, and inline-code text.

**Interfaces:** `export const highlightStyle: HighlightStyle` and `export const editorTheme: Extension` from `editor-theme.ts`; `CodeEditor` imports them. No behavior change for other languages (tags that don't occur aren't styled).

- [ ] **Step 1: Failing tests**
```ts
// editor-theme.test.ts
const covered = [tags.heading1, tags.strong, tags.emphasis, tags.url, tags.link, tags.monospace, tags.quote, tags.processingInstruction, tags.contentSeparator];
it.each(covered)('styles the Markdown tag %s', (tag) => expect(highlightStyle.style([tag])).not.toBeNull());
it('uses different looks for strong and plain text', () => expect(highlightStyle.style([tags.strong])).not.toBe(highlightStyle.style([tags.content])));
// CodeEditor.test.tsx
it('marks Markdown bold and heading text with highlight classes', () => { /* render formatId markdown, value '# T\n**b**'; the heading and bold spans carry a class; plain paragraph text does not */ });
```
- [ ] **Step 2:** Run. Expected: FAIL (`strong` etc. return null today).
- [ ] **Step 3: Implement** the table above in `editor-theme.ts`; keep the existing JSON/YAML/SQL/XML colors untouched.
- [ ] **Step 4:** Add the three preview accents to `.md-preview` in `globals.css`.
- [ ] **Step 5:** `npm test`, lint, tsc. Browser check: paste the Markdown sample from this session; compare with a screenshot of today's grey source. Expected: headings, bold, italic, links and code distinguishable at a glance, marks dimmed.
- [ ] **Step 6: Commit** `feat: Markdown source gets one accent color and emphasis styles`.

### Task B2: expanded output covers the full width

**Files:** Modify `src/components/Workbench.tsx`, `src/components/FormatRail.tsx`; Test `tests/components/Workbench.test.tsx`

**Behavior:** when expanded, the capsule is not rendered, the input is hidden, and the panes area has equal left/right padding (the same 18px as the other three sides). The top bar stays. Exit with the ⤢ button or Esc (unchanged). Entering and leaving must not lose the input text or the split layout (Task B3).

**Interfaces:** `FormatRail` gets an optional `hidden?: boolean` (renders nothing when true).

- [ ] **Step 1: Failing tests**
```ts
it('hides the format capsule while the output is expanded', async () => { /* expand → queryByRole('navigation',{name:'Formats'}) is null; exit → present */ });
it('uses equal side padding when expanded', async () => { /* main has md:pl-[18px] when expanded, md:pl-[84px] or [196px] otherwise */ });
```
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** (`hidden` prop on `FormatRail`; the padding class depends on `outputExpanded`).
- [ ] **Step 4:** Browser check at 1280px: the expanded output's left and right edges are the same distance from the viewport edges (measure `getBoundingClientRect`).
- [ ] **Step 5: Commit** `feat: expanded output uses the full width`.

### Task B3: draggable, collapsible input pane

**Files:**
- Create: `src/lib/split.ts`, `src/components/SplitView.tsx`
- Modify: `src/lib/storage.ts` (add `layout` key), `src/state/WorkbenchContext.tsx` (`layout`, `setLayout`), `src/components/Workbench.tsx`, `src/components/InputPane.tsx` (collapse button + collapsed rail)
- Test: `tests/lib/split.test.ts`, `tests/components/SplitView.test.tsx`, additions to `tests/state/WorkbenchContext.test.tsx`, `tests/components/Workbench.test.tsx`

**Interfaces (`src/lib/split.ts`, pure and framework-free):**
```ts
export interface SplitLayout { inputFraction: number; inputCollapsed: boolean }
export const DEFAULT_LAYOUT: SplitLayout = { inputFraction: 0.5, inputCollapsed: false };
export const MIN_PANE_PX = 240;      // each pane keeps at least this width
export const RAIL_PX = 44;           // width of the collapsed input rail
export const DIVIDER_PX = 12;        // drag handle width (1px line inside)
export function clampFraction(fraction: number, containerPx: number): number;      // both panes ≥ MIN_PANE_PX; 0.5 if the container is too small
export function fractionFromPointer(clientX: number, rect: { left: number; width: number }): number;
export function shouldCollapse(rawFraction: number, containerPx: number): boolean; // dragged more than 60px past the minimum
export function nudge(fraction: number, direction: -1 | 1, big: boolean): number;  // arrow keys: 2%, with Shift 10%
export function sanitizeLayout(raw: unknown): SplitLayout;                         // accepts only finite numbers 0.1–0.9 and booleans
```
`STORAGE_KEYS.layout = "formatly:layout"` (JSON). Context: `layout: SplitLayout; setLayout(next: SplitLayout): void` (persists). It lives in context, not in the page, because the page remounts on every format switch.

**Component (`SplitView`):** props `{ left, right, layout, onLayoutChange, leftHidden }`. Desktop grid `[left] 12px [right]`; the left column is `inputFraction` of the free width, or `RAIL_PX` when collapsed, or absent when `leftHidden`. Below 768px it renders left and right stacked with no divider.

**Behavior:**
- Drag with pointer capture; while dragging, update a CSS variable on the container (no React re-render per mouse move), disable text selection, and commit to state and storage on release or cancel.
- Divider is `role="separator"`, `aria-orientation="vertical"`, focusable, `aria-valuenow/min/max` in percent; ←/→ nudge (Shift = big); Home/End jump to min/max; **Enter or Space toggles collapse**; double-click resets to 50/50.
- Dragging more than 60px past the minimum collapses the input; clicking the rail's button (or the divider) expands it back to the last width.
- Input header gets a collapse button (`aria-label="Collapse input"`, `aria-expanded`). The collapsed rail shows the format name vertically and an "Expand input" button.
- Reduced motion: no width transitions.

- [ ] **Step 1: Failing tests, pure logic first**
```ts
it('clampFraction keeps both panes at least 240px', () => expect(clampFraction(0.05, 1000)).toBeCloseTo(0.24));
it('clampFraction falls back to 0.5 when the container is too small', () => expect(clampFraction(0.2, 400)).toBe(0.5));
it('fractionFromPointer maps the pointer to a fraction', () => expect(fractionFromPointer(300, { left: 100, width: 800 })).toBeCloseTo(0.25));
it('shouldCollapse only far past the minimum', ...);
it('nudge moves 2% or 10% and clamps to 0.1–0.9', ...);
it('sanitizeLayout ignores NaN, strings, out-of-range numbers and bad JSON shapes', () => {
  expect(sanitizeLayout({ inputFraction: 9, inputCollapsed: 'yes' })).toEqual(DEFAULT_LAYOUT);
  expect(sanitizeLayout({ inputFraction: 0.3, inputCollapsed: true })).toEqual({ inputFraction: 0.3, inputCollapsed: true });
});
```
- [ ] **Step 2: Failing tests, component and state**
```ts
// SplitView.test.tsx (fake pointer events; jsdom has no layout, so give the container a mocked getBoundingClientRect)
it('dragging the divider updates the layout on release', ...);
it('does not commit anything while dragging, only on release', ...);       // onLayoutChange called once
it('a cancelled drag also ends cleanly', ...);                             // pointercancel
it('arrow keys, Shift+arrow, Home and End move the divider', ...);
it('Enter toggles collapse and double-click resets', ...);
it('exposes separator semantics', () => { /* role, orientation, aria-valuenow */ });
it('shows no divider when stacked (below md)', ...);                        // class assertion
// WorkbenchContext.test.tsx
it('restores a stored layout and ignores a corrupt one', ...);
it('persists layout changes under formatly:layout', ...);
// Workbench.test.tsx
it('collapsing the input shows a rail with an Expand input button', ...);
it('exiting expanded output restores the previous split', ...);
```
- [ ] **Step 3:** Run. Expected: FAIL (modules missing).
- [ ] **Step 4: Implement** `split.ts` → context/storage → `SplitView` → wire into `Workbench` and `InputPane`. Remove the old fixed two-column grid class.
- [ ] **Step 5:** Run `npm test`, lint, tsc, build. Expected: PASS.
- [ ] **Step 6: Browser check (real mouse):** drag from 50% to 30% and 70%; release outside the window; drag past the minimum to collapse; reload (layout restored); keyboard operation; an editor with a text selection while dragging; 1 MB JSON while dragging stays smooth; resize the window to ~800px.
- [ ] **Step 7: Commit** `feat: draggable and collapsible input pane`.

### Task B4: professional text at the end of every page

**Files:**
- Modify: `src/formats/types.ts` (`FormatAbout`, `FormatDefinition.about`), all six `src/formats/definitions/*.ts`, `src/app/layout.tsx` and `src/app/[format]/page.tsx` (page scrolls; tool area is viewport height; text below), `src/components/Workbench.tsx` (phone: the tool grows with the page instead of scrolling inside itself), `src/app/globals.css`
- Create: `src/formats/commonFaq.ts`, `src/components/FormatAbout.tsx`
- Test: `tests/components/FormatAbout.test.tsx`, additions to `tests/formats/registry.test.ts` and `tests/architecture.test.ts`

**Interfaces:**
```ts
export interface FormatAbout {
  title: string;                       // e.g. "Mermaid diagram viewer"
  intro: string;                       // 1–2 sentences
  features: readonly string[];         // "What it does": 4–6 short bullets
  questions: readonly { question: string; answer: string }[];   // format-specific questions; shared ones are added automatically
}
// commonFaq.ts
export const COMMON_QUESTIONS: readonly { question: string; answer: string }[];   // privacy, "does it change my data?"-style answers true for every format
```
`FormatAbout` (component) renders: `<h2>` title, intro, `<h3>What it does</h3>` + list, `<h3>Questions</h3>` + one block per question (question as `<h4>`, answer as text), in a centered column (max ~42rem), muted text, hairline separators, same look as the panes. It is rendered by the server page for every `[format]` route, so it is plain HTML in the static export (also good for search). The page `<title>` and meta description come from `about.title` and `about.intro`.

**Layout:** the tool area is `calc(100dvh - top bar)` tall on desktop (what you see today); the text sits directly below it. It is hidden while the output is expanded. On phones the tool takes its natural height (no inner scroll) so one page scroll reaches the text, with enough bottom padding to clear the floating format bar.

**Claims table (every sentence must pass before it ships):**

| Claim in the copy | How it is backed |
|---|---|
| "Runs in your browser; what you paste is not sent anywhere" | verified: single origin in the network list (done in phase 2); test that no `fetch`/`XMLHttpRequest` exists in `src/formats/**` |
| "What you paste isn't stored; it's gone when you close the tab" | existing test "never writes input text to storage" |
| "Syntax errors give the line, and the line is highlighted" | existing tests (error line mark; per-formatter error positions) |
| "Zoom with wheel/buttons, drag to pan, fit; download SVG or PNG" | existing DiagramView/OutputActions tests |
| "Strict JSON: rejects comments, trailing commas, single quotes" | existing JSON tests (+ Task A1) |
| "Keeps big numbers exact (e.g. 12345678901234567890123)" | existing JSON test |
| "Handles about 1 MB without freezing" | measured in phase 2 (1 MB in ~1.5 s, ≤105 ms stall); keep the number out of the copy unless a test pins it |
| Mermaid size limits ("50,000 characters, 500 connections") | **not verified.** Check how Mermaid 12 reports it; add a test for the message or drop the question |
| "A strict Content Security Policy blocks other requests" (from your example) | **not true today** (no CSP). Not used. See optional follow-up below. |

**Draft copy (for review; the other four formats follow the same shape in the mockup):**

*Mermaid diagram viewer.* "Type or paste Mermaid and the diagram is drawn as you go. Syntax errors point at the line, and the finished diagram can be zoomed, panned and downloaded." **What it does:** live preview of flowcharts, sequence diagrams and the other Mermaid diagram types; syntax errors give the line, and the line is highlighted; zoom with the wheel or buttons, drag to pan, fit to view; download as SVG or PNG; drawn in Mermaid's strict security mode. **Questions:** Is my data sent to a server? / Can I use the diagram elsewhere? (+ the size-limit question only if verified)

*JSON formatter and validator.* "Paste JSON to get it indented and checked. Errors name the line and column." **What it does:** expands minified JSON with two-space indentation; keeps every number exactly as written, including very large ones; strict validation, so comments, trailing commas, single quotes and unquoted keys are reported; handles large pastes without freezing the page. **Questions:** Does formatting change my data? (No: only whitespace.) / Why does it reject comments? (Standard JSON doesn't allow them.) / Is my data sent to a server?

- [ ] **Step 1: Failing tests**
```ts
it('every definition has an about section with a title, intro, at least 3 features and at least 1 question', () => { for (const f of FORMATS) {...} });
it('titles are unique', ...);
it('FormatAbout renders a heading, the features and every question including the shared ones', ...);
it('uses real headings (h2, h3, h4) in order', ...);
it('Workbench is not followed by the text while the output is expanded', ...);
it('definitions stay the only place that names formats in copy', ...);           // architecture test: FormatAbout.tsx has no format ids
it('src/formats has no network calls', () => { /* grep src/formats for fetch( / XMLHttpRequest / WebSocket / sendBeacon */ });
```
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** types → copy for all six definitions (reviewed against the claims table) → `commonFaq.ts` → `FormatAbout` → page and layout changes.
- [ ] **Step 4:** `npm test`, lint, tsc, build. Browser check at 1280px (text below the fold, tool area unchanged in size), at 375px (one continuous scroll, nothing hidden behind the format bar), and with the output expanded (text hidden).
- [ ] **Step 5: Commit** `feat: per-format About text below every tool`.

### Task B5: final checks and PR

- [ ] Full command suite, a real-browser pass over all three features on all six formats, one final fresh-reviewer pass over the whole `phase-3-polish` branch (Review Focus above), one fix wave, then a PR with base `phase-2-formatters`.

---

## Optional follow-ups (not in this plan unless you say so)

- **A real Content Security Policy** (only same-site connections), so the claim "nothing is sent anywhere" is enforced by the browser and not only true by construction. Needs care: Next's inline scripts, the format worker, and Markdown's opt-in "Load image" all interact with it. Worth its own small plan.
- **Auto-refit of Mermaid diagrams** after the pane is dragged or expanded (today the **Fit** button does it).
- **Syntax highlighting inside Markdown code fences** (JSON/SQL blocks in the source view).
- **Top-bar tagline** that never shows a bare "format your" while erasing.

## Self-review against the requests

| Request | Covered by |
|---|---|
| Professional text at the end | B4 (assumes A1; mockup B0 confirms) |
| Markdown colors | B1 |
| Expanded output covers the full width | B2 |
| Left part adjustable and collapsible | B3 |
| "Plan thoroughly first" | this document; nothing is built until you approve it |
