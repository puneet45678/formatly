import { positionAt } from "./errors";
import { formatInput } from "./formatInput";
import { getFormat, sanitizeSettings } from "./registry";
import type { FormatId, FormatSettings, RepairOutcome } from "./types";

/**
 * Runs a format's automatic fix, all or nothing. The fixed text is only
 * returned if the format's own formatter then accepts it; otherwise the
 * user's text stays as it was and the reason is reported. Never throws.
 */
export async function repairInput(id: FormatId, input: string, settings: FormatSettings): Promise<RepairOutcome> {
  const format = getFormat(id);
  if (!format.repair) return { kind: "unrepairable", message: `${format.label} has no automatic fix` };

  let repaired: string;
  try {
    repaired = (await format.repair())(input);
  } catch (error) {
    if (error instanceof RangeError) {
      return { kind: "failed", reason: "too-complex", message: "This is nested too deeply to fix" };
    }
    return { kind: "unrepairable", message: describe(error, input) };
  }

  const check = await formatInput(id, repaired, sanitizeSettings(id, settings));
  switch (check.kind) {
    case "ok":
      return { kind: "repaired", output: repaired };
    case "invalid": {
      const { message, line, column } = check.error;
      const where = column === undefined ? `line ${line}` : `line ${line}, column ${column}`;
      return { kind: "unrepairable", message: `Only part of it could be fixed (${message} at ${where} after fixing)` };
    }
    case "failed":
      return check;
    case "cancelled":
      return check;
  }
}

/** The repairer's message, with a character offset turned into a line and column. */
function describe(error: unknown, input: string): string {
  const message = error instanceof Error ? error.message : String(error);
  const position = (error as { position?: unknown } | null)?.position;
  if (typeof position !== "number") return message;
  const { line, column } = positionAt(input, position);
  return `${message.replace(/ at position \d+$/, "")} at line ${line}, column ${column}`;
}
