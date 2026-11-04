import { formatError } from "./errors";
import { getFormat, sanitizeSettings } from "./registry";
import type { FormatId, FormatResult, FormatSettings } from "./types";

/**
 * Runs a format's formatter with a safety net, so callers always get a
 * FormatResult back and never an exception. Settings are sanitized first,
 * so a formatter only ever sees valid values.
 */
export async function formatInput(id: FormatId, input: string, settings: FormatSettings): Promise<FormatResult> {
  try {
    const formatter = await getFormat(id).load();
    return await formatter(input, sanitizeSettings(id, settings));
  } catch (error) {
    // Deeply nested input overflows the call stack, which JavaScript reports as a RangeError.
    if (error instanceof RangeError) return formatError("This is nested too deeply to format", 1);
    return formatError(error instanceof Error ? error.message : String(error), 1);
  }
}
