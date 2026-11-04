# Formatter Website: Design

Date: 2026-11-04
Status: Draft, waiting for approval

## 1. Intent

One website that has all the common code and data formatters in one place. Other formatter sites aren't the problem; they work fine. The problem is that each format has its own site, and you have to remember which one to use. This site is the single place you go: pick a format, paste, and get a clean result.

The site **formats**. It never **converts**. If you paste JSON and pick JSON, you get prettified JSON back. JSON is never turned into YAML or XML.

## 2. Goals

- One site that covers the everyday formats: JSON, YAML, Mermaid, XML, SQL, Markdown.
- A layout that is the same for every format: format list on the left, input pane, output pane.
- The output updates live as the user types or pastes. There is no Format button.
- Broken input shows a clear error that names the line, instead of an empty or stale output.
- An elegant, modern dark look: a Next.js/Vercel-style grid background that fades out at the edges.
- Everything runs in the browser. Whatever the user pastes never leaves their machine.

## 3. Non-goals (v1)

- Converting between formats (JSON → YAML, etc.).
- User accounts, saved snippets, share links, history.
- A backend or API. The site is static.
- Formatting options beyond sensible defaults (indent size, quote style, key sorting). *(my call; see section 9)*
- A light theme. *(my call)*

## 4. Anti-goals: these would make it a failure even if it technically works

- Sending what people paste to a server, or to analytics. Privacy is part of why a single trusted tool is worth using.
- A cluttered, ad-heavy, or tool-sprawl look like many existing formatter sites. The look is the point.
- Output silently changing data. Formatting must keep the **meaning** the same: values, key order, and content stay the same. Style normalization that a mainstream formatter does is fine, for example Prettier writing Markdown list markers as `-`, or SQL keywords in uppercase. Tests check that the input and the output parse to the same thing wherever a parser exists (JSON, YAML, XML). *(my call: the strict "whitespace only" reading would rule out Prettier for Markdown)*
- Each format feeling like a different app. They all share one layout and behave the same way.

## 5. Layout (decided: option B)

The user compared three layouts and chose **B: a format list in a side rail**. A reference mockup of B is in `layout-b-mockup.html`, next to this file. Open it in a browser.

```
┌────────────────────────────────────────────────────────────────────┐
│ ▣ formatly                                      Shortcuts  GitHub   │  top bar
├──────────┬─────────────────────────────────────────────────────────┤
│ FORMATS  │ ┌─ Input · JSON ──── Clear ─┐ ┌─ Output ── ● Valid  Copy ─┐ │
│ {} JSON ◀│ │                           │ │                           │ │
│ -- YAML  │ │  pasted text              │ │  formatted result         │ │
│ -> Mermaid│ │                           │ │  (or rendered diagram)    │ │
│ <> XML   │ │                           │ │                           │ │
│ SQL SQL  │ │                           │ │                           │ │
│ #  Markdown│└───────────────────────────┘ └───────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────────┘
          grid background shows through behind everything
```

**Top bar:** small logo mark and name on the left, a couple of quiet links on the right (Shortcuts, GitHub). It is slightly see-through and blurred over the grid.

**Side rail (left, about 150px):** a small uppercase "FORMATS" label, then one row per format. Each row has a small monospace glyph (`{ }`, `---`, `->`, `</>`, `SQL`, `#`) and the format name. The selected row has a slightly lighter background and a colored glyph.

**Two panes, side by side and equal width:**
- **Input pane.** The header says "Input · <FORMAT>" and has a Clear button. The body is an editable code area with line numbers and syntax highlighting.
- **Output pane.** The header says "Output", shows a status (green dot and "Valid", or red and the error), and has the actions (section 6). The body is read-only highlighted code, or the rendered diagram for Mermaid.

**Visual style:**
- Near-black background (`#0a0a0a`) with a thin grid (lines `rgba(255,255,255,.055)`, cells about 44px). A radial fade lets the grid show most at the top center and fade into the background at the edges.
- Panes are dark (`#111`, slightly see-through) with 1px borders (`#232323`), about 10px corner radius, and a slight blur over the grid.
- Fonts: Inter for the UI, JetBrains Mono for code.
- Syntax colors: keys in light blue, strings in mint, numbers and booleans in amber, punctuation in grey.
- Restraint over decoration. No gradients on panes and no colored accents beyond status and syntax.

**Added after phase 1 (decided by the owner):**
- **Interactive background.** The grid is a "kinetic grid": it bends toward the pointer and ripples on clicks on empty background. It only animates while something moves, pauses in hidden tabs, and stays still for reduced-motion users. The static CSS grid stays underneath as the no-JS fallback.
- **See-through top bar.** No tint or blur, just the bottom hairline, so the grid runs under it.
- **Format capsule (replaces the full-height sidebar).** The format menu is a floating capsule over the grid, vertically centered on the left. Closed (the default): a 50px capsule of format symbols, the selected one filled white, and a name pill appears beside a symbol on hover or keyboard focus. Open: the same capsule widens to 164px and shows each symbol with its name. A button at the top of the capsule or ⌘/Ctrl + \ toggles it, and the choice is remembered (`formatly:railCollapsed`). The panes make room for the capsule instead of being covered. Phones: the capsule is a floating bar at the bottom of the screen, symbols only.

**Reading the output (decided by the owner):**
- **Expand.** A button in the output header makes the output fill the workspace and hides the input (kept mounted, so nothing is lost). Esc or the same button returns. Works for every format.
- **Mermaid zoom and pan.** Zoom out / 100% / zoom in / fit controls in the diagram's corner, wheel to zoom around the cursor, drag to pan. Diagrams open fitted to the pane but never above 100%.
- **Markdown Preview | Source.** Markdown output defaults to a rendered **Preview**; **Source** shows the formatted Markdown text. Copy and Download always use the source, so the tool still formats rather than converts. In the preview, raw HTML is not rendered, links open in a new tab without a referrer, and **remote images are blocked** until the user clicks "Load image" (then loaded with no referrer), because fetching them would tell a third-party server the content was opened. Inline `data:` images show directly.

**Name:** "formatly" is a placeholder I used in the mockup, not a decision. *(my call to use it until the user picks a name)*

## 6. Behaviour

### Picking a format
- Clicking a format in the rail switches the input language, the highlighting, and the formatter.
- Each format has its own URL: `/json`, `/yaml`, `/mermaid`, `/xml`, `/sql`, `/markdown`. `/` goes to the last used format, or JSON the first time. *(my call: makes formats linkable and findable in search)*
- The input text is kept per format while the tab is open, so switching from JSON to YAML and back doesn't lose the JSON. *(my call)*
- The last used format is remembered across visits (browser storage). Pasted content is **not** saved across visits. *(my call: privacy)*

### Live formatting
- The output updates automatically shortly after the user stops typing or pastes. A short pause of a few hundred ms is fine.
- Empty input gives an empty output with a soft hint ("Paste JSON on the left"), not an error.

### Errors
- If the input can't be parsed, the output pane shows the error message and the **line (and column where available)**. The status in the header turns red.
- The bad line is highlighted in the input pane.
- The last good output is replaced by the error and is not kept around, so nobody copies a stale result by mistake. *(my call)*

### Output actions
- **Text formats** (JSON, YAML, XML, SQL, Markdown): **Copy** (copies the formatted text and briefly shows "Copied") and **Download** (saves a file with the right extension: `.json`, `.yaml`, `.xml`, `.sql`, `.md`).
- **Mermaid:** the output is the **rendered diagram**, not tidied Mermaid code (confirmed by the user). Actions are **Download SVG** and **Download PNG**. *(my call: which image formats)* The diagram should fit the pane and allow scrolling/zooming if it's large. *(builder decides how)*

