import { parseTree, type Node, type ParseError } from "jsonc-parser";

// Rewrites JSON so documents that hold the same data compare equal: object
// keys sorted, everything else unchanged. Used by compare mode's "Sort keys".
//
// JSON.parse + JSON.stringify would do this in two lines but rounds numbers
// (1e400 becomes null, long integers lose digits), breaking the formatter's
// promise. So this walks the syntax tree and re-emits each value's original
// text; only the order of object members changes. Array order is data, so it
// is kept. The result is compact; compare mode formats it afterwards.
//
// Throws on input that isn't valid JSON (the caller only offers this for
// input the formatter accepted).
export function sortJsonKeys(input: string): string {
  const errors: ParseError[] = [];
  const root = parseTree(input, errors, { disallowComments: true, allowTrailingComma: false });
  if (!root || errors.length > 0) throw new Error("Only valid JSON can have its keys sorted");
  return emit(root, input);
}

function emit(node: Node, text: string): string {
  switch (node.type) {
    case "object": {
      const members = (node.children ?? []).map((property) => {
        const [key, value] = property.children ?? [];
        return { key: key.value as string, keyText: text.slice(key.offset, key.offset + key.length), value };
      });
      // Code-unit order, the same everywhere; ties (duplicate keys) keep their order.
      members.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
      return `{${members.map((m) => `${m.keyText}:${m.value ? emit(m.value, text) : "null"}`).join(",")}}`;
    }
    case "array":
      return `[${(node.children ?? []).map((child) => emit(child, text)).join(",")}]`;
    default:
      // Strings, numbers, booleans and null: exactly as written.
      return text.slice(node.offset, node.offset + node.length);
  }
}
