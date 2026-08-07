import { Loader2 } from "lucide-react";

export default function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500 dark:text-slate-400" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
