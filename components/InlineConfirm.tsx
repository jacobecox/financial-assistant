"use client";

export function InlineConfirm({
  isConfirming,
  onRequest,
  onConfirm,
  onCancel,
  removeLabel = "Remove",
}: {
  isConfirming: boolean;
  onRequest: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  removeLabel?: string;
}) {
  if (isConfirming) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onConfirm}
          className="inline-flex items-center justify-center rounded-md bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400 ring-1 ring-inset ring-red-500/25 transition-all duration-150 hover:bg-red-500/25 hover:text-red-300 active:scale-95"
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          className="text-slate-500 hover:text-slate-200 text-sm leading-none transition-colors"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onRequest}
      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
    >
      {removeLabel}
    </button>
  );
}
