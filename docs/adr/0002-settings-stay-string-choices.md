# ADR 0002: Settings stay string choices; no typed-settings refactor yet

- Status: accepted
- Date: 2026-11-04

## Context

Every format setting is a choice from a fixed list of string values (`FormatSetting`: key, label, options, default), and a formatter receives `Record<string, string>`. The architecture review (F7) proposed making settings typed (`enum | number | boolean`) and `FormatDefinition` generic over its settings, expecting indent width and similar options to need numbers.

## Decision

Keep the string-choice model. Indent width ships as a choice: "2 spaces", "4 spaces", "Tabs" (`definitions/indent.ts`), offered for JSON, XML and SQL. YAML offers spaces only, because YAML forbids tabs for indentation. Each formatter turns `"2"`, `"4"` or `"tab"` into its library's option in one line.

## Why

- Everything the UI offers is a dropdown, and a dropdown is a fixed list of choices. The string model is exactly that, so indent fits with no new concepts: the dropdown, per-format storage, sanitizing stored values and passing the value to the formatter all work unchanged.
- A choice list is also safer than a number: a stored value outside the list (an indent of 37, or a tab for YAML) is replaced with the default by `sanitizeSettings`, not passed through.
- A generic `FormatDefinition<S>` would touch every definition, the registry, storage and the settings UI for no behaviour a user can see today.

## Consequences

- Revisit when a setting can't be a short list of choices: a free-form number (line width) or a text field. That is when typed settings pay for themselves.
- The shared contract test now formats every format's valid example with every option of every setting and checks the result is stable, so any new setting is tested without new test code.
