"use client";

import { useEffect } from "react";
import { getFormat } from "@/formats/registry";
import type { FormatId } from "@/formats/types";
import { useFormattedOutput } from "@/hooks/useFormattedOutput";
import { rememberFormat, useWorkbench } from "@/state/WorkbenchContext";
import { FormatRail } from "./FormatRail";
import { InputPane } from "./InputPane";
import { OutputPane } from "./OutputPane";

/** The whole tool for one format: rail on the left, input and output panes. */
export function Workbench({ formatId }: { formatId: FormatId }) {
  const format = getFormat(formatId);
  const { inputs, setInput, sqlDialect, setSqlDialect } = useWorkbench();
  const input = inputs[formatId];
  const state = useFormattedOutput(formatId, input, formatId === "sql" ? { sqlDialect } : undefined);

  useEffect(() => rememberFormat(formatId), [formatId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <FormatRail activeId={formatId} />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3.5 overflow-y-auto p-3 md:grid-cols-2 md:overflow-hidden md:p-[18px]">
        <InputPane
          formatId={formatId}
          value={input}
          onChange={(text) => setInput(formatId, text)}
          onClear={() => setInput(formatId, "")}
          errorLine={state.status === "error" ? state.error.line : undefined}
          sqlDialect={sqlDialect}
          onSqlDialectChange={setSqlDialect}
        />
        <OutputPane format={format} state={state} />
      </main>
    </div>
  );
}
