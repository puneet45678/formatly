import { getFormat } from "./registry";
import type { FormatId, FormatResult, FormatSettings } from "./types";

/**
 * The single place where formatting happens. Every part of the UI calls this.
 *
 * Loads the format's formatter (each is its own lazily loaded chunk) and runs it.
 * Later in phase 2 this routes text formats to a Web Worker, keeping the same signature.
 */
export async function runFormatter(id: FormatId, input: string, settings: FormatSettings): Promise<FormatResult> {
  const format = await getFormat(id).load();
  return format(input, settings);
}
