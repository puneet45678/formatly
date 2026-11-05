"use client";

import { useEffect, useState } from "react";
import { defaultSettings, type RegisteredFormat } from "@/formats/registry";
import { runFormatter } from "@/formats/runFormatter";
import type { FormatOutcome } from "@/formats/types";

// Diagram renderers (Mermaid) keep global state while they draw, so two
// diagrams in one document must not render at the same time. Each render
// waits for the previous one; a failure doesn't block the ones after it.
let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
}

/**
 * A diagram written inside a document, such as a ```mermaid block in Markdown.
 * It is drawn through runFormatter like the diagram format's own page, so it
 * gets the same sanitized SVG, size limits and error positions.
 *
 * While drawing, the block's source shows as code (or, after an edit, the
 * previous drawing stays until the new one is ready). If it can't be drawn,
 * the source stays visible with the reason under it, and the rest of the
 * document is unaffected.
 */
export function EmbeddedDiagram({ format, source }: { format: RegisteredFormat; source: string }) {
  const [result, setResult] = useState<{ source: string; outcome: FormatOutcome } | null>(null);
  const [lastDrawing, setLastDrawing] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    oneAtATime(() => runFormatter(format.id, source, defaultSettings(format.id))).then((outcome) => {
      if (!current) return;
      setResult({ source, outcome });
      if (outcome.kind === "ok") setLastDrawing(outcome.output);
    });
    return () => {
      current = false;
    };
  }, [format.id, source]);

  const outcome = result?.source === source ? result.outcome : null;

  if (outcome?.kind === "ok" || (outcome === null && lastDrawing !== null)) {
    const svg = outcome?.kind === "ok" ? outcome.output : lastDrawing!;
    return (
      // The SVG was sanitized by the formatter before it got here.
      <div role="img" aria-label={`${format.label} diagram`} className="md-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
    );
  }

  return (
    <figure className="md-diagram-source">
      <pre>
        <code>{source}</code>
      </pre>
      {outcome?.kind === "invalid" && (
        <figcaption className="text-err">
          {`${format.label} diagram, line ${outcome.error.line}: ${outcome.error.message}`}
        </figcaption>
      )}
      {outcome?.kind === "failed" && <figcaption>{`${format.label} diagram not drawn: ${outcome.message}`}</figcaption>}
    </figure>
  );
}
