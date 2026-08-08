import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, Globe, ListChecks, Plus, Tag } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import { useToast } from "../components/Toast";
import { ICONS, marketItemById } from "../data/market";
import { API_URL } from "../config";
import type { TradeListing, WalletItem } from "../types";

type Tab = "browse" | "create" | "mylistings" | "offers";

export default function TradingCenterPage() {
  const { user, appUser } = useAuth();
  const { showToast, toast } = useToast();
  const [tab, setTab] = useState<Tab>("browse");
  const [listings, setListings] = useState<TradeListing[] | null>(null);
  const [wallet, setWallet] = useState<Record<string, WalletItem> | null>(null);
  const [myListings, setMyListings] = useState<TradeListing[] | null>(null);
  const [offers, setOffers] = useState<any[] | null>(null);
  const [busyBuy, setBusyBuy] = useState<string | null>(null);
  const [createItemId, setCreateItemId] = useState("");
  const [createPrice, setCreatePrice] = useState("");
  const [createReason, setCreateReason] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  const balance = appUser?.coins ?? 0;

  useEffect(() => {
    if (!user) return;
    const unsubscribeWallet = onValue(ref(db, `walletItems/${user.uid}`), (snapshot) => {
      setWallet((snapshot.val() ?? {}) as Record<string, WalletItem>);
    });
    const unsubscribeListings = onValue(ref(db, `tradeListings`), (snapshot) => {
      const val = snapshot.val() ?? {};
      const all: TradeListing[] = Object.values(val);
      setListings(all.filter((l) => !l.status || l.status === "active"));
      setMyListings(all.filter((l) => l.sellerUid === user.uid && (!l.status || l.status === "active")));
    });
    return () => {
      unsubscribeWallet();
      unsubscribeListings();
    };
  }, [user]);

  useEffect(() => {
    if (tab !== "offers" || !user) return;
    let cancelled = false;
    fetch(`${API_URL}/api/trade/accepted`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user.uid }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setOffers(data?.accepted ?? []);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, user]);

  const listableItemIds = Object.keys(wallet ?? {}).filter((id) => {
    const item = marketItemById(id);
    return item?.kind === "frame" || item?.kind === "badge" || item?.kind === "overlay";
  });

  const createListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !createItemId || !createPrice) return;
    const price = Number(createPrice);
    if (!Number.isInteger(price) || price <= 0) {
      showToast("Enter a valid CC price.");
      return;
    }
    setCreateBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/trade/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, itemId: createItemId, priceCC: price, reason: createReason }),
      });
      const data = await res.json();
      if (!res.ok) showToast(data?.error ?? "Listing failed");
      else {
        showToast(`${marketItemById(createItemId)?.name ?? createItemId} listed for ${price} CC!`);
        setCreateItemId("");
        setCreatePrice("");
        setCreateReason("");
      }
    } catch (err) {
      showToast(err instanceof Error ? `Listing failed: ${err.message}` : "Listing failed");
    } finally {
      setCreateBusy(false);
    }
  };

  const buyListing = async (listingId: string) => {
    if (!user) return;
    setBusyBuy(listingId);
    try {
      const res = await fetch(`${API_URL}/api/trade/confirm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, buyerUid: user.uid }),
      });
      const data = await res.json();
      if (!res.ok) showToast(data?.error ?? `Purchase failed (${res.status})`);
      else {
        const item = marketItemById(data.item?.id ?? "") ?? marketItemById("");
        showToast(`${item?.name ?? "Item"} purchased for ${data.price} CC!`);
      }
    } catch (err) {
      showToast(err instanceof Error ? `Purchase failed: ${err.message}` : "Purchase failed");
    } finally {
      setBusyBuy(null);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="card mt-8 p-12 text-center">
          <Globe className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">Trading Post</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Log in to trade CooperCard cosmetics with other students.</p>
          <Link to="/login" className="btn-primary mt-6 inline-block">Log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {toast}
      <div className="flex flex-wrap items-center gap-3">
        <Globe className="h-8 w-8 text-emerald-600" />
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Trading Post</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            List your cosmetics for others to buy, or snap up deals from classmates.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 dark:bg-amber-950/40">
          <Coins className="h-5 w-5 text-amber-500" />
          <span className="text-lg font-extrabold text-amber-700 dark:text-amber-400">{balance}</span>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-500">CC</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: "browse", label: "Browse Listings", icon: ListChecks },
          { id: "create", label: "Create Listing", icon: Plus },
          { id: "mylistings", label: "My Listings", icon: Tag },
          { id: "offers", label: "My Offers", icon: Globe },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "border-b-2 border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <form onSubmit={createListing} className="mt-6 card p-6 space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white">List an item</h2>
          {listableItemIds.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">You don't own any frames, badges or overlays yet.</p>
          ) : (
            <>
              <div>
                <label className="label">Item</label>
                <select
                  value={createItemId}
                  onChange={(e) => setCreateItemId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Pick an item…</option>
                  {listableItemIds.map((id) => {
                    const item = marketItemById(id);
                    return (
                      <option key={id} value={id}>
                        {item?.name ?? id}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label">Price (CC)</label>
                  <input
                    type="number"
                    min={1}
                    value={createPrice}
                    onChange={(e) => setCreatePrice(e.target.value)}
                    placeholder="e.g. 40"
                    className="input"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-400">A 5% listing fee applies to the sale price.</p>
                </div>
                <div className="flex-1">
                  <label className="label">Reason (optional)</label>
                  <input
                    value={createReason}
                    onChange={(e) => setCreateReason(e.target.value)}
                    placeholder="e.g. Upgrading soon"
                    className="input"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={createBusy || !createItemId || !createPrice}
                className="btn-primary disabled:opacity-60"
              >
                {createBusy ? "Listing…" : "List for sale"}
              </button>
            </>
          )}
        </form>
      )}

      {(tab === "browse" || tab === "mylistings") && (listings === null ? (
        <Spinner label="Loading listings…" />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(tab === "browse" ? listings : myListings ?? []).map((l) => {
            const item = marketItemById(l.itemId);
            const Icon = ICONS[item?.icon ?? "Sparkles"] ?? null;
            const isMine = user?.uid === l.sellerUid;
            const canBuy = !isMine && balance >= l.price;
            return (
              <div key={l.listingId} className="card flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60">
                    {Icon ? <Icon className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                  </span>
                  {isMine && (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                      Yours
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-bold text-slate-900 dark:text-white">{item?.name ?? l.itemId}</h3>
                {l.reason && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{l.reason}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 font-extrabold text-amber-600 dark:text-amber-400">
                    <Coins className="h-4 w-4" />
                    {l.price}
                  </span>
                  {!isMine && (
                    <button
                      onClick={() => buyListing(l.listingId)}
                      disabled={busyBuy === l.listingId || !canBuy}
                      className="btn-primary !px-4 !py-1.5 text-sm disabled:opacity-60"
                    >
                      {busyBuy === l.listingId ? "Buying…" : !canBuy ? "Too poor" : "Buy"}
                    </button>
                  )}
                  {isMine && (
                    <span
                      className={`text-xs font-semibold ${
                        (l.expiresAt ?? 0) - Date.now() > 86400000
                          ? "text-slate-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {Math.max(0, Math.round(((l.expiresAt ?? 0) - Date.now()) / 86400000))}d left
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {tab === "offers" && (
        <div className="mt-6 card p-6">
          <h2 className="font-bold text-slate-900 dark:text-white">Accepted trades</h2>
          {offers === null ? (
            <Spinner label="Loading…" />
          ) : offers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No accepted trades yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {offers.map((o) => (
                <li key={o.tradeId} className="text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {marketItemById(o.itemId)?.name ?? o.itemId}
                  </span>{" "}
                  · <span className="text-amber-600 dark:text-amber-400">{o.priceCC} CC</span>
                  {" "}
                  · {o.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {listings !== null &&
        tab !== "offers" &&
        listings.filter((l) => !l.status || l.status === "active").length === 0 &&
        (myListings ?? []).length === 0 && (
          <div className="card mt-6 p-12 text-center text-slate-500 dark:text-slate-400">
            {tab === "browse" ? "No listings yet — list your first cosmetic in the Create tab!" : "You have no active listings."}
          </div>
        )}
    </div>
  );
}
