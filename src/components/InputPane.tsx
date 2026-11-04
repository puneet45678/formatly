"use client";

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
}: InputPaneProps) {
  const format = getFormat(formatId);
  const { label } = format;

  return (
    <section aria-label="Input" className="pane" hidden={hidden}>
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
        </div>
      </div>
      <CodeEditor
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
