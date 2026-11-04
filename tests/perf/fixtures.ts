// Deterministic large inputs for the performance tests. Generated in code, so
// no multi-megabyte files live in the repo. Each generator repeats a small,
// realistic record until the text reaches `bytes`.

function repeatUntil(bytes: number, head: string, item: (i: number) => string, tail: string, sep = ""): string {
  const parts: string[] = [head];
  let size = head.length + tail.length;
  for (let i = 0; size < bytes; i++) {
    const piece = (i === 0 ? "" : sep) + item(i);
    parts.push(piece);
    size += piece.length;
  }
  parts.push(tail);
  return parts.join("");
}

export const FIXTURES = {
  json: (bytes: number) =>
    repeatUntil(
      bytes,
      "[",
      (i) => `{"id":${i},"name":"user-${i}","email":"u${i}@example.com","roles":["admin","dev"],"active":${i % 2 === 0},"score":${i * 1.5}}`,
      "]",
      ",",
    ),
  yaml: (bytes: number) =>
    repeatUntil(bytes, "users:\n", (i) => `  - id: ${i}\n    name: user-${i}\n    roles: [admin, dev]\n    active: ${i % 2 === 0}\n`, ""),
  xml: (bytes: number) =>
    repeatUntil(bytes, "<users>", (i) => `<user id="${i}"><name>user-${i}</name><roles><role>admin</role></roles></user>`, "</users>"),
  sql: (bytes: number) =>
    repeatUntil(bytes, "", (i) => `select id, name from users where id = ${i} and active = 1 order by name;\n`, ""),
  markdown: (bytes: number) =>
    repeatUntil(bytes, "# Notes\n\n", (i) => `## Section ${i}\n\n* item one\n* item __two__\n\nSome text with a [link](https://example.com/${i}).\n\n`, ""),
} as const;
