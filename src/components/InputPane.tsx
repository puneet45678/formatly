"use client";

import { useRef } from "react";
import { PanelLeftClose, X } from "lucide-react";
import { getFormat } from "@/formats/registry";
import type { FormatId, FormatSettings } from "@/formats/types";
import { CodeEditor } from "./CodeEditor";

interface InputPaneProps {
  formatId: FormatId;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  errorLine?: number;
  /** The format's current settings, one dropdown each (e.g. the SQL dialect). */
  settings: FormatSettings;
  onSettingChange: (key: string, value: string) => void;
  hidden?: boolean;
  /** Desktop: shrink the input to a thin rail. */
  onCollapse?: () => void;
  /** "This looks like YAML": shown under the header with a one-click switch. */
  suggestion?: { label: string; onAccept: () => void; onDismiss: () => void };
  /** Called with the text when something is pasted into an empty input. */
  onPasteIntoEmpty?: (text: string) => void;
}

export function InputPane({
  formatId,
  value,
  onChange,
  onClear,
  errorLine,
  settings,
  onSettingChange,
  hidden,
  onCollapse,
  suggestion,
  onPasteIntoEmpty,
}: InputPaneProps) {
  const format = getFormat(formatId);
  const { label } = format;
  const section = useRef<HTMLElement>(null);

  return (
    <section ref={section} aria-label="Input" className="pane" hidden={hidden}>
      <div className="pane-header">
        <b className="font-medium text-text">Input · {label}</b>
        <div className="flex items-center gap-2">
          {format.settings.map((setting) => (
            <select
              key={setting.key}
              aria-label={setting.label}
              value={settings[setting.key] ?? setting.default}
              onChange={(e) => onSettingChange(setting.key, e.target.value)}
              className="chip bg-[#161616] text-text"
            >
              {setting.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
          <button type="button" onClick={onClear} className="chip">
            Clear
          </button>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse input"
              title="Collapse input"
              className="chip hidden p-1 md:inline-flex"
            >
              <PanelLeftClose aria-hidden="true" className="size-3" />
            </button>
          )}
        </div>
      </div>
      {suggestion && (
        <div
          role="status"
          aria-label="Format suggestion"
          className="flex shrink-0 items-center gap-2 border-b border-line bg-[#0f1a20] px-3 py-1.5 text-[12px] text-muted"
        >
          <span>This looks like {suggestion.label}.</span>
          <button
            type="button"
            onClick={suggestion.onAccept}
            className="rounded-md border border-k/40 px-2 py-0.5 text-[11px] font-medium text-k hover:bg-k/10"
          >
            Switch to {suggestion.label}
          </button>
          <button
            type="button"
            onClick={() => {
              suggestion.onDismiss();
              // The button is about to disappear; keep keyboard focus in the editor.
              section.current?.querySelector<HTMLElement>(".cm-content")?.focus();
            }}
            aria-label="Dismiss suggestion"
            title="Dismiss"
            className="ml-auto rounded p-0.5 text-dim hover:text-text"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      )}
      <CodeEditor
        onPasteIntoEmpty={onPasteIntoEmpty}
        value={value}
        onChange={onChange}
        formatId={formatId}
        errorLine={errorLine}
        ariaLabel={`${label} input`}
        placeholder={`Paste ${label} here`}
      />
    </section>
  );
}
