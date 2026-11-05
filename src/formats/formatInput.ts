import { TooComplexError } from "./errors";
import { getFormat, sanitizeSettings } from "./registry";
import type { FormatId, FormatOutcome, FormatSettings } from "./types";

/**
 * Runs a format's formatter with a safety net, so callers always get a
 * FormatOutcome back and never an exception. Settings are sanitized first,
 * so a formatter only ever sees valid values.
 *
 * A formatter's own error result means the input is invalid. Anything it
 * throws is our failure, not the input's syntax, so it carries no position.
 */
export async function formatInput(id: FormatId, input: string, settings: FormatSettings): Promise<FormatOutcome> {
  try {
    const formatter = await getFormat(id).load();
    const result = await formatter(input, sanitizeSettings(id, settings));
    return result.ok ? { kind: "ok", output: result.output } : { kind: "invalid", error: result.error };
  } catch (error) {
    // A formatter saying the input is past its limits.
    if (error instanceof TooComplexError) {
      return { kind: "failed", reason: "too-complex", message: error.message };
    }
    // Deeply nested input overflows the call stack, which JavaScript reports as a RangeError.
    if (error instanceof RangeError) {
      return { kind: "failed", reason: "too-complex", message: "This is nested too deeply to format" };
    }
    return { kind: "failed", reason: "internal", message: error instanceof Error ? error.message : String(error) };
  }
}
