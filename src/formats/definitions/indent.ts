import type { FormatSetting } from "../types";

// The indent choice shared by the formats whose output is mostly indentation.
// Plain data, like the rest of a definition; each formatter reads
// settings.indent ("2", "4" or "tab"), already sanitized to one of these.

const SPACES = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
] as const;

/** For JSON, XML and SQL. */
export const indentSetting = {
  key: "indent",
  label: "Indent",
  default: "2",
  options: [...SPACES, { value: "tab", label: "Tabs" }],
} as const satisfies FormatSetting;

/** For YAML, which forbids tabs for indentation, so offering them would produce invalid output. */
export const indentSpacesSetting = {
  key: "indent",
  label: "Indent",
  default: "2",
  options: SPACES,
} as const satisfies FormatSetting;
