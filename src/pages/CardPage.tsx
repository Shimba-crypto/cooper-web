import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, CreditCard, Eye, EyeOff, Lock, Share2, Star, Wallet } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { onValue, ref, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { hasMarketAccess } from "../utils/plans";
import UpgradeGate from "../components/UpgradeGate";
import Spinner from "../components/Spinner";
import { useToast } from "../components/Toast";
import { CHIP_CLASSES, DESIGN_GRADIENTS, PATTERN_CLASSES } from "../data/market";
import { nexasLookupUsername, nexasTransfer, nexasWallet } from "../data/nexasApi";
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
    next: 2500,
    gradient: "from-yellow-600 via-amber-500 to-yellow-400",
    chip: "bg-yellow-800/80",
  },
  platinum: {
    label: "Platinum",
    icon: "💠",
    min: 2500,
    next: 5000,
    gradient: "from-slate-600 via-slate-400 to-white",
    chip: "bg-slate-800/80",
  },
  diamond: {
    label: "Diamond",
    icon: "💎",
    min: 5000,
    next: null,
    gradient: "from-cyan-700 via-cyan-400 to-white",
    chip: "bg-cyan-900/80",
  },
};

const TIER_ORDER: CardTier[] = ["bronze", "silver", "gold", "platinum", "diamond"];

function tierFor(coinsEarned: number): CardTier {
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    if (coinsEarned >= TIERS[TIER_ORDER[i]].min) return TIER_ORDER[i];
  }
  return "bronze";
}

function levelFor(coinsEarned: number): number {
  return 1 + Math.floor(coinsEarned / 100);
}

