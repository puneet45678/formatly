import type { FormatDefinition } from "../types";
import { json } from "./json";
import { markdown } from "./markdown";
import { mermaid } from "./mermaid";
import { sql } from "./sql";
import { xml } from "./xml";
import { yaml } from "./yaml";

/**
 * Every supported format, in the order the format capsule shows them.
 * Adding a format means adding its definition here; the rest of the app
 * (routes, capsule, tagline, downloads, settings) reads from this list.
 *
 * `as const` keeps each id as a literal ("json", not string), which is
 * what lets FormatId below be an exact union.
 */
export const FORMATS = [json, yaml, mermaid, xml, sql, markdown] as const satisfies readonly FormatDefinition[];

/** "json" | "yaml" | "mermaid" | "xml" | "sql" | "markdown", derived from the list above. */
export type FormatId = (typeof FORMATS)[number]["id"];
