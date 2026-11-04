"use client";

import { useEffect, useState } from "react";
import type { FormatMeta } from "@/formats/types";
import type { OutputState } from "@/hooks/useFormattedOutput";
import { useCopyShortcut } from "@/hooks/useCopyShortcut";
import { copyText } from "@/lib/clipboard";
import { downloadBlob, downloadText, svgToPngBlob } from "@/lib/download";

type CopyLabel = "Copy" | "Copied" | "Copy failed";

const FEEDBACK_MS = 1500;

export function OutputActions({ format, state }: { format: FormatMeta; state: OutputState }) {
  const output = state.status === "ok" ? state.output : null;
  const isDiagram = format.outputKind === "diagram";
  const [copyLabel, setCopyLabel] = useState<CopyLabel>("Copy");

  // Put the Copy label back after a moment.
  useEffect(() => {
    if (copyLabel === "Copy") return;
    const timer = setTimeout(() => setCopyLabel("Copy"), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copyLabel]);

  async function copy() {
    if (output === null) return;
    setCopyLabel((await copyText(output)) ? "Copied" : "Copy failed");
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
        <button
          type="button"
          className="chip"
          disabled={output === null}
          onClick={async () => output !== null && downloadBlob("diagram.png", await svgToPngBlob(output))}
        >
          Download PNG
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
