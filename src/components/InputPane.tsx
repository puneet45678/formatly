"use client";

import { SQL_DIALECTS, getFormat } from "@/formats/registry";
import type { FormatId, SqlDialect } from "@/formats/types";
import { CodeEditor } from "./CodeEditor";

interface InputPaneProps {
  formatId: FormatId;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  errorLine?: number;
  sqlDialect: SqlDialect;
  onSqlDialectChange: (dialect: SqlDialect) => void;
}

export function InputPane({ formatId, value, onChange, onClear, errorLine, sqlDialect, onSqlDialectChange }: InputPaneProps) {
  const { label } = getFormat(formatId);

  return (
    <section aria-label="Input" className="pane">
      <div className="pane-header">
        <b className="font-medium text-text">Input · {label}</b>
        <div className="flex items-center gap-2">
          {formatId === "sql" && (
            <select
              aria-label="SQL dialect"
              value={sqlDialect}
              onChange={(e) => onSqlDialectChange(e.target.value as SqlDialect)}
              className="chip bg-[#161616] text-text"
            >
              {SQL_DIALECTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          )}
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
