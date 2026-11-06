"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { Decoration, EditorView, type ViewUpdate } from "@codemirror/view";
import { syntaxHighlighting } from "@codemirror/language";
import type { FormatId } from "@/formats/types";
import { editorTheme, highlightStyle } from "./editor-theme";
import { FORMAT_UI } from "./format-ui";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string, update: ViewUpdate) => void;
  formatId: FormatId;
  readOnly?: boolean;
  /** 1-based line to highlight as the error location. */
  errorLine?: number;
  ariaLabel: string;
  placeholder?: string;
}

// Kept at module level: the CodeMirror wrapper rebuilds the whole editor
// setup whenever this object (or onChange) changes identity.
const basicSetup = {
  lineNumbers: true,
  foldGutter: false,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
  autocompletion: false,
  searchKeymap: true,
};

function errorLineExtension(line: number): Extension {
  return EditorView.decorations.of((view) => {
    if (line < 1 || line > view.state.doc.lines) return Decoration.none;
    const from = view.state.doc.line(line).from;
    return Decoration.set([Decoration.line({ class: "cm-error-line" }).range(from)]);
  });
}

// "No highlighting", kept at module level: a fresh [] on every render would
// change the extensions and make CodeMirror rebuild the editor setup.
const PLAIN_TEXT: Extension = [];

/**
 * The format's syntax highlighting, loaded on demand. Until it arrives (a
 * moment on first use) the editor works as plain text.
 */
function useLanguage(formatId: FormatId): Extension {
  // Remembers which format the loaded language is for, so after a format
  // switch the old language is never applied to the new format's text.
  const [loaded, setLoaded] = useState<{ formatId: FormatId; language: Extension } | null>(null);

  useEffect(() => {
    let cancelled = false;
    FORMAT_UI[formatId].language().then(
      (language) => {
        if (!cancelled) setLoaded({ formatId, language });
      },
      () => {
        // Highlighting failed to load (e.g. offline): keep editing as plain text.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [formatId]);

  return loaded?.formatId === formatId ? loaded.language : PLAIN_TEXT;
}

export function CodeEditor({ value, onChange, formatId, readOnly, errorLine, ariaLabel, placeholder }: CodeEditorProps) {
  const language = useLanguage(formatId);
  const extensions = useMemo(
    () => [
      language,
      syntaxHighlighting(highlightStyle),
      EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
      ...(errorLine ? [errorLineExtension(errorLine)] : []),
    ],
    [language, errorLine, ariaLabel],
  );

  // Hand CodeMirror one stable callback that always calls the latest onChange,
  // so a parent re-render (a new closure each time) doesn't rebuild the editor.
  const latestOnChange = useRef(onChange);
  useEffect(() => {
    latestOnChange.current = onChange;
  });
  const stableOnChange = useCallback(
    (text: string, update: ViewUpdate) => latestOnChange.current?.(text, update),
    [],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange ? stableOnChange : undefined}
      extensions={extensions}
      theme={editorTheme}
      readOnly={readOnly}
      editable={!readOnly}
      placeholder={placeholder}
      height="100%"
      className="min-h-0 flex-1 overflow-hidden"
      basicSetup={basicSetup}
    />
  );
}
