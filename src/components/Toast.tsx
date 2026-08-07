import { useEffect, useState } from "react";
import { Info } from "lucide-react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const showToast = (text: string) => setMessage(text);

  const toast = message ? (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <div className="flex max-w-full items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg dark:bg-white dark:text-slate-900 animate-fade-in">
        <Info className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0">{message}</span>
      </div>
    </div>
  ) : null;

  return { showToast, toast };
}
