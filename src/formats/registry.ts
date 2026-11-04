import { FORMATS as DEFINITIONS } from "./definitions";
import type { FormatDefinition, FormatId, FormatSettings } from "./types";

/** A definition whose id is known to be one of ours. */
export type RegisteredFormat = FormatDefinition & { id: FormatId };

/**
 * Every supported format, in the order the format capsule shows them.
 * Same list as definitions/index.ts, typed as plain definitions so callers
 * don't have to deal with each format's exact literal type.
 */
export const FORMATS: readonly RegisteredFormat[] = DEFINITIONS;

export const DEFAULT_FORMAT: FormatId = "json";

export function isFormatId(value: unknown): value is FormatId {
  return FORMATS.some((f) => f.id === value);
}

export function getFormat(id: FormatId): RegisteredFormat {
  const format = FORMATS.find((f) => f.id === id);
  if (!format) throw new Error(`Unknown format: ${id}`);
  return format;
}

/** Each of the format's settings at its default value; `{}` for formats without settings. */
export function defaultSettings(id: FormatId): FormatSettings {
  return sanitizeSettings(id, {});
}

/**
 * Turns anything (usually parsed from storage) into valid settings for a format:
 * keeps only known keys whose value is one of that setting's options, and fills
 * every missing or invalid one with its default. Never throws.
 */
export function sanitizeSettings(id: FormatId, raw: unknown): FormatSettings {
  const stored = isPlainObject(raw) ? raw : {};
  const settings: Record<string, string> = {};
  for (const setting of getFormat(id).settings) {
    const value = stored[setting.key];
    const allowed = setting.options.some((option) => option.value === value);
    settings[setting.key] = allowed ? (value as string) : setting.default;
  }
  return settings;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
