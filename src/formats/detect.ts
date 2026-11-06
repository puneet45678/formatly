import { FORMATS } from "./definitions";
import type { FormatId } from "./types";

/** A suggestion needs at least this much confidence... */
const SUGGEST_AT = 0.7;
/** ...and has to beat the format you are on by this much, so look-alikes stay where they are. */
const MARGIN = 0.2;

/**
 * Which other format does `input` look like? Returns its id, or null when nothing is convincing
 * (plain text, ambiguous text, or text that already fits the format you are on).
 *
 * Each format scores the text itself (`detect` in its definition); this only compares the scores.
 */
export function detectFormat(input: string, currentId: FormatId): FormatId | null {
  if (input.trim() === "") return null;
  let current = 0;
  let best: { id: FormatId; score: number } | null = null;
  for (const format of FORMATS) {
    const score = format.detect?.(input) ?? 0;
    if (format.id === currentId) current = score;
    else if (!best || score > best.score) best = { id: format.id, score };
  }
  return best && best.score >= SUGGEST_AT && best.score >= current + MARGIN ? best.id : null;
}
