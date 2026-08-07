import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Lock, Ticket } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { planName, requiredPlanName } from "../utils/plans";
import type { PlanId } from "../types";

export default function UpgradePrompt({
  required,
}: {
  required: Exclude<PlanId, "free" | "admin">;
}) {
  const { planId } = useAuth();
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const plan = requiredPlanName(required);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const token = code.trim();
    if (!token) return;
    navigate(`/claim/${token}`);
  };

  return (
    <div className="card border-amber-300 p-6 dark:border-amber-800">
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-amber-500" aria-hidden />
        <h3 className="font-bold text-slate-900 dark:text-white">
          This feature requires the {plan.name} plan
        </h3>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        You're currently on the <strong>{planName(planId)}</strong> plan. The{" "}
        <strong>{plan.name}</strong> plan (K{plan.price}) unlocks:
      </p>
      <ul className="mt-3 space-y-1.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> {feature}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Claim code</span>
          <Ticket className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter your claim code (e.g. cw-…)"
            className="input !pl-9"
            aria-label="Claim code"
          />
        </label>
        <button type="submit" className="btn-primary">
          Claim
        </button>
      </form>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Don't have a claim link? Ask your teacher or an admin to generate one.
      </p>
    </div>
  );
}
