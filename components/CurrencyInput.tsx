"use client";

interface Props {
  value: string; // decimal string, e.g. "2672.12"
  onChange: (value: string) => void;
  className?: string;
}

/**
 * ATM-style currency input. Digits enter from the right:
 *   type "2"    → $0.02
 *   type "6"    → $0.26
 *   type "7"    → $2.67
 *   type "2"    → $26.72
 *   backspace   → $2.67
 */
export function CurrencyInput({ value, onChange, className }: Props) {
  const cents = Math.round(parseFloat(value || "0") * 100);

  const display = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const next = Math.min(cents * 10 + parseInt(e.key), 99999999); // cap $999,999.99
      onChange((next / 100).toFixed(2));
    } else if (e.key === "Backspace") {
      e.preventDefault();
      onChange((Math.floor(cents / 10) / 100).toFixed(2));
    }
    // Tab, Enter, arrow keys pass through naturally
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onKeyDown={handleKeyDown}
      onChange={() => {}} // fully controlled via onKeyDown
      className={className}
    />
  );
}
