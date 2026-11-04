"use client";

import { Suspense, lazy, useState, type ComponentType, type LazyExoticComponent } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { FORMATS, type RegisteredFormat } from "@/formats/registry";
import type { FormatError, FormatId } from "@/formats/types";
import type { OutputState } from "@/hooks/useFormattedOutput";
import { cn } from "@/lib/utils";
import { CodeEditor } from "./CodeEditor";
import { DiagramView } from "./DiagramView";
import { FORMAT_UI } from "./format-ui";
import { OutputActions } from "./OutputActions";

interface OutputPaneProps {
  format: RegisteredFormat;
  state: OutputState;
  /** Output fills the workspace and the input is hidden. */
  expanded?: boolean;
  onToggleExpand?: () => void;
}

/** How output is shown for formats with a preview. Copy and Download always use the source. */
type OutputView = "preview" | "source";

const OUTPUT_VIEWS: { id: OutputView; label: string }[] = [
  { id: "preview", label: "Preview" },
  { id: "source", label: "Source" },
];

type Preview = ComponentType<{ source: string }>;

/** The formatted output as text, in a read-only editor. */
function SourceView({ format, source }: { format: RegisteredFormat; source: string }) {
  return <CodeEditor value={source} formatId={format.id} readOnly ariaLabel={`Formatted ${format.label}`} />;
}

// One React.lazy component per format that has a preview, made once here
// (never during render, which would remount it every time). Creating it
// downloads nothing: the preview's code loads the first time it is shown.
const LAZY_PREVIEWS: Partial<Record<FormatId, LazyExoticComponent<Preview>>> = {};
for (const format of FORMATS) {
  const loadPreview = FORMAT_UI[format.id].preview;
  if (!loadPreview) continue;
  // If the preview's code can't be downloaded (offline, or the site was updated
  // while this tab was open), show the source instead. Without this the error
  // would reach React with no error boundary and blank the whole page.
  const showSource: Preview = ({ source }) => <SourceView format={format} source={source} />;
  LAZY_PREVIEWS[format.id] = lazy(() =>
    loadPreview()
      .catch(() => showSource)
      .then((component) => ({ default: component })),
  );
}

export function describeError(error: FormatError): string {
  const where = error.column ? `Line ${error.line}, column ${error.column}` : `Line ${error.line}`;
  return `${where}: ${error.message}`;
}

export function OutputPane({ format, state, expanded = false, onToggleExpand }: OutputPaneProps) {
  const [view, setView] = useState<OutputView>("preview");
  const hasPreview = LAZY_PREVIEWS[format.id] !== undefined;
  const ExpandIcon = expanded ? Minimize2 : Maximize2;

  return (
    <section aria-label="Output" className="pane">
      <div className="pane-header">
        <div className="flex items-center gap-3">
          <b className="font-medium text-text">Output</b>
          {hasPreview && (
            <div className="flex rounded-md border border-line p-px" role="group" aria-label={`${format.label} view`}>
              {OUTPUT_VIEWS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                  className={cn(
                    "rounded-[5px] px-2 py-0.5 text-[11px]",
                    view === id ? "bg-[#1c1c1c] text-text" : "text-muted hover:text-text",
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
      <OutputBody format={format} state={state} view={view} />
    </section>
  );
}

function OutputBody({ format, state, view }: OutputPaneProps & { view: OutputView }) {
  switch (state.status) {
    case "empty":
      return <p className="p-3.5 text-[12.5px] text-dim">Paste {format.label} on the left</p>;
    case "error":
      return (
        <p aria-live="polite" className="p-3.5 font-mono text-xs text-err">
          {describeError(state.error)}
        </p>
      );
    case "ok": {
      if (format.output === "diagram") return <DiagramView svg={state.output} />;
      const source = <SourceView format={format} source={state.output} />;
      const Preview = LAZY_PREVIEWS[format.id];
      if (!Preview || view === "source") return source;
      // While the preview's code downloads, show the source instead of a blank pane.
      return (
        <Suspense fallback={source}>
          <Preview source={state.output} />
        </Suspense>
      );
    }
  }
}
