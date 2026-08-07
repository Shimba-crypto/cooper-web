import { useState, type FormEvent } from "react";
import { BadgeCheck, Ticket } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

export default function RedeemCard() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !code.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, code }),
      });
      const data = await res.json();
      setResult({ ok: res.ok, message: data?.message ?? data?.error ?? `Failed (${res.status})` });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? `Redeem failed: ${err.message}` : "Redeem failed — try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2">
        <Ticket className="h-5 w-5 text-emerald-600" />
        <h2 className="font-bold text-slate-900 dark:text-white">Redeem a code</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Got a gift, promo, discount or quiz code? Enter it below.
      </p>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          className="input uppercase"
          placeholder="e.g. CW-ABCD-EFGH"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="Redeem code"
        />
        <button type="submit" disabled={busy || !code.trim()} className="btn-primary shrink-0 disabled:opacity-60">
          {busy ? "Redeeming…" : "Redeem"}
        </button>
      </form>
      {result && (
        <p
          role="status"
          className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            result.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
          }`}
        >
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
          {result.message}
        </p>
      )}
    </div>
  );
}