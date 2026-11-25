"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { detectFormat } from "@/formats/detect";
import { getFormat } from "@/formats/registry";
import type { FormatId } from "@/formats/types";
import { useAutoFix } from "@/hooks/useAutoFix";
import { useFormattedOutput } from "@/hooks/useFormattedOutput";
import { cn } from "@/lib/utils";
import { rememberFormat, useWorkbench } from "@/state/WorkbenchContext";
import { FormatRail } from "./FormatRail";
import { InputPane } from "./InputPane";
import { Intro } from "./Intro";
import { OutputPane } from "./OutputPane";
import { SiteAbout } from "./SiteAbout";
import { SplitView } from "./SplitView";

/**
 * One format's page: the tool (format capsule, intro, input and output panes) fills the first
 * screen on desktop, and the About text sits below it. The page scrolls; the tool does not.
 */
/**
 * `children` is shown below the tool, before the site's About text: the format
 * page passes its guide here. It is rendered on the server, so it is in the
 * static HTML; like the About text, it hides while the output is expanded.
 */
export function Workbench({ formatId, children }: { formatId: FormatId; children?: ReactNode }) {
  const format = getFormat(formatId);
  const { inputs, setInput, settings, setSetting, railCollapsed, toggleRail, layout, setLayout } = useWorkbench();
  const input = inputs[formatId];
  const formatSettings = settings[formatId];
  const state = useFormattedOutput(formatId, input, formatSettings);
  const [outputExpanded, setOutputExpanded] = useState(false);
  // Offered under a syntax error for formats with a repairer; a fix replaces the input (undo with Ctrl+Z).
  const autoFix = useAutoFix(formatId, input, formatSettings, (text) => setInput(formatId, text));
  const router = useRouter();
  // Set when text for another format is pasted into an empty input. It only stands while the input
  // still holds exactly that text, so replacing the text can never move something else by mistake.
  const [suggestion, setSuggestion] = useState<{ id: FormatId; text: string } | null>(null);
  const suggestedFormat = suggestion && input === suggestion.text ? getFormat(suggestion.id) : null;

  function onPasteIntoEmpty(text: string) {
    const found = detectFormat(text, formatId);
    // Moving the text over would replace whatever is already on that page, so don't offer it then.
    setSuggestion(found && inputs[found] === "" ? { id: found, text } : null);
  }

  function acceptSuggestion() {
    if (!suggestedFormat) return;
    setInput(suggestedFormat.id, input);
    setInput(formatId, "");
    setSuggestion(null);
    router.push(`/${suggestedFormat.id}`);
  }

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
    <div className="flex flex-1 flex-col">
      <div className="relative flex min-h-0 flex-col md:h-[calc(100dvh-var(--topbar-h))] md:min-h-[520px]">
      {/* Floats over the grid; the panes leave room for it (left on desktop, bottom on phones). */}
      <FormatRail activeId={formatId} collapsed={railCollapsed} onToggle={toggleRail} hidden={outputExpanded} />
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col p-3 md:overflow-hidden md:p-[18px]",
          "md:transition-[padding] md:duration-200 md:ease-out motion-reduce:transition-none",
          // Expanded output has no capsule beside it, so it gets the same margin on both sides.
          outputExpanded ? "md:pl-[18px]" : railCollapsed ? "md:pl-[84px]" : "md:pl-[196px]",
        )}
      >
        {!outputExpanded && <Intro compact={input !== ""} />}
        <SplitView
          leftHidden={outputExpanded}
          railLabel={`Input · ${format.label}`}
          layout={layout}
          onLayoutChange={setLayout}
          left={
            <InputPane
              formatId={formatId}
              value={input}
              onChange={(text) => {
                setInput(formatId, text);
                if (text === "") setSuggestion(null);
              }}
              onClear={() => {
                setInput(formatId, "");
                setSuggestion(null);
              }}
              onPasteIntoEmpty={onPasteIntoEmpty}
              suggestion={
                suggestedFormat
                  ? { label: suggestedFormat.label, onAccept: acceptSuggestion, onDismiss: () => setSuggestion(null) }
                  : undefined
              }
              // Only a syntax error points at a line; a timeout or crash says nothing about line 1.
              errorLine={state.status === "invalid" ? state.error.line : undefined}
              settings={formatSettings}
              onSettingChange={(key, value) => setSetting(formatId, key, value)}
              onCollapse={() => setLayout({ ...layout, inputCollapsed: true })}
            />
          }
          right={
            <OutputPane
              format={format}
              state={state}
              fix={autoFix}
              expanded={outputExpanded}
              onToggleExpand={() => setOutputExpanded((expanded) => !expanded)}
            />
          }
        />
      </main>
      </div>
      {!outputExpanded && (
        <>
          {children}
          <SiteAbout />
        </>
      )}
    </div>
  );
}
