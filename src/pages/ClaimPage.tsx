import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, CheckCircle2, Gift, LogIn, XCircle } from "lucide-react";
import { onValue, ref, runTransaction, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { PLANS, planName } from "../utils/plans";
import type { BuyablePlanId } from "../utils/plans";
import Spinner from "../components/Spinner";
import type { ClaimCode } from "../types";

type Result = "claimed" | "already" | "sold_out" | "invalid" | "error" | null;

export default function ClaimPage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const [code, setCode] = useState<ClaimCode | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "invalid">("loading");
  const [result, setResult] = useState<Result>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const unsubscribe = onValue(ref(db, `claimCodes/${token}`), (snapshot) => {
      const value = snapshot.val();
      if (!value) {
        setStatus("invalid");
        return;
      }
      setCode(value as ClaimCode);
      setStatus("ready");
    });
    return unsubscribe;
  }, [token]);

  const claim = async () => {
    if (!user || !code || !token) return;
    setBusy(true);
    try {
      if (code.claimedBy === user.uid) {
        setResult("already");
        setBusy(false);
        return;
      }
      const transaction = await runTransaction(ref(db, `claimCodes/${token}`), (current) => {
        if (!current || current.claimedBy) return undefined;
        if ((current.usedCount ?? 0) >= current.usageLimit) return undefined;
        return {
          ...current,
          usedCount: (current.usedCount ?? 0) + 1,
          claimedBy: user.uid,
          claimedByEmail: user.email,
          claimedAt: Date.now(),
        };
      });
      if (!transaction.committed) {
        setResult("sold_out");
        setBusy(false);
        return;
      }
      await set(ref(db, `users/${user.uid}/plan`), {
        id: code.planId,
        activatedAt: Date.now(),
        claimedVia: token,
      });
      setResult("claimed");
    } catch {
      setResult("error");
    }
    setBusy(false);
  };

  if (status === "loading") return <Spinner label="Checking claim code…" />;

  if (status === "invalid") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
          Invalid claim link
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          This claim code doesn't exist or has been removed.
        </p>
        <Link to="/" className="btn-primary mt-6">Go home</Link>
      </div>
    );
  }

  if (!code) return <Spinner label="Checking claim code…" />;

  const paid = PLANS[code.planId as BuyablePlanId];
  const plan = paid ?? {
    name: planName(code.planId),
    price: "K0",
    priceK: 0,
    features: ["All quizzes and leaderboard features included"],
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-700 to-teal-900 px-5 py-8 text-center text-white sm:px-8">
          <Gift className="mx-auto h-10 w-10" aria-hidden />
          <h1 className="mt-3 text-2xl font-extrabold">Claim your plan</h1>
          <p className="mt-1 text-sm text-emerald-100">
            {plan.name} · K{plan.price}
          </p>
        </div>

        <div className="p-5 sm:p-8">
          {result === "claimed" ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
              <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
                Plan activated!
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your {plan.name} plan is now active. Enjoy all the features.
              </p>
              <div className="mt-6 flex justify-center gap-2">
                <Link to="/quizzes" className="btn-primary">Start a quiz</Link>
                <Link to="/dashboard" className="btn-secondary">Dashboard</Link>
              </div>
            </div>
          ) : result === "already" ? (
            <div className="text-center">
              <Check className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
              <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
                Already claimed
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                You already have this plan on your account.
              </p>
              <Link to="/dashboard" className="btn-primary mt-6">Go to dashboard</Link>
            </div>
          ) : result === "sold_out" || (code.claimedBy && code.claimedBy !== user?.uid) ? (
            <div className="text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-500" aria-hidden />
              <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
                Code already used
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                This claim code has already been used. Ask your teacher for a new one.
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-1.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> {feature}
                  </li>
                ))}
              </ul>

              {!user ? (
                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Log in to claim this plan on your account.
                  </p>
                  <Link
                    to={`/login?next=/claim/${token}`}
                    className="btn-primary mt-4 w-full"
                  >
                    <LogIn className="h-4 w-4" /> Log in to claim
                  </Link>
                </div>
              ) : (
                <button
                  onClick={claim}
                  disabled={busy}
                  className="btn-primary mt-6 w-full disabled:opacity-60"
                >
                  <Gift className="h-4 w-4" /> {busy ? "Claiming…" : `Claim ${plan.name} now`}
                </button>
              )}

              {result === "error" && (
                <p role="alert" className="mt-3 text-center text-sm text-red-600 dark:text-red-400">
                  Something went wrong. Please try again.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
