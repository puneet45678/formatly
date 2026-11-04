import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Dependency rules (see docs/architecture.md). Dependencies point one way:
// UI -> core, never core -> UI.

// Rule 1: the core (src/formats) also runs in a Web Worker and in plain Node
// tests, so it must not import React, Next.js, CodeMirror or UI code.
const coreMayNotImport = {
  group: [
    "react",
    "react/*",
    "react-dom",
    "react-dom/*",
    "next",
    "next/*",
    "@codemirror/*",
    "@uiw/*",
    "@lezer/*",
    "@/components",
    "@/components/*",
    "@/state",
    "@/state/*",
    "@/hooks",
    "@/hooks/*",
  ],
  message: "src/formats is the UI-free core: no React, Next.js, CodeMirror, components, state or hooks.",
};

// Rule 2: a formatter only turns text into a result. It imports its own
// library, ../errors and ../types, and knows nothing about the registry,
// the worker or other formats.
const formatterMayNotImport = {
  group: [
    "../definitions",
    "../definitions/*",
    "../registry",
    "../runFormatter",
    "../worker*",
    "../formatInput",
    "@/formats/definitions",
    "@/formats/definitions/*",
    "@/formats/registry",
    "@/formats/runFormatter",
    "@/formats/worker*",
    "@/formats/formatInput",
  ],
  message: "Formatters import only their own library, ../errors and ../types.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/formats/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [coreMayNotImport] }] },
  },
  {
    // Listed in full because this block replaces the one above for formatter files.
    files: ["src/formats/formatters/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [coreMayNotImport, formatterMayNotImport] }] },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
