"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  MergeView,
  getChunks,
  goToNextChunk,
  goToPreviousChunk,
} from "@codemirror/merge";
import {
  EditorView,
  drawSelection,
  keymap,
  lineNumbers,
  placeholder,
} from "@codemirror/view";
import type { Extension, Text } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting } from "@codemirror/language";
import type { FormatId } from "@/formats/types";
import { useLanguage } from "./CodeEditor";
import { editorTheme, highlightStyle } from "./editor-theme";

/** Lines removed from the original and added in the changed text, and how many separate changes. */
export interface DiffSummary {
  changes: number;
  added: number;
  removed: number;
}

/** Counts the lines a set of changed chunks covers on each side. */
export function summarize(
  chunks: readonly { fromA: number; toA: number; fromB: number; toB: number }[],
  a: Text,
  b: Text,
): DiffSummary {
  const lines = (doc: Text, from: number, to: number) =>
    // A chunk's end is just past a line break; count the lines it actually covers.
    to > from
      ? doc.lineAt(Math.max(from, to - 1)).number - doc.lineAt(from).number + 1
      : 0;
  return chunks.reduce(
    (sum, c) => ({
      changes: sum.changes + 1,
      removed: sum.removed + lines(a, c.fromA, c.toA),
      added: sum.added + lines(b, c.fromB, c.toB),
    }),
    { changes: 0, added: 0, removed: 0 },
  );
}

export interface MergeEditorHandle {
  nextChange: () => void;
  previousChange: () => void;
}

interface MergeEditorProps {
  formatId: FormatId;
  original: string;
  changed: string;
  onChange: (side: "original" | "changed", text: string) => void;
  onSummary: (summary: DiffSummary) => void;
  /** e.g. "JSON", for placeholders and accessible names. */
  label: string;
}

/**
 * Two editable editors side by side with their differences highlighted and
 * unchanged stretches collapsed (CodeMirror's merge view). Text set from
 * outside (Format both, Sort keys, Swap) is applied as an ordinary edit, so
 * Ctrl+Z in either side takes it back.
 */
export const MergeEditor = forwardRef<MergeEditorHandle, MergeEditorProps>(
  function MergeEditor(
    { formatId, original, changed, onChange, onSummary, label },
    ref,
  ) {
    const host = useRef<HTMLDivElement>(null);
    const view = useRef<MergeView | null>(null);
    const language = useLanguage(formatId);
    // The latest callbacks and texts, read by the editors' listeners without rebuilding them.
    const latest = useRef({ onChange, onSummary, original, changed });
    useEffect(() => {
      latest.current = { onChange, onSummary, original, changed };
    });

    // Built once per format and language; texts after that arrive through the sync effect below.
    useEffect(() => {
      if (!host.current) return;
      const side = (
        name: "original" | "changed",
        text: string,
        hint: string,
      ): { doc: string; extensions: Extension } => ({
        doc: text,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          language,
          syntaxHighlighting(highlightStyle),
          editorTheme,
          placeholder(hint),
          EditorView.contentAttributes.of({
            "aria-label": `${name === "original" ? "Original" : "Changed"} ${label}`,
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              latest.current.onChange(name, update.state.doc.toString());
            const merge = view.current;
            const result = getChunks(update.state);
            if (merge && result)
              latest.current.onSummary(
                summarize(result.chunks, merge.a.state.doc, merge.b.state.doc),
              );
          }),
        ],
      });
      const merge = new MergeView({
        a: side(
          "original",
          latest.current.original,
          `Paste the original ${label}`,
        ),
        b: side(
          "changed",
          latest.current.changed,
          `Paste the changed ${label}`,
        ),
        parent: host.current,
        highlightChanges: true,
        gutter: true,
        collapseUnchanged: { margin: 3, minSize: 4 },
      });
      view.current = merge;
      return () => {
        merge.destroy();
        view.current = null;
      };
    }, [formatId, language, label]);

    // Text changed from outside (not typed here): replace that side, undoably.
    useEffect(() => {
      const merge = view.current;
      if (!merge) return;
      for (const [editor, text] of [
        [merge.a, original],
        [merge.b, changed],
      ] as const) {
        if (editor.state.doc.toString() !== text) {
          editor.dispatch({
            changes: { from: 0, to: editor.state.doc.length, insert: text },
            userEvent: "input.replace",
          });
        }
      }
    }, [original, changed]);

    useImperativeHandle(ref, () => ({
      nextChange: () => {
        const editor = view.current?.b;
        if (editor && goToNextChunk(editor)) editor.focus();
      },
      previousChange: () => {
        const editor = view.current?.b;
        if (editor && goToPreviousChunk(editor)) editor.focus();
      },
    }));

    // Fills the pane and scrolls; the two sides scroll together, as the merge view keeps them aligned.
  return <div ref={host} className="merge-host min-h-0 flex-1 overflow-auto" />;
  },
);
