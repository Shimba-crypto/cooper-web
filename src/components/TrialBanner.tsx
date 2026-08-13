import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isTrialActive, planTimeLeft } from "../utils/plans";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Shown while the free Student Plus trial from an Auther login is running.
 * Renders nothing for everyone else.
 */
export default function TrialBanner() {
  const { appUser } = useAuth();
  const plan = appUser?.plan;

  if (!isTrialActive(plan)) return null;

  const msLeft = planTimeLeft(plan) ?? 0;
  const daysLeft = Math.ceil(msLeft / DAY_MS);
  const expiry = new Date(plan!.expiresAt!).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/50">
      <Sparkles className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
          Student Plus — 2 week trial
        </p>
        <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
          {daysLeft === 1 ? "Ends today" : `${daysLeft} days left`} · expires {expiry}
        </p>
      </div>
      <Link
        to="/payments"
        className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
      >
        Keep it
      </Link>
    </div>
  );
}
