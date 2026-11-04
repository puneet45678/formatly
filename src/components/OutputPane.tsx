"use client";

import { useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import type { FormatError, FormatMeta } from "@/formats/types";
import type { OutputState } from "@/hooks/useFormattedOutput";
import { cn } from "@/lib/utils";
import { CodeEditor } from "./CodeEditor";
import { DiagramView } from "./DiagramView";
import { MarkdownPreview } from "./MarkdownPreview";
import { OutputActions } from "./OutputActions";

interface OutputPaneProps {
  format: FormatMeta;
  state: OutputState;
  /** Output fills the workspace and the input is hidden. */
  expanded?: boolean;
  onToggleExpand?: () => void;
}

/** How Markdown output is shown. Copy and Download always use the source. */
type MarkdownView = "preview" | "source";

const MARKDOWN_VIEWS: { id: MarkdownView; label: string }[] = [
  { id: "preview", label: "Preview" },
  { id: "source", label: "Source" },
];

export function describeError(error: FormatError): string {
  const where = error.column ? `Line ${error.line}, column ${error.column}` : `Line ${error.line}`;
  return `${where}: ${error.message}`;
}

export function OutputPane({ format, state, expanded = false, onToggleExpand }: OutputPaneProps) {
  const [markdownView, setMarkdownView] = useState<MarkdownView>("preview");
  const ExpandIcon = expanded ? Minimize2 : Maximize2;

  return (
    <section aria-label="Output" className="pane">
      <div className="pane-header">
        <div className="flex items-center gap-3">
          <b className="font-medium text-text">Output</b>
          {format.id === "markdown" && (
            <div className="flex rounded-md border border-line p-px" role="group" aria-label="Markdown view">
              {MARKDOWN_VIEWS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={markdownView === id}
                  onClick={() => setMarkdownView(id)}
                  className={cn(
                    "rounded-[5px] px-2 py-0.5 text-[11px]",
                    markdownView === id ? "bg-[#1c1c1c] text-text" : "text-muted hover:text-text",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span aria-live="polite">
            {state.status === "ok" && <span className="status status-ok">Valid</span>}
            {state.status === "error" && <span className="status status-error">Error</span>}
          </span>
          <OutputActions format={format} state={state} />
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-pressed={expanded}
              aria-label={expanded ? "Exit expanded output" : "Expand output"}
              title={expanded ? "Exit expanded output (Esc)" : "Expand output"}
              className="chip p-1"
            >
              <ExpandIcon aria-hidden="true" className="size-3" />
            </button>
          )}
        </div>
      </div>
      <OutputBody format={format} state={state} markdownView={markdownView} />
    </section>
  );
}

function OutputBody({ format, state, markdownView }: OutputPaneProps & { markdownView: MarkdownView }) {
  switch (state.status) {
    case "empty":
      return <p className="p-3.5 text-[12.5px] text-dim">Paste {format.label} on the left</p>;
    case "error":
      return (
        <p aria-live="polite" className="p-3.5 font-mono text-xs text-err">
          {describeError(state.error)}
        </p>
      );
    case "ok":
      if (format.outputKind === "diagram") return <DiagramView svg={state.output} />;
      if (format.id === "markdown" && markdownView === "preview") return <MarkdownPreview markdown={state.output} />;
      return <CodeEditor value={state.output} formatId={format.id} readOnly ariaLabel={`Formatted ${format.label}`} />;
  }
}