export default function CardPage() {
  const { user, appUser, planId } = useAuth();
  const { showToast, toast } = useToast();
  const [card, setCard] = useState<DigitalCard | null | undefined>(undefined);
  const [ownedItems, setOwnedItems] = useState<Record<string, WalletItem> | null>(null);
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [nickname, setNickname] = useState("");
  const [editingNickname, setEditingNickname] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showFullNumber, setShowFullNumber] = useState(false);
  const [removingPin, setRemovingPin] = useState(false);
  const [nexaBalance, setNexaBalance] = useState<number | null>(null);
  const [payTo, setPayTo] = useState("");
  const [payCoins, setPayCoins] = useState("");
  const [payMemo, setPayMemo] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [cardNum, setCardNum] = useState("");
  const [cardNumCoins, setCardNumCoins] = useState("");
  const [cardNumPin, setCardNumPin] = useState("");
  const [cardPayBusy, setCardPayBusy] = useState(false);
  const [cardPayMsg, setCardPayMsg] = useState<string | null>(null);

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
      setOwnedItems((snapshot.val() ?? {}) as Record<string, WalletItem>);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    setNickname(appUser?.cardNickname ?? "");
  }, [appUser?.cardNickname]);

  useEffect(() => {
    if (!appUser?.email) return;
    let cancelled = false;
    nexasWallet(appUser.email).then((w) => {
      if (!cancelled) setNexaBalance(w?.balance ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, [appUser?.email]);

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

  if (!hasMarketAccess(planId)) {
    return (
      <UpgradeGate
        title="Your CooperCard is a Teacher Full feature"
        message="Your card levels up with the CooperCoins you earn from quizzes. Market and your CooperCard unlock with Teacher Full."
      />
    );
  }

  if (card === undefined || ownedItems === null) {
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
  const level = levelFor(earned);
  const balance = appUser?.coins ?? 0;
  const chosenDesign = appUser?.cardDesign ?? "";
  const gradient = DESIGN_GRADIENTS[chosenDesign] ?? tierInfo.gradient;
  const progress = tierInfo.next
    ? Math.min(100, Math.round(((earned - tierInfo.min) / (tierInfo.next - tierInfo.min)) * 100))
    : 100;
  const chipClass = CHIP_CLASSES[appUser?.chipColor ?? ""] ?? tierInfo.chip;
  const patternClass = PATTERN_CLASSES[appUser?.cardPattern ?? ""] ?? "";
  const shiny = chosenDesign === "design-goldfoil" || chosenDesign === "design-holo";
  const hasPin = Boolean(appUser?.cardPin);
  const pinCorrect = hasPin && unlocked;
  const cardNumberVisible = !hasPin || pinCorrect || showFullNumber;

  const ownedDesignIds = Object.keys(ownedItems ?? {}).filter((id) => DESIGN_GRADIENTS[id]);
  const ownedChipIds = Object.keys(ownedItems ?? {}).filter((id) => CHIP_CLASSES[id]);
  const ownedPatternIds = Object.keys(ownedItems ?? {}).filter((id) => PATTERN_CLASSES[id]);

  const selectDesign = async (designId: string) => {
    await set(ref(db, `users/${user.uid}/cardDesign`), designId);
    showToast("Card design updated!");
  };

  const saveNickname = async () => {
    await set(ref(db, `users/${user.uid}/cardNickname`), nickname.trim() || "");
    setEditingNickname(false);
    showToast("Nickname saved!");
  };

  const setNewPin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      showToast("PIN must be exactly 4 digits.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/card/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, pin }),
      });
      const data = await res.json();
      if (!res.ok) showToast(data?.error ?? "Could not set PIN.");
      else {
        setPin("");
        setUnlocked(true);
        showToast("Card locked with PIN.");
      }
    } catch (err) {
      showToast(err instanceof Error ? `Could not set PIN: ${err.message}` : "Could not set PIN.");
    }
  };

  const verifyPin = () => {
    if (pin === String(appUser?.cardPin)) {
      setUnlocked(true);
      setPin("");
      showToast("Card unlocked.");
    } else {
      setPin("");
      showToast("Wrong PIN — try again.");
    }
  };

  const removePin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/card/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, pin: "" }),
      });
      const data = await res.json();
      if (!res.ok) showToast(data?.error ?? "Could not remove PIN.");
      else {
        setUnlocked(false);
        setRemovingPin(false);
        setShowFullNumber(false);
        showToast("PIN removed.");
      }
    } catch (err) {
      showToast(err instanceof Error ? `Could not remove PIN: ${err.message}` : "Could not remove PIN.");
    }
  };

  const toggleShowcase = async () => {
    await set(ref(db, `users/${user.uid}/showcasedCard`), !appUser?.showcasedCard);
    showToast(appUser?.showcasedCard ? "Card hidden from your profile." : "Card shown on your profile!");
  };

  const nextTierName = tierInfo.next ? TIER_ORDER[TIER_ORDER.indexOf(tier) + 1] : null;

  const payWithCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = Number(payCoins);
    const target = payTo.trim();
    if (!target || !c || c <= 0) {
      showToast("Enter a recipient and a positive amount.");
      return;
    }
    setPayBusy(true);
    setPayMsg(null);
    try {
      let toEmail = target;
      if (target.startsWith("@")) {
        const prof = await nexasLookupUsername(target.slice(1));
        if (!prof?.email) throw new Error(`No user found for ${target}`);
        toEmail = prof.email;
      }
      const res = await nexasTransfer({
        uid: user.uid,
        toEmail,
        coins: c,
        memo: payMemo.trim() || "Card payment",
      });
      if (res.ok) {
        setPayMsg(`Paid ${c} NexaCoin to ${target} with your card.`);
        setPayTo("");
        setPayCoins("");
        setPayMemo("");
        if (appUser?.email) {
          const w = await nexasWallet(appUser.email);
          setNexaBalance(w?.balance ?? 0);
        }
      } else {
        setPayMsg(res.error ?? "Payment failed.");
      }
    } catch (err) {
      setPayMsg(`Payment failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPayBusy(false);
    }
  };

  const payByCardNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = Number(cardNumCoins);
    const number = cardNum.trim().toUpperCase();
    if (!number || !c || c <= 0) {
      showToast("Enter a card number and a positive amount.");
      return;
    }
    setCardPayBusy(true);
    setCardPayMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/card/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          cardNumber: number,
          coins: c,
          memo: "Card payment",
          ...(cardNumPin.trim() ? { pin: cardNumPin.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCardPayMsg(data?.error ?? `Payment failed (${res.status})`);
      } else {
        setCardPayMsg(`Paid ${c} NexaCoin to card ${number}.`);
        setCardNum("");
        setCardNumCoins("");
        setCardNumPin("");
        if (appUser?.email) {
          const w = await nexasWallet(appUser.email);
          setNexaBalance(w?.balance ?? 0);
        }
      }
    } catch (err) {
      setCardPayMsg(`Payment failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCardPayBusy(false);
    }
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

      {hasPin && !unlocked && (
        <div className="card mt-6 flex flex-wrap items-center gap-3 p-4">
          <Lock className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-slate-600 dark:text-slate-300">Card locked with PIN.</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="4-digit PIN"
            className="input !w-32"
          />
          <button onClick={verifyPin} className="btn-primary !px-4 !py-1.5 text-sm">
            Unlock
          </button>
          {pin.length === 4 && !pinCorrect && <button onClick={setNewPin} className="text-xs font-semibold text-emerald-600 underline">Forgot? Set new PIN</button>}
        </div>
      )}

      <div className={`relative mt-8 aspect-[8/5] w-full overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-6 text-white shadow-2xl`}>
        <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-16 -left-8 h-56 w-56 rounded-full bg-black/10" aria-hidden />
        {patternClass && <div className={`absolute inset-0 ${patternClass}`} aria-hidden />}
        {shiny && <div className="shine-sweep pointer-events-none absolute inset-0" aria-hidden />}
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-2xl font-extrabold tracking-wide">
              Cooper<span className="text-white/80">Web</span>
            </span>
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${chipClass}`}>
              {tierInfo.icon} {tierInfo.label} · LV {level}
            </span>
          </div>
          <div className="flex items-center gap-2" aria-hidden>
            <span className={`h-9 w-12 rounded-lg ${chipClass}`} />
            <span className="h-5 w-8 rounded border border-white/50" />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-lg tracking-[0.2em] sm:text-2xl">
                {cardNumberVisible ? (
                  card.number
                ) : (
                  <span className="flex items-center gap-2">
                    •••• •••• •••• •••• <Lock className="h-4 w-4" />
                  </span>
                )}
              </p>
              <button
                onClick={() => setShowFullNumber((s) => !s)}
                title={showFullNumber ? "Hide number" : "Reveal number"}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              >
                {showFullNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/70">Card holder</p>
                <p className="font-bold">{nickname || card.holderName}</p>
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

      {showQr && (
        <div className="card mt-4 flex items-center justify-between gap-4 p-4">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={card.number} size={120} bgColor="#ffffff" fgColor="#064e3b" />
          </div>
          <div className="flex-1 text-sm text-slate-500 dark:text-slate-400">
            <p className="font-bold text-slate-900 dark:text-white">Scan to verify</p>
            <p className="mt-1">
              Anyone can scan your card's QR code to confirm this CooperCard belongs to you —
              or type <span className="font-mono font-semibold">{card.number}</span> to pay you NexaCoin.
            </p>
          </div>
        </div>
      )}

      <div className="card mt-6 p-6">
        <h2 className="font-bold text-slate-900 dark:text-white">Card tier &amp; level</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {TIER_ORDER.map((t) => (
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
          {tierInfo.next && nextTierName
            ? `${earned} CC earned — ${tierInfo.next - earned} more to reach ${TIERS[nextTierName].label}.`
            : `Diamond tier — max level! You've earned ${earned} CC in total.`}
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Tiers are based on total CC earned (rewards + codes), so they never drop. Your card level
          is {level} (1 level per 100 CC earned).
        </p>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-bold text-slate-900 dark:text-white">Card customisation</h2>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Nickname:
          </span>
          {editingNickname ? (
            <>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                placeholder="Card name"
                className="input !w-44"
              />
              <button onClick={saveNickname} className="btn-primary !px-3 !py-1.5 text-xs">Save</button>
              <button onClick={() => setEditingNickname(false)} className="btn-secondary !px-3 !py-1.5 text-xs">Cancel</button>
            </>
          ) : (
            <>
              <span className="font-semibold text-slate-900 dark:text-white">{nickname || card.holderName}</span>
              <button onClick={() => setEditingNickname(true)} className="text-xs font-semibold text-emerald-600 underline">
                Edit
              </button>
            </>
          )}
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Designs
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
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

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Chips
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ownedChipIds.length === 0 && (
            <span className="text-xs text-slate-400">Buy a chip in the Market to customise yours.</span>
          )}
          {ownedChipIds.map((chipId) => (
            <button
              key={chipId}
              onClick={() => set(ref(db, `users/${user.uid}/chipColor`), chipId)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                (appUser?.chipColor ?? "") === chipId
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {chipId.replace("chip-", "").charAt(0).toUpperCase() + chipId.replace("chip-", "").slice(1)}
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Patterns
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => set(ref(db, `users/${user.uid}/cardPattern`), "")}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
              !appUser?.cardPattern
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            None
          </button>
          {ownedPatternIds.map((patternId) => (
            <button
              key={patternId}
              onClick={() => set(ref(db, `users/${user.uid}/cardPattern`), patternId)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                appUser?.cardPattern === patternId
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {patternId.replace("pattern-", "").charAt(0).toUpperCase() + patternId.replace("pattern-", "").slice(1)}
            </button>
          ))}
        </div>

        <Link to="/market" className="btn-secondary mt-5 inline-block !px-4 !py-1.5 text-sm">
          Browse designs in the Market
        </Link>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-bold text-slate-900 dark:text-white">Security &amp; sharing</h2>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <Lock className="h-4 w-4 text-amber-500" /> PIN lock
            </span>
            {!hasPin ? (
              <>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="New 4-digit PIN"
                  className="input !w-40"
                />
                <button onClick={setNewPin} className="btn-primary !px-4 !py-1.5 text-sm">Set PIN</button>
              </>
            ) : removingPin ? (
              <>
                <span className="text-sm text-slate-500 dark:text-slate-400">Remove the PIN from your card?</span>
                <button onClick={removePin} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">Yes, remove</button>
                <button onClick={() => setRemovingPin(false)} className="btn-secondary !px-3 !py-1.5 text-xs">Cancel</button>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-emerald-600">PIN set</span>
                <button onClick={() => setRemovingPin(true)} className="text-xs font-semibold text-rose-600 underline">
                  Remove PIN
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <Share2 className="h-4 w-4 text-emerald-600" /> QR code
            </span>
            <button
              onClick={() => setShowQr((q) => !q)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                showQr ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {showQr ? "Hide QR" : "Show QR"}
            </button>
            {hasPin && !unlocked && (
              <span className="text-xs text-slate-400">Unlock your card with the PIN first.</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <Star className="h-4 w-4 text-amber-500" /> Showcase
            </span>
            <button
              onClick={toggleShowcase}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                appUser?.showcasedCard
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {appUser?.showcasedCard ? "Shown on profile" : "Show on profile"}
            </button>
          </div>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <Wallet className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" />
          Nexa &amp; your card
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your card is linked to your Nexa wallet. Check what's on it and pay straight from the card —
          by email or <span className="font-semibold text-slate-700 dark:text-slate-200">@username</span>.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-fuchsia-50 px-4 py-3 dark:bg-fuchsia-950/40">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Nexa balance
          </span>
          <span className="text-lg font-extrabold text-slate-900 dark:text-white">
            {nexaBalance === null ? "…" : nexaBalance.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {card.number?.slice(-4) ? `card •••• ${card.number.slice(-4)}` : "card"}
          </span>
          <span className="ml-auto">
            <Link to="/nexas-wallet" className="text-xs font-semibold text-emerald-600 underline">
              Open wallet
            </Link>
          </span>
        </div>

        <form onSubmit={payWithCard} className="mt-4 grid gap-3 sm:grid-cols-[1fr_9rem_8rem_8rem] sm:items-end">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Pay to (email or @username)
            </label>
            <input
              type="text"
              value={payTo}
              onChange={(e) => setPayTo(e.target.value)}
              placeholder="alice@example.com"
              className="input mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Amount
            </label>
            <input
              type="number"
              min={1}
              value={payCoins}
              onChange={(e) => setPayCoins(e.target.value)}
              placeholder="0"
              className="input mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Memo
            </label>
            <input
              type="text"
              value={payMemo}
              onChange={(e) => setPayMemo(e.target.value)}
              placeholder="Optional"
              className="input mt-1 w-full"
            />
          </div>
          <button type="submit" disabled={payBusy} className="btn-primary !px-4 !py-2.5 text-sm">
            {payBusy ? "Paying…" : "Pay"}
          </button>
        </form>

        {payMsg && (
          <p
            className={`mt-3 text-xs font-semibold ${
              payMsg.startsWith("Paid") ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {payMsg}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Nexa payments are separate from CooperCoins — your card balance stays in CC.
        </p>

        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Pay another card (by number)
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Enter someone's CooperCard number and the coins come out of your Nexa wallet.{" "}
            {hasPin && "Your card is PIN-locked, so add your PIN to confirm."}
          </p>
          <form onSubmit={payByCardNumber} className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem_8rem_8rem] sm:items-end">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Card number
              </label>
              <input
                type="text"
                value={cardNum}
                onChange={(e) => setCardNum(e.target.value.toUpperCase())}
                placeholder="CW-XXXX-XXXX-XXXX"
                className="input mt-1 w-full font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Amount
              </label>
              <input
                type="number"
                min={1}
                value={cardNumCoins}
                onChange={(e) => setCardNumCoins(e.target.value)}
                placeholder="0"
                className="input mt-1 w-full"
              />
            </div>
            {hasPin && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={cardNumPin}
                  onChange={(e) => setCardNumPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="input mt-1 w-full"
                />
              </div>
            )}
            <button type="submit" disabled={cardPayBusy} className="btn-secondary !px-4 !py-2.5 text-sm">
              {cardPayBusy ? "Paying…" : "Pay card"}
            </button>
          </form>
          {cardPayMsg && (
            <p
              className={`mt-3 text-xs font-semibold ${
                cardPayMsg.startsWith("Paid") ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {cardPayMsg}
            </p>
          )}
        </div>
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
