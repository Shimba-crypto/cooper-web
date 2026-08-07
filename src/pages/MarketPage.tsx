import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, Lock, ShoppingBag, Sparkles } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import RedeemCard from "../components/RedeemCard";
import { useToast } from "../components/Toast";
import { MARKET_ITEMS, marketItemById } from "../data/market";
import { API_URL } from "../config";
import type { WalletItem } from "../types";

export default function MarketPage() {
  const { user, appUser } = useAuth();
  const { showToast, toast } = useToast();
  const [owned, setOwned] = useState<Record<string, WalletItem> | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const balance = appUser?.coins ?? 0;
  const unlocked = appUser?.marketAccess === true;

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onValue(ref(db, `walletItems/${user.uid}`), (snapshot) => {
      setOwned(snapshot.val() ?? {});
    });
    return unsubscribe;
  }, [user]);

  const buy = async (itemId: string) => {
    if (!user) return;
    const item = marketItemById(itemId);
    if (!item) return;
    setBusyItem(itemId);
    try {
      const res = await fetch(`${API_URL}/api/market/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, itemId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error ?? `Purchase failed (${res.status})`);
      } else {
        showToast(`${item.name} is yours! ${data.balance} CC left.`);
      }
    } catch (err) {
      showToast(err instanceof Error ? `Purchase failed: ${err.message}` : "Purchase failed — try again.");
    } finally {
      setBusyItem(null);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="card mt-8 p-12 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">The Market</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Log in to earn CooperCoins and shop the Market.
          </p>
          <Link to="/login" className="btn-primary mt-6 inline-block">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {toast}
      <div className="flex flex-wrap items-center gap-3">
        <ShoppingBag className="h-8 w-8 text-emerald-600" />
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">The Market</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Spend your CooperCoins on frames, card designs and badges.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 dark:bg-amber-950/40">
          <Coins className="h-5 w-5 text-amber-500" />
          <span className="text-lg font-extrabold text-amber-700 dark:text-amber-400">{balance}</span>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-500">CC</span>
        </div>
      </div>

      {!unlocked ? (
        <div className="card mt-8 p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Market locked</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            The Market is invite-only. Redeem a Market code to unlock it — codes are given out by
            your school or teacher.
          </p>
          <div className="mx-auto mt-6 max-w-md">
            <RedeemCard />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Sparkles className="h-4 w-4 shrink-0" />
            Earn CC by answering quiz questions — 1 CC per correct answer.{" "}
            <Link to="/quizzes" className="font-semibold underline">
              Take a quiz
            </Link>
          </div>

          {owned === null ? (
            <Spinner label="Loading the Market…" />
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MARKET_ITEMS.map((item) => {
                const alreadyOwned = Boolean(owned[item.id]);
                const affordable = balance >= item.price;
                return (
                  <div key={item.id} className="card flex flex-col p-5">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl" aria-hidden>
                        {item.icon}
                      </span>
                      {alreadyOwned && (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                          Owned
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-bold text-slate-900 dark:text-white">{item.name}</h3>
                    <p className="mt-1 flex-1 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 font-extrabold text-amber-600 dark:text-amber-400">
                        <Coins className="h-4 w-4" />
                        {item.price}
                      </span>
                      <button
                        onClick={() => buy(item.id)}
                        disabled={alreadyOwned || busyItem !== null || !affordable}
                        className={`btn-primary !px-4 !py-1.5 text-sm disabled:opacity-60 ${
                          alreadyOwned ? "!bg-slate-300 dark:!bg-slate-700" : ""
                        }`}
                      >
                        {alreadyOwned ? "Owned" : busyItem === item.id ? "Buying…" : "Buy"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}