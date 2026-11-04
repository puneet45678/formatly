# ADR 0001: Mermaid stays on the main thread; no sandbox runtime

- Status: accepted
- Date: 2026-11-04

## Context

Mermaid measures text with the DOM, so it can't run in the Web Worker the other formats use. It renders on the page's main thread, and its SVG is put into the page with `innerHTML`. The architecture review raised two concerns:

- **F1:** a large diagram can freeze typing, with no timeout and no way to stop it.
- **F2:** the page trusts Mermaid's SVG on our origin; one sanitizer bug would mean script running on the site.

The proposed fix was a `FormatRuntime` interface with a `SandboxRuntime`: render Mermaid in a hidden `<iframe sandbox="allow-scripts">` with an opaque origin, then remove the iframe to stop a render that runs too long.

## What we measured

**How long Mermaid blocks the main thread** (production build, Chromium 153, longest single task and total blocked time while rendering a generated flowchart):

| Diagram | Longest block | Total blocked |
| --- | --- | --- |
| 50 nodes | 294 ms | 451 ms |
| 200 nodes | 478 ms | 1,162 ms |
| 500 nodes | 2,250 ms | 4,174 ms |
| 1,000 nodes | refused by Mermaid's 500-edge limit | — |

F1 is real but bounded: Mermaid's own limits (500 edges, 50,000 characters) cap the worst case at roughly two seconds.

**Whether a sandboxed iframe runs off the main thread.** A parent page timed its own 10 ms timer while an iframe ran a 2-second busy loop:

| Iframe | Parent's worst timer delay | Removing the iframe at 300 ms |
| --- | --- | --- |
| same-origin | 2,001 ms | — |
| sandboxed, `srcdoc` | 1,991 ms | — |
| sandboxed, `src` | 1,992 ms | ran at 2,002 ms |

The results were the same with Chromium's `IsolateSandboxedIframes` feature turned off. Firefox and Safari do not put sandboxed iframes in their own process at all.

## Decision

1. **No `FormatRuntime` / `SandboxRuntime`.** A sandboxed iframe shares the parent's main thread, so it doesn't stop the freeze, and removing it can't interrupt a render: the code that would remove it is blocked behind the render. It would add an iframe document, a message protocol and a second build entry for isolation that a sanitizer provides more cheaply.
2. **Sanitize the SVG with DOMPurify** inside `formatters/mermaid.ts`, after `securityLevel: "strict"`. That's two independent controls, and every consumer (the view, Copy, Download SVG and PNG) gets the sanitized output. `<foreignObject>` is an HTML integration point so flowchart labels survive; their HTML is still sanitized.
3. **Treat Mermaid's limits as limits, not syntax errors.** Past 50,000 characters Mermaid quietly drew a placeholder diagram, and past 500 edges its error was reported "at line 1". Both now raise `TooComplexError`, shown as "Couldn't format" with no line marked.

## Consequences

- A diagram near the limits can still freeze typing for about two seconds. Accepted: it's bounded, and only someone pasting a 500-node diagram sees it.
- Revisit this if Mermaid gains a DOM-free renderer that could run in a worker, or if users report freezes on diagrams below the limits.
- The rendering limits live in one place (`MAX_DIAGRAM_CHARS`, `MAX_DIAGRAM_EDGES`) and are passed to Mermaid, so our checks and Mermaid's agree.
