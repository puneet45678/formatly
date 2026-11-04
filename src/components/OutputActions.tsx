"use client";

import { useEffect, useState } from "react";
import type { FormatMeta } from "@/formats/types";
import type { OutputState } from "@/hooks/useFormattedOutput";
import { useCopyShortcut } from "@/hooks/useCopyShortcut";
import { copyText } from "@/lib/clipboard";
import { downloadBlob, downloadText, svgToPngBlob } from "@/lib/download";

type CopyLabel = "Copy" | "Copied" | "Copy failed";
type PngLabel = "Download PNG" | "PNG failed";

const FEEDBACK_MS = 1500;

/** A button label that shows feedback briefly, then returns to its default. */
function useFeedbackLabel<T extends string>(initial: T) {
  const [label, setLabel] = useState<T>(initial);
  useEffect(() => {
    if (label === initial) return;
    const timer = setTimeout(() => setLabel(initial), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [label, initial]);
  return [label, setLabel] as const;
}

export function OutputActions({ format, state }: { format: FormatMeta; state: OutputState }) {
  const output = state.status === "ok" ? state.output : null;
  const isDiagram = format.outputKind === "diagram";
  const [copyLabel, setCopyLabel] = useFeedbackLabel<CopyLabel>("Copy");
  const [pngLabel, setPngLabel] = useFeedbackLabel<PngLabel>("Download PNG");

  async function copy() {
    if (output === null) return;
    setCopyLabel((await copyText(output)) ? "Copied" : "Copy failed");
  }

  async function downloadPng() {
    if (output === null) return;
    try {
      downloadBlob("diagram.png", await svgToPngBlob(output));
    } catch {
      setPngLabel("PNG failed");
    }
  }

  useCopyShortcut(copy, output !== null && !isDiagram);

  if (isDiagram) {
    return (
      <>
        <button
          type="button"
          className="chip"
          disabled={output === null}
          onClick={() => output !== null && downloadText("diagram.svg", output, format.mime)}
        >
          Download SVG
        </button>
        <button type="button" className="chip" disabled={output === null} onClick={downloadPng} aria-live="polite">
          {pngLabel}
        </button>
      </>
    );
  }

  return (
    <>
      <button type="button" className="chip" disabled={output === null} onClick={copy} aria-live="polite">
        {copyLabel}
      </button>
      <button
        type="button"
        className="chip"
        disabled={output === null}
        onClick={() => output !== null && downloadText(`formatted.${format.extension}`, output, format.mime)}
      >
        Download
      </button>
    </>
  );
}
