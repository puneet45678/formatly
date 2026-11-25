"use client";

import { useRef, useState } from "react";
import { ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react";
import type { RegisteredFormat } from "@/formats/registry";
import { runFormatter } from "@/formats/runFormatter";
import type { FormatSettings } from "@/formats/types";
import {
  useFormattedOutput,
  type OutputState,
} from "@/hooks/useFormattedOutput";
import type { CompareTexts, WorkbenchMode } from "@/state/WorkbenchContext";
import {
  MergeEditor,
  type DiffSummary,
  type MergeEditorHandle,
} from "./MergeEditor";
import { ModeSwitch } from "./ModeSwitch";
import { describeError } from "./OutputPane";

interface CompareViewProps {
  format: RegisteredFormat;
  texts: CompareTexts;
  settings: FormatSettings;
  onChange: (side: keyof CompareTexts, text: string) => void;
  mode: WorkbenchMode;
  onModeChange: (mode: WorkbenchMode) => void;
}

const NO_DIFF: DiffSummary = { changes: 0, added: 0, removed: 0 };

/**
 * Compare mode: two versions side by side with their differences highlighted.
 * "Format both" lays both out the same way first, so only real changes remain;
 * "Sort keys" (formats that can canonicalize, such as JSON) makes key order
 * irrelevant too. Both are ordinary edits: Ctrl+Z in a side takes them back.
 */
export function CompareView({
  format,
  texts,
  settings,
  onChange,
  mode,
  onModeChange,
}: CompareViewProps) {
  const editor = useRef<MergeEditorHandle>(null);
  const [summary, setSummary] = useState<DiffSummary>(NO_DIFF);
  const [busy, setBusy] = useState(false);
  // Diagrams format to a drawing, not text, so they are compared as written.
  const textOutput = format.output === "text";
  const original = useFormattedOutput(
    format.id,
    textOutput ? texts.original : "",
    settings,
  );
  const changed = useFormattedOutput(
    format.id,
    textOutput ? texts.changed : "",
    settings,
  );
  const sides = [
    { side: "original" as const, label: "Original", state: original },
    { side: "changed" as const, label: "Changed", state: changed },
  ];
  const canFormat = sides.some(
    (s) => s.state.status === "ok" && s.state.output !== texts[s.side],
  );
  const bothEmpty = texts.original === "" && texts.changed === "";

  function formatBoth() {
    for (const { side, state } of sides)
      if (state.status === "ok") onChange(side, state.output);
  }

  async function sortKeys() {
    if (!format.canonicalize) return;
    setBusy(true);
    try {
      const canonicalize = await format.canonicalize();
      for (const { side, state } of sides) {
        if (state.status !== "ok") continue;
        const outcome = await runFormatter(
          format.id,
          canonicalize(texts[side]),
          settings,
        );
        if (outcome.kind === "ok") onChange(side, outcome.output);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Compare" className="pane flex-1">
      <div className="pane-header grid grid-cols-[1fr_auto_1fr] gap-3">
        <SideTitle
          label={`Original · ${format.label}`}
          state={textOutput ? original : undefined}
        />
        <ModeSwitch mode={mode} onChange={onModeChange} />
        <SideTitle
          label={`Changed · ${format.label}`}
          state={textOutput ? changed : undefined}
          alignEnd
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-[11.5px] text-muted">
        <span aria-live="polite" className="mr-auto">
          {bothEmpty
            ? "Paste two versions to compare"
            : describeSummary(summary)}
        </span>
        <button
          type="button"
          className="chip p-1"
          aria-label="Previous change"
          title="Previous change"
          disabled={summary.changes === 0}
          onClick={() => editor.current?.previousChange()}
        >
          <ChevronUp aria-hidden="true" className="size-3.5" />
        </button>
        <button
          type="button"
          className="chip p-1"
          aria-label="Next change"
          title="Next change"
          disabled={summary.changes === 0}
          onClick={() => editor.current?.nextChange()}
        >
          <ChevronDown aria-hidden="true" className="size-3.5" />
        </button>
        {textOutput && (
          <button
            type="button"
            className="chip"
            disabled={!canFormat}
            onClick={formatBoth}
            title="Lay out both sides the same way, so only real changes remain"
          >
            Format both
          </button>
        )}
        {format.canonicalize && (
          <button
            type="button"
            className="chip"
            disabled={busy || !sides.some((s) => s.state.status === "ok")}
            onClick={sortKeys}
            title="Sort object keys on both sides, so key order doesn't count as a change"
          >
            Sort keys
          </button>
        )}
        <button
          type="button"
          className="chip p-1"
          aria-label="Swap sides"
          title="Swap sides"
          disabled={bothEmpty}
          onClick={() => {
            onChange("original", texts.changed);
            onChange("changed", texts.original);
          }}
        >
          <ArrowLeftRight aria-hidden="true" className="size-3.5" />
        </button>
        <button
          type="button"
          className="chip"
          disabled={bothEmpty}
          onClick={() => {
            onChange("original", "");
            onChange("changed", "");
          }}
        >
          Clear
        </button>
      </div>

      {sides.some((s) => s.state.status === "invalid") && (
        <div
          aria-live="polite"
          className="border-b border-line px-3 py-1.5 font-mono text-[11.5px] text-err"
        >
          {sides.map(({ side, label, state }) =>
            state.status === "invalid" ? (
              <p key={side}>{`${label}: ${describeError(state.error)}`}</p>
            ) : null,
          )}
        </div>
      )}

      <MergeEditor
        ref={editor}
        formatId={format.id}
        label={format.label}
        original={texts.original}
        changed={texts.changed}
        onChange={onChange}
        onSummary={setSummary}
      />
    </section>
  );
}

function describeSummary({ changes, added, removed }: DiffSummary): string {
  if (changes === 0) return "No differences";
  return `${changes} ${changes === 1 ? "change" : "changes"} · +${added} −${removed} lines`;
}

/** A side's name and whether its text is valid. */
function SideTitle({
  label,
  state,
  alignEnd,
}: {
  label: string;
  state?: OutputState;
  alignEnd?: boolean;
}) {
  return (
    <span
      className={`flex items-center gap-2 ${alignEnd ? "justify-end" : ""}`}
    >
      <b className="font-medium text-text">{label}</b>
      {state?.status === "ok" && !state.pending && (
        <span className="status status-ok">Valid</span>
      )}
      {state?.status === "invalid" && !state.pending && (
        <span className="status status-error">Error</span>
      )}
    </span>
  );
}
