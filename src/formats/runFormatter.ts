import { formatInput } from "./formatInput";
import { getFormat } from "./registry";
import type { FormatId, FormatResult, FormatSettings } from "./types";
import { createWorkerClient } from "./workerClient";
import type { WorkerLike } from "./workerClient";

// One client for the whole page. Creating it is cheap: the Worker itself is only
// constructed (by the callback) the first time a format is run, never at import.
const workerClient = createWorkerClient(
  // The cast is needed because the real Worker's onmessage takes a full MessageEvent,
  // while WorkerLike only asks for `{ data }` (which is all the client reads).
  () => new Worker(new URL("./format.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike,
);

/**
 * The single place where formatting happens. Every part of the UI calls this.
 *
 * Text formats run in a Web Worker so a big paste can't freeze typing. Formats
 * that need the DOM (`runsOn: "main"`) run on the page, and so does everything
 * when the browser has no Worker (and in tests).
 */
export async function runFormatter(id: FormatId, input: string, settings: FormatSettings): Promise<FormatResult> {
  if (getFormat(id).runsOn === "worker" && typeof Worker !== "undefined") {
    return workerClient.run(id, input, settings);
  }
  return formatInput(id, input, settings);
}