### Per-format behaviour (defaults)

| Format | Output | Defaults |
|---|---|---|
| JSON | Pretty-printed JSON | 2-space indent, key order kept, **strict** checking (see below) |
| YAML | Re-indented YAML | 2-space indent, original quote style kept, comments kept where the formatter allows |
| Mermaid | Rendered diagram | Dark diagram theme to match the site |
| XML | Pretty-printed XML | 2-space indent; whitespace inside mixed content (text next to elements) is left alone |
| SQL | Formatted SQL | Uppercase keywords; dialect picker (see below) |
| Markdown | Normalized Markdown | Prettier's Markdown defaults |

*(The defaults in this table are my calls.)*

**JSON is strict.** People use a JSON formatter to check their JSON, so "Valid" must mean real JSON. Comments, trailing commas, single quotes, and unquoted keys are errors, reported with the line and column. Big numbers must keep their exact digits; don't round-trip them through `JSON.parse`. JSONC support (for files like `tsconfig.json`) is a "later" item. *(my call)*

**SQL dialect picker.** A single "standard SQL" setting rejects a lot of real queries: SQL Server `[brackets]`, `@vars` and `TOP`, MySQL backticks, Postgres `$1` and `::`. So the SQL input header gets one small dropdown: Standard, SQL Server, PostgreSQL, MySQL. The default is Standard, and the last choice is remembered. This is the only per-format setting in v1. *(my call)*

### Keyboard
- `⌘/Ctrl + Shift + C` copies the output. A Shortcuts link in the top bar lists the shortcuts. *(my call; the builder can adjust the exact keys)*

## 7. Constraints

- **Client-side only.** No server code touches user content. The site must work as a static deployment.
- **No tracking of content.** If analytics is ever added, it records page views only, never input or output.
- **Performance.** Pasting a large file (around 1 MB of JSON) must not freeze the page. If formatting is slow, it must not block typing.
- **Responsive.** It must be usable on a phone. Below tablet width, the side rail becomes a horizontal scrollable row of format pills under the top bar, and the panes stack (input above output). *(my call on the exact mobile layout)*
- **Who builds it:** Claude builds it and the owner reviews (decided by the owner). Set up the final structure from the start: Web Worker and per-format lazy loading are in place from day one, not added later. The owner is a C#/.NET backend developer learning modern frontend by reviewing, so code should be plain and readable over clever, with a clear folder structure.

## 8. How it gets made (decided in conversation)

- **Framework:** Next.js with TypeScript and Tailwind CSS. *(proposed by me; the user didn't object)*
- **Hosting:** Vercel (free tier). *(proposed by me)*
- **Formatting libraries** *(proposed by me; the builder may swap one if it turns out unsuitable)*:
  - Prettier (standalone, in the browser) for JSON, YAML, Markdown
  - `sql-formatter` for SQL
  - an XML pretty-printing library for XML
  - `mermaid` for rendering diagrams
- **Project location:** `~/formatly`.

## 9. Left to the builder

- The code editor component (CodeMirror 6 is a good fit for line numbers, highlighting, and error-line marking).
- How to split work between the Web Worker and the main thread. Mermaid needs the DOM, so it likely renders on the main thread.
- The exact pause before live formatting runs.
- The folder structure, as long as each format's formatter sits behind one shared interface (input text → formatted output or an error with a line number). Adding a new format should mean adding one module and one rail entry.
- Testing approach. At minimum, each formatter gets tests for valid input, invalid input (with a line number), and empty input.

## 10. Later, not v1

- More formats: CSV, TOML, HTML, CSS, GraphQL (the rail is designed to grow).
- Formatting options (indent size, sort keys) in a small settings popover on the output pane.
- JSONC / JSON5 (comments and trailing commas) as a separate "lenient" mode.
- Light theme.
- Converting between formats, if it's ever wanted. It would be a separate mode, not mixed into the formatter.
