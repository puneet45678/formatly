import type { Formatter } from "../types";

// Stand-in formatters from phase 1. Each format's definition points at these
// until its real formatter lands; then this file goes away.

/** Returns the input unchanged. */
export const echo: Formatter = (input) => ({ ok: true, output: input });

