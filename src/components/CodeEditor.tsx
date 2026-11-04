"use client";

import { useMemo } from "react";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { Decoration, EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { xml } from "@codemirror/lang-xml";
import { sql } from "@codemirror/lang-sql";
import { markdown } from "@codemirror/lang-markdown";
import type { FormatId } from "@/formats/types";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  formatId: FormatId;
  readOnly?: boolean;
  /** 1-based line to highlight as the error location. */
  errorLine?: number;
  ariaLabel: string;
  placeholder?: string;
}

const languages: Record<FormatId, () => Extension[]> = {
  json: () => [json()],
  yaml: () => [yaml()],
  xml: () => [xml()],
  sql: () => [sql()],
  markdown: () => [markdown()],
  mermaid: () => [], // no CodeMirror grammar for Mermaid; shown as plain text
};

// Colors from the design tokens in globals.css.
const highlight = HighlightStyle.define([
  { tag: [t.propertyName, t.keyword, t.tagName, t.heading], color: "#7dd3fc" },
  { tag: [t.string, t.special(t.string)], color: "#a7f3d0" },
  { tag: [t.number, t.bool, t.null, t.atom, t.attributeName], color: "#fcd34d" },
  { tag: [t.punctuation, t.bracket, t.separator, t.comment], color: "#6b7280" },
]);

const theme = EditorView.theme(
  {
    "&": { height: "100%", backgroundColor: "transparent", color: "#cfcfcf", fontSize: "12px" },
    "&.cm-focused": { outline: "none" },
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

function errorLineExtension(line: number): Extension {
  return EditorView.decorations.of((view) => {
    if (line < 1 || line > view.state.doc.lines) return Decoration.none;
    const from = view.state.doc.line(line).from;
    return Decoration.set([Decoration.line({ class: "cm-error-line" }).range(from)]);
  });
}

export function CodeEditor({ value, onChange, formatId, readOnly, errorLine, ariaLabel, placeholder }: CodeEditorProps) {
  const extensions = useMemo(
    () => [
      ...languages[formatId](),
      syntaxHighlighting(highlight),
      EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
      ...(errorLine ? [errorLineExtension(errorLine)] : []),
    ],
    [formatId, errorLine, ariaLabel],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={theme}
      readOnly={readOnly}
      editable={!readOnly}
      placeholder={placeholder}
      height="100%"
      className="min-h-0 flex-1 overflow-hidden"
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        autocompletion: false,
        searchKeymap: true,
      }}
    />
  );
}
