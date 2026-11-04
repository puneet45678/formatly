"use client";

import type { FormatError, FormatMeta } from "@/formats/types";
import type { OutputState } from "@/hooks/useFormattedOutput";
import { CodeEditor } from "./CodeEditor";
import { DiagramView } from "./DiagramView";

interface OutputPaneProps {
  format: FormatMeta;
  state: OutputState;
}

export function describeError(error: FormatError): string {
  const where = error.column ? `Line ${error.line}, column ${error.column}` : `Line ${error.line}`;
  return `${where}: ${error.message}`;
}

export function OutputPane({ format, state }: OutputPaneProps) {
  return (
    <section aria-label="Output" className="pane">
      <div className="pane-header">
        <b className="font-medium text-text">Output</b>
        <div className="flex items-center gap-2">
          {state.status === "ok" && <span className="status status-ok">Valid</span>}
          {state.status === "error" && <span className="status status-error">Error</span>}
        </div>
      </div>
      <OutputBody format={format} state={state} />
    </section>
  );
}

function OutputBody({ format, state }: OutputPaneProps) {
  switch (state.status) {
    case "empty":
      return <p className="p-3.5 text-[12.5px] text-dim">Paste {format.label} on the left</p>;
    case "error":
      return <p className="p-3.5 font-mono text-xs text-err">{describeError(state.error)}</p>;
    case "ok":
      return format.outputKind === "diagram" ? (
        <DiagramView svg={state.output} />
      ) : (
        <CodeEditor value={state.output} formatId={format.id} readOnly ariaLabel={`Formatted ${format.label}`} />
      );
  }
}
