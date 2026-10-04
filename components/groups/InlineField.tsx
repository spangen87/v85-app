"use client";

import { useId, type ReactNode } from "react";

/** Fält med etikett och en knapp på samma rad, plus fel eller kvitto under. */
export function InlineField({ label, value, onChange, placeholder, maxLength, button, message, error, inputStyle }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  button: ReactNode;
  message?: string | null;
  error?: string | null;
  inputStyle?: React.CSSProperties;
}) {
  const id = useId();
  return (
    <div className="ta-stack" style={{ gap: 6 }}>
      <label className="ta-field-label" htmlFor={id}>{label}</label>
      <div className="flex gap-2">
        <input id={id} type="text" className="ta-field" style={{ height: 44, flex: 1, minWidth: 0, ...inputStyle }} value={value}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} />
        {button}
      </div>
      {error && <p className="ta-error" style={{ margin: 0 }} role="alert">{error}</p>}
      {message && !error && <p className="ta-text-sm" role="status">{message}</p>}
    </div>
  );
}
