import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, CreditCard, Lock } from "lucide-react";
import { onValue, ref, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import { useToast } from "../components/Toast";
import { API_URL } from "../config";
import type { CardTier, DigitalCard, WalletItem } from "../types";

interface TierInfo {
  label: string;
  icon: string;
  min: number;
  next: number | null;
  gradient: string;
  chip: string;
}

const TIERS: Record<CardTier, TierInfo> = {
  bronze: {
    label: "Bronze",
    icon: "🥉",
    min: 0,
    next: 200,
    gradient: "from-amber-800 via-amber-700 to-amber-600",
    chip: "bg-amber-900/80",
  },
  silver: {
    label: "Silver",
    icon: "🥈",
    min: 200,
    next: 1000,
    gradient: "from-slate-500 via-slate-400 to-slate-300",
    chip: "bg-slate-700/80",
  },
  gold: {
    label: "Gold",
    icon: "🥇",
    min: 1000,
    next: null,
    gradient: "from-yellow-600 via-amber-500 to-yellow-400",
    chip: "bg-yellow-800/80",
  },
};

const DESIGNS: Record<string, string> = {
  "design-ocean": "from-blue-800 via-blue-600 to-cyan-500",
  "design-sunset": "from-orange-600 via-rose-500 to-pink-500",
  "design-midnight": "from-violet-900 via-purple-700 to-indigo-500",
};

function tierFor(coinsEarned: number): CardTier {
  if (coinsEarned >= 1000) return "gold";
  if (coinsEarned >= 200) return "silver";
  return "bronze";
}

export default function CardPage() {
  const { user, appUser } = useAuth();
  const { showToast, toast } = useToast();
  const [card, setCard] = useState<DigitalCard | null | undefined>(undefined);
  const [ownedDesigns, setOwnedDesigns] = useState<Record<string, WalletItem> | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`${API_URL}/api/card?uid=${encodeURIComponent(user.uid)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.number) setCard(data as DigitalCard);
        else if (!cancelled) setCard(null);
      })
      .catch(() => {
        if (!cancelled) setCard(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onValue(ref(db, `walletItems/${user.uid}`), (snapshot) => {
      const value = (snapshot.val() ?? {}) as Record<string, WalletItem>;
      setOwnedDesigns(
        Object.fromEntries(Object.entries(value).filter(([id]) => DESIGNS[id]))
      );
    });
    return unsubscribe;
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="card mt-8 p-12 text-center">
          <CreditCard className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">My CooperCard</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Log in to see your card.</p>
          <Link to="/login" className="btn-primary mt-6 inline-block">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (card === undefined || ownedDesigns === null) {
    return <Spinner label="Loading your card…" />;
  }
  if (!card) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="card mt-8 p-12 text-center text-slate-500 dark:text-slate-400">
          Could not issue your card — try again later.
        </p>
      </div>
    );
  }

  const earned = appUser?.coinsEarned ?? 0;
  const tier = tierFor(earned);
  const tierInfo = TIERS[tier];
  const nextTier = tier === "bronze" ? "silver" : tier === "silver" ? "gold" : null;
  const balance = appUser?.coins ?? 0;
  const chosenDesign = appUser?.cardDesign ?? "";
  const gradient = DESIGNS[chosenDesign] ?? tierInfo.gradient;
  const progress = tierInfo.next ? Math.min(100, Math.round(((earned - tierInfo.min) / (tierInfo.next - tierInfo.min)) * 100)) : 100;
  const ownedDesignIds = Object.keys(ownedDesigns ?? {});

  const selectDesign = async (designId: string) => {
    await set(ref(db, `users/${user.uid}/cardDesign`), designId);
    showToast("Card design updated!");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {toast}
      <div className="flex items-center gap-3">
        <CreditCard className="h-8 w-8 text-emerald-600" />
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">My CooperCard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your digital membership card — level it up by earning CooperCoins.
          </p>
        </div>
      </div>

      <div className={`relative mt-8 aspect-[8/5] w-full overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-6 text-white shadow-2xl`}>
        <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-16 -left-8 h-56 w-56 rounded-full bg-black/10" aria-hidden />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-2xl font-extrabold tracking-wide">
              Cooper<span className="text-white/80">Web</span>
            </span>
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${tierInfo.chip}`}>
              {tierInfo.icon} {tierInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-2" aria-hidden>
            <span className={`h-9 w-12 rounded-lg ${tierInfo.chip}`} />
            <span className="h-5 w-8 rounded border border-white/50" />
          </div>
          <div>
            <p className="font-mono text-xl tracking-[0.2em] sm:text-2xl">{card.number}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/70">Card holder</p>
                <p className="font-bold">{card.holderName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/70">CooperCoins</p>
                <p className="flex items-center justify-end gap-1 text-lg font-extrabold">
                  <Coins className="h-4 w-4" />
                  {balance}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-bold text-slate-900 dark:text-white">Card tier</h2>
        <div className="mt-3 flex items-center gap-2">
          {(["bronze", "silver", "gold"] as CardTier[]).map((t) => (
            <span
              key={t}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                t === tier
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {TIERS[t].icon} {TIERS[t].label}
            </span>
          ))}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-slate-400 to-yellow-400" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {tierInfo.next && nextTier
            ? `${earned} CC earned — ${tierInfo.next - earned} more to reach ${TIERS[nextTier].label}.`
            : `Gold tier — max level! You've earned ${earned} CC in total.`}
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Tiers are based on total CC earned (rewards + codes), so they never drop.
        </p>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-bold text-slate-900 dark:text-white">Card designs</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {ownedDesignIds.length > 0
            ? "Pick a design you've bought in the Market."
            : "You're using the default design for your tier. Buy designs in the Market!"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => set(ref(db, `users/${user.uid}/cardDesign`), "")}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
              !chosenDesign
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            Default ({TIERS[tier].icon})
          </button>
          {ownedDesignIds.map((designId) => (
            <button
              key={designId}
              onClick={() => selectDesign(designId)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                chosenDesign === designId
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {designId.replace("design-", "").charAt(0).toUpperCase() + designId.replace("design-", "").slice(1)}
            </button>
          ))}
        </div>
        <Link to="/market" className="btn-secondary mt-5 inline-block !px-4 !py-1.5 text-sm">
          Browse designs in the Market
        </Link>
      </div>

      {!appUser?.marketAccess && (
        <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <Lock className="h-4 w-4 shrink-0" />
          Tip: unlock the Market with a redeem code to buy card designs and more.
        </div>
      )}
    </div>
  );
}