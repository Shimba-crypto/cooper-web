import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgePercent, Coins, Lock, ShoppingBag, Sparkles } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import RedeemCard from "../components/RedeemCard";
import { useToast } from "../components/Toast";
import { ICONS, MARKET_ITEMS, marketItemById } from "../data/market";
import { API_URL } from "../config";
import type { MarketItem, WalletItem } from "../types";

interface ServerItem {
  id: string;
  price: number;
  basePrice: number;
  kind: string;
  grants?: string[];
  salePercent?: number;
  expiresAt?: number;
  expired?: boolean;
}

const SECTIONS: { key: string; title: string }[] = [
  { key: "frame", title: "Avatar Rings" },
  { key: "overlay", title: "Avatar Accessories" },
  { key: "name_color", title: "Name Colours" },
  { key: "status", title: "Status Tags" },
  { key: "banner", title: "Profile Banners" },
  { key: "badge", title: "Badges" },
  { key: "card_design", title: "Card Designs" },
  { key: "chip", title: "Card Chips" },
  { key: "pattern", title: "Card Patterns" },
  { key: "confetti", title: "Extras" },
  { key: "timer_skin", title: "Timer Skins" },
  { key: "lb_glow", title: "Leaderboard" },
  { key: "multiplier", title: "Coin Boosters" },
  { key: "bundle", title: "Bundles" },
];

export default function MarketPage() {
  const { user, appUser } = useAuth();
  const { showToast, toast } = useToast();
  const [owned, setOwned] = useState<Record<string, WalletItem> | null>(null);
  const [serverItems, setServerItems] = useState<Record<string, ServerItem> | null>(null);
  const [sale, setSale] = useState<{ percent: number; until: number | null } | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [pinFor, setPinFor] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const balance = appUser?.coins ?? 0;
  const unlocked = appUser?.marketAccess === true;

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onValue(ref(db, `walletItems/${user.uid}`), (snapshot) => {
      setOwned(snapshot.val() ?? {});
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    fetch(`${API_URL}/api/market/items`)
      .then((res) => res.json())
      .then((data) => {
        const byId: Record<string, ServerItem> = {};
        for (const item of data.items ?? []) byId[item.id] = item;
        setServerItems(byId);
        setSale(data.sale ?? null);
      })
      .catch(() => setServerItems({}));
  }, []);

  const buy = async (itemId: string, pin?: string) => {
    if (!user) return;
    const item = marketItemById(itemId);
    if (!item) return;
    setBusyItem(itemId);
    setPinError(null);
    try {
      const res = await fetch(`${API_URL}/api/market/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, itemId, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data?.error?.includes("PIN")) {
          setPinError("Wrong PIN — try again.");
          setBusyItem(null);
          return;
        }
        showToast(data?.error ?? `Purchase failed (${res.status})`);
      } else {
        showToast(`${item.name} is yours! ${data.balance} CC left.`);
        setPinFor(null);
        setPinInput("");
      }
    } catch (err) {
      showToast(err instanceof Error ? `Purchase failed: ${err.message}` : "Purchase failed — try again.");
    } finally {
      setBusyItem(null);
    }
  };

  const startBuy = (itemId: string) => {
    if (appUser?.cardPin) {
      setPinFor(itemId);
      setPinInput("");
      setPinError(null);
    } else {
      buy(itemId);
    }
  };

  const confirmPinPurchase = () => {
    if (!/^\d{4}$/.test(pinInput)) {
      setPinError("Enter your 4-digit card PIN.");
      return;
    }
    if (pinFor) buy(pinFor, pinInput);
  };

  const effectivePrice = (item: MarketItem): number => {
    const server = serverItems?.[item.id];
    if (server && server.salePercent) return server.price;
    return item.price;
  };
  const isOnSale = (item: MarketItem): boolean => {
    const server = serverItems?.[item.id];
    return Boolean(server?.salePercent);
  };
  const limitedInfo = (item: MarketItem): ServerItem | undefined => {
    const server = serverItems?.[item.id];
    return server?.expiresAt ? server : undefined;
  };
  const countdown = (until: number) => {
    const ms = Math.max(0, until - Date.now());
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
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
            Spend your CooperCoins on frames, styles, badges and boosts.
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

          {sale && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
              <BadgePercent className="h-5 w-5 shrink-0" />
              <span>
                <strong>FLASH SALE</strong> — {sale.percent}% off everything
                {sale.until && (
                  <>
                    {" "}
                    · ends in <span className="font-bold">{countdown(sale.until)}</span>
                  </>
                )}
                !
              </span>
            </div>
          )}

          {pinFor && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
              <p className="flex items-center gap-1.5 text-sm font-bold text-amber-800 dark:text-amber-300">
                <Lock className="h-4 w-4" /> Enter your card PIN to buy {marketItemById(pinFor)?.name}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, ""));
                    setPinError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmPinPurchase();
                  }}
                  placeholder="4-digit PIN"
                  className="input !w-36"
                  autoFocus
                />
                <button onClick={confirmPinPurchase} disabled={busyItem !== null} className="btn-primary !px-4 !py-1.5 text-sm disabled:opacity-60">
                  {busyItem === pinFor ? "Buying…" : "Confirm purchase"}
                </button>
                <button onClick={() => { setPinFor(null); setPinInput(""); setPinError(null); }} className="btn-secondary !px-4 !py-1.5 text-sm">
                  Cancel
                </button>
                {pinError && <span className="text-sm font-semibold text-red-600 dark:text-red-400">{pinError}</span>}
              </div>
            </div>
          )}

          {owned === null ? (
            <Spinner label="Loading the Market…" />
          ) : (
            SECTIONS.map((section) => {
              const items = MARKET_ITEMS.filter((item) => item.kind === section.key);
              if (items.length === 0) return null;
              return (
                <section key={section.key} className="mt-8">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{section.title}</h2>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => {
                      const alreadyOwned = Boolean(owned[item.id]);
                      const Icon = ICONS[item.icon] ?? Sparkles;
                      const limited = limitedInfo(item);
                      const onSale = isOnSale(item);
                      const price = effectivePrice(item);
                      const affordable = balance >= price;
                      const soldOut = limited?.expired === true;
                      return (
                        <div key={item.id} className={`card flex flex-col p-5 ${soldOut ? "opacity-60" : ""}`}>
                          <div className="flex items-start justify-between">
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                onSale ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60"
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                            </span>
                            <div className="flex flex-col items-end gap-1">
                              {alreadyOwned && (
                                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                                  Owned
                                </span>
                              )}
                              {limited && (
                                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                                  {soldOut ? "SOLD OUT" : `LIMITED · ${countdown(limited.expiresAt!)} left`}
                                </span>
                              )}
                            </div>
                          </div>
                          <h3 className="mt-3 font-bold text-slate-900 dark:text-white">{item.name}</h3>
                          <p className="mt-1 flex-1 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                          {item.grants && (
                            <p className="mt-1 text-xs font-semibold text-violet-600 dark:text-violet-400">
                              Includes: {item.grants.map((g) => marketItemById(g)?.name ?? g).join(" + ")}
                            </p>
                          )}
                          <div className="mt-4 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 font-extrabold text-amber-600 dark:text-amber-400">
                              <Coins className="h-4 w-4" />
                              {onSale ? (
                                <>
                                  <span className="text-sm font-semibold text-slate-400 line-through">{item.price}</span>
                                  <span>{price}</span>
                                </>
                              ) : (
                                price
                              )}
                            </span>
                            <button
                              onClick={() => startBuy(item.id)}
                              disabled={alreadyOwned || busyItem !== null || !affordable || soldOut}
                              className={`btn-primary !px-4 !py-1.5 text-sm disabled:opacity-60 ${
                                alreadyOwned ? "!bg-slate-300 dark:!bg-slate-700" : ""
                              }`}
                            >
                              {alreadyOwned ? "Owned" : busyItem === item.id ? "Buying…" : soldOut ? "Sold out" : "Buy"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
