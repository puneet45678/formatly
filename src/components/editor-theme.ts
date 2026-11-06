import { EditorView } from "@codemirror/view";
import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Colors from the design tokens in globals.css. Markdown uses one accent (the blue)
// plus weight and style, and dims its marks (#, **, -, >) so the text stands out.
const ACCENT = "#7dd3fc";
const MARK = "#4b5563";

export const highlightStyle = HighlightStyle.define([
  { tag: [t.propertyName, t.keyword, t.tagName], color: ACCENT },
  { tag: [t.string, t.special(t.string)], color: "#a7f3d0" },
  { tag: [t.number, t.bool, t.null, t.atom, t.attributeName], color: "#fcd34d" },
  { tag: [t.punctuation, t.bracket, t.separator, t.comment], color: "#6b7280" },
  // Markdown
  { tag: t.heading, color: ACCENT, fontWeight: "700" },
  { tag: t.strong, color: "#ededed", fontWeight: "700" },
  { tag: t.emphasis, color: "#e5e5e5", fontStyle: "italic" },
  { tag: [t.link, t.monospace], color: ACCENT },
  { tag: t.url, color: "#4f9fc7" },
  { tag: t.quote, color: "#8f8f8f", fontStyle: "italic" },
  { tag: [t.processingInstruction, t.contentSeparator], color: MARK },
]);

export const editorTheme = EditorView.theme(
  {
    "&": { height: "100%", backgroundColor: "transparent", color: "#cfcfcf", fontSize: "12px" },
    "&.cm-focused": { outline: "1px solid #3f3f3f", outlineOffset: "-1px" },
    ".cm-scroller": { fontFamily: "var(--font-jetbrains-mono), monospace", lineHeight: "1.65" },
    ".cm-content": { padding: "12px 0", caretColor: "#ededed" },
    ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "#3f3f3f" },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "transparent" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "#264f78 !important" },
    ".cm-placeholder": { color: "#5c5c5c" },
    ".cm-error-line": { backgroundColor: "rgba(248,113,113,.12)" },
  },
  { dark: true },
);
