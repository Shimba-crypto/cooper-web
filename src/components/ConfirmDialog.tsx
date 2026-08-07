import { useEffect, useRef, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export default function ConfirmDialog({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />
      <div className="card relative w-full max-w-sm p-6 shadow-xl animate-fade-in">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              options.danger
                ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
            }`}
          >
            {options.danger ? (
              <AlertTriangle className="h-5 w-5" aria-hidden />
            ) : (
              <HelpCircle className="h-5 w-5" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <h2
              id="confirm-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              {options.title ?? "Are you sure?"}
            </h2>
            <p id="confirm-message" className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {options.message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            {options.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={
              options.danger
                ? "inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
                : "btn-primary"
            }
          >
            {options.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(result: boolean) => void>(() => {});

  const askConfirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  };

  const close = (result: boolean) => {
    setOptions(null);
    resolver.current(result);
  };

  const dialog = options ? (
    <ConfirmDialog
      options={options}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null;

  return { askConfirm, dialog };
}
