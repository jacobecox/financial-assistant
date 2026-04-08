"use client";

import { useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

/**
 * Date input that opens the native calendar picker when clicking
 * anywhere on the field, not just the calendar icon.
 */
export function DateInput({ value, onChange, required, className }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={ref}
      type="date"
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      onClick={() => {
        // showPicker() is supported in all modern browsers
        try { ref.current?.showPicker(); } catch { /* fallback: browser opens it natively */ }
      }}
      className={className}
    />
  );
}
