import { jsonrepair } from "jsonrepair";

// Fixes the mistakes people make when JSON comes from somewhere else: a
// JavaScript object literal, a Python dict, a config file with comments, a log
// line cut short. jsonrepair works on the text, so numbers keep their exact
// digits (1e400, long integers) and only the broken parts change.
//
// It fixes, among others: trailing commas, comments, single or curly quotes,
// unquoted keys, Python None/True/False, missing commas, missing closing
// brackets, JSONP and MongoDB wrappers, and newline-delimited JSON (made an array).
//
// Cost grows with the number of fixes, not only the size: each removed
// trailing comma copies the output so far. 256 KB with every record broken
// takes ~350 ms, 1 MB ~5 s; it runs in the worker, so typing never waits on it.
export function repairJson(input: string): string {
  return jsonrepair(input);
}
