"use client";

import { useEffect, useState } from "react";
import { getFormat } from "@/formats/registry";
import type { FormatId } from "@/formats/types";
import { useFormattedOutput } from "@/hooks/useFormattedOutput";
import { cn } from "@/lib/utils";
import { rememberFormat, useWorkbench } from "@/state/WorkbenchContext";
import { FormatRail } from "./FormatRail";
import { InputPane } from "./InputPane";
import { OutputPane } from "./OutputPane";
import { SplitView } from "./SplitView";

/** The whole tool for one format: rail on the left, input and output panes. */
export function Workbench({ formatId }: { formatId: FormatId }) {
  const format = getFormat(formatId);
  const { inputs, setInput, settings, setSetting, railCollapsed, toggleRail, layout, setLayout } = useWorkbench();
  const input = inputs[formatId];
  const formatSettings = settings[formatId];
  const state = useFormattedOutput(formatId, input, formatSettings);
  const [outputExpanded, setOutputExpanded] = useState(false);

  useEffect(() => rememberFormat(formatId), [formatId]);

  // Esc leaves expanded output (unless it's closing a dialog).
  useEffect(() => {
    if (!outputExpanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !(e.target instanceof Element && e.target.closest("dialog"))) {
        setOutputExpanded(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [outputExpanded]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Floats over the grid; the panes leave room for it (left on desktop, bottom on phones). */}
      <FormatRail activeId={formatId} collapsed={railCollapsed} onToggle={toggleRail} hidden={outputExpanded} />
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto p-3 pb-[76px] md:overflow-hidden md:p-[18px]",
          "md:transition-[padding] md:duration-200 md:ease-out motion-reduce:transition-none",
          // Expanded output has no capsule beside it, so it gets the same margin on both sides.
          outputExpanded ? "md:pl-[18px]" : railCollapsed ? "md:pl-[84px]" : "md:pl-[196px]",
        )}
      >
        <SplitView
          leftHidden={outputExpanded}
          railLabel={`Input · ${format.label}`}
          layout={layout}
          onLayoutChange={setLayout}
          left={
            <InputPane
              formatId={formatId}
              value={input}
              onChange={(text) => setInput(formatId, text)}
              onClear={() => setInput(formatId, "")}
              errorLine={state.status === "error" ? state.error.line : undefined}
              settings={formatSettings}
              onSettingChange={(key, value) => setSetting(formatId, key, value)}
              onCollapse={() => setLayout({ ...layout, inputCollapsed: true })}
            />
          }
          right={
            <OutputPane
              format={format}
              state={state}
              expanded={outputExpanded}
              onToggleExpand={() => setOutputExpanded((expanded) => !expanded)}
            />
          }
        />
      </main>
    </div>
  );
}
