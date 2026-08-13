import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Bell,
  Coins,
  CreditCard,
  QrCode,
  RefreshCw,
  Repeat,
  Send,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PLANS, planName } from "../utils/plans";
import {
  nexasBuy,
  nexasCharge,
  nexasConfig,
  nexasExchange,
  nexasLookupUsername,
  nexasMarkRead,
  nexasNotifications,
  nexasPayQrUrl,
  nexasRegisterProfile,
  nexasTransfer,
  nexasWallet,
  type NexasConfig,
  type NexasProfile,
  type NexasWallet as NexasWalletData,
} from "../data/nexasApi";
import Spinner from "../components/Spinner";

const fmtNumber = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

export default function NexasWalletPage() {
  const { user, appUser } = useAuth();
  const [cfg, setCfg] = useState<NexasConfig | null>(null);
  const [wallet, setWallet] = useState<NexasWalletData | null>(null);
  const [loading, setLoading] = useState(true);

  const [buyK, setBuyK] = useState("50");
  const [buyBusy, setBuyBusy] = useState(false);
  const [buyMsg, setBuyMsg] = useState<string | null>(null);
  const [buyOk, setBuyOk] = useState(false);

  const [plan, setPlan] = useState<"student" | "teacher_full">("student");
  const [payBusy, setPayBusy] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);

  const [toEmail, setToEmail] = useState("");
  const [coinsToSend, setCoinsToSend] = useState("");
  const [memo, setMemo] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string | null>(null);

  const [coCcAmount, setCoCcAmount] = useState("50");
  const [coNexaAmount, setCoNexaAmount] = useState("1");
  const [exBusy, setExBusy] = useState(false);
  const [exMsg, setExMsg] = useState<string | null>(null);

  const [notifs, setNotifs] = useState<any[]>([]);

  const email = user?.email ?? "";

  const refresh = useCallback(async () => {
    if (!email) return;
    const [w, n] = await Promise.all([nexasWallet(email), nexasNotifications(email)]);
    if (w) setWallet(w);
    setNotifs(n);
  }, [email]);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    (async () => {
      const [c, w] = await Promise.all([nexasConfig(), nexasWallet(email)]);
      if (cancelled) return;
      setCfg(c);
      if (w) setWallet(w);
      const n = await nexasNotifications(email);
      if (!cancelled) setNotifs(n);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log in required</h1>
        <Link to="/login?next=/wallet" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Spinner label="Loading your Nexa wallet…" />
      </div>
    );
  }

  if (!cfg?.enabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
          <Coins className="mx-auto h-8 w-8 text-slate-500" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Nexa Wallet</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          NexasPay isn't wired up yet. Check back soon — or buy a plan directly on the Payments page.
        </p>
        <Link to="/payments" className="btn-primary mt-6">Go to Payments</Link>
      </div>
    );
  }

  const balance = Number(wallet?.balance) || Number(wallet?.coins) || 0;
  const rate = cfg.rate || 1;
  const coinPrice = cfg.coinPrices[plan] ?? PLANS[plan]?.price ?? 0;

  const buy = async (e: FormEvent) => {
    e.preventDefault();
    const k = Number(buyK);
    if (!k || k <= 0) return;
    setBuyBusy(true);
    setBuyMsg(null);
    setBuyOk(false);
    try {
      const res = await nexasBuy(email, k);
      setBuyOk(true);
      setBuyMsg(
        `Buy order placed! Pay K${k} to ${cfg.merchantNumber} via MTN or Airtel Money. You'll receive ~${fmtNumber(res.received ?? res.coins ?? 0)} NexaCoin.`,
      );
      await refresh();
    } catch (err) {
      setBuyMsg(`Buy failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBuyBusy(false);
    }
  };

  const pay = async () => {
    setPayBusy(true);
    setPayMsg(null);
    try {
      const res = await nexasCharge(user.uid, plan);
      if (res.ok) {
        setPayMsg(`${planName(plan)} activated — ${fmtNumber(res.charged ?? 0)} NexaCoin charged.`);
        setWallet((w) => (w ? { ...w, balance: res.balance ?? w.balance } : w));
      } else if (res.needsTopUp) {
        setPayMsg("Not enough NexaCoin — buy some above, then try again.");
      } else {
        setPayMsg(res.error ?? "Payment failed. Try again shortly.");
      }
    } catch (err) {
      setPayMsg(`Payment failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPayBusy(false);
    }
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const c = Number(coinsToSend);
    let target = toEmail.trim();
    if (!target || !c || c <= 0) return;
    setSendBusy(true);
    setSendMsg(null);
    try {
      if (target.startsWith("@")) {
        const prof: NexasProfile = await nexasLookupUsername(target.slice(1));
        if (!prof?.email) throw new Error(`No user found for ${target}`);
        target = prof.email;
      }
      const res = await nexasTransfer({ uid: user.uid, toEmail: target, coins: c, memo: memo.trim() || undefined });
      if (res.ok) {
        setSendMsg(`Sent ${fmtNumber(c)} NexaCoin to ${target}.`);
        setToEmail("");
        setCoinsToSend("");
        setMemo("");
        await refresh();
      } else {
        setSendMsg(res.error ?? "Transfer failed.");
      }
    } catch (err) {
      setSendMsg(`Transfer failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSendBusy(false);
    }
  };

  const registerUsername = async (e: FormEvent) => {
    e.preventDefault();
    const un = username.trim().replace(/^@/, "");
    if (!un) return;
    setProfileBusy(true);
    setProfileMsg(null);
    try {
      const res = await nexasRegisterProfile(user.uid, un);
      if (res.username) {
        setMyUsername(res.username);
        setProfileMsg(`@${res.username} registered — people can pay you with it.`);
        setUsername("");
      } else {
        setProfileMsg(res.error ?? "Registration failed.");
      }
    } catch (err) {
      setProfileMsg(`Registration failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProfileBusy(false);
    }
  };

  const history = Array.isArray(wallet?.history) ? wallet.history : [];

  const exchangeIn = async (e: FormEvent) => {
    e.preventDefault();
    const cc = Number(coCcAmount);
    if (!cc || cc <= 0) return;
    setExBusy(true);
    setExMsg(null);
    try {
const res = await nexasExchange(user.uid, "in", cc);
      if (res.ok) {
        setExMsg(`Exchanged ${fmtNumber(cc)} CC → ${fmtNumber(res.sent ?? 0)} NexaCoin.`);
        setCoCcAmount("");
        await refresh();
      } else {
        setExMsg(res.error ?? "Exchange failed.");
      }
    } catch (err) {
      setExMsg(`Exchange failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExBusy(false);
    }
  };

  const exchangeOut = async (e: FormEvent) => {
    e.preventDefault();
    const nx = Number(coNexaAmount);
    if (!nx || nx <= 0) return;
    setExBusy(true);
    setExMsg(null);
    try {
      const res = await nexasExchange(user.uid, "out", nx);
      if (res.ok) {
        setExMsg(`Sold ${fmtNumber(nx)} NexaCoin → ${fmtNumber(res.receivedCc ?? 0)} CC.`);
        setCoNexaAmount("");
        await refresh();
      } else {
        setExMsg(res.error ?? "Exchange failed.");
      }
    } catch (err) {
      setExMsg(`Exchange failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-950">
          <Coins className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nexa Wallet</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Powered by NexasPay — NexaCoin buys plans, gifts and more.
          </p>
        </div>
        <button onClick={() => refresh()} className="btn-secondary !px-3" title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Balance</p>
          <p className="mt-1 text-3xl font-bold">{fmtNumber(balance)} <span className="text-base font-semibold text-emerald-200">NexaCoin</span></p>
          <p className="mt-1 text-xs text-emerald-100">≈ K{fmtNumber(balance * rate)} · 1 coin ≈ K{rate}</p>
          <p className="mt-3 text-[11px] text-emerald-200">Wallet: {email}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pay for your plan</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["student", "teacher_full"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`rounded-lg border-2 px-3 py-2 text-left text-sm transition ${
                  plan === p
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950"
                    : "border-slate-200 hover:border-emerald-300 dark:border-slate-700"
                }`}
              >
                <span className="block font-semibold text-slate-800 dark:text-slate-200">{planName(p)}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {cfg.coinPrices[p] ?? PLANS[p]?.price} NexaCoin
                </span>
              </button>
            ))}
          </div>
          <button type="button" disabled={payBusy || balance < coinPrice} onClick={pay} className="btn-primary mt-3 w-full disabled:opacity-60">
            {payBusy ? "Paying…" : balance < coinPrice ? `Need ${coinPrice} NexaCoin` : `Pay ${coinPrice} NexaCoin for ${planName(plan)}`}
          </button>
          {payMsg && <p className={`mt-2 text-xs ${payMsg.includes("activated") ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>{payMsg}</p>}
        </div>
      </div>

      <div className="mt-6 card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <CreditCard className="h-5 w-5 text-emerald-600" /> Buy NexaCoin
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Pay K to {cfg.merchantNumber} (MTN/Airtel Money), then your coins arrive. Buy order is created instantly.
        </p>
        <form onSubmit={buy} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="block flex-1">
            <span className="label">Amount in Kwacha</span>
            <input className="input" type="number" min={5} value={buyK} onChange={(e) => setBuyK(e.target.value)} placeholder="50" />
          </label>
          <button type="submit" disabled={buyBusy} className="btn-primary disabled:opacity-60">
            {buyBusy ? "Placing order…" : "Buy coins"}
          </button>
        </form>
        {buyMsg && <p className={`mt-2 text-xs ${buyOk ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{buyMsg}</p>}
      </div>

      <div className="mt-6 card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <Repeat className="h-5 w-5 text-fuchsia-600" /> Exchange with CooperCoins
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Swap between CC and NexaCoin at the fixed rate —{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {fmtNumber(cfg.cc?.ccPerNexa ?? 50)} CC = 1 NexaCoin
          </span>
          . You have <span className="font-semibold">{fmtNumber(appUser?.coins ?? 0)} CC</span>.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <form onSubmit={exchangeIn} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">CC → NexaCoin</p>
            <div className="mt-2 flex items-end gap-2">
              <label className="block flex-1">
                <span className="label">CooperCoins</span>
                <input className="input" type="number" min={1} value={coCcAmount} onChange={(e) => setCoCcAmount(e.target.value)} placeholder="50" />
              </label>
              <button type="submit" disabled={exBusy} className="btn-primary disabled:opacity-60">
                {exBusy ? "…" : "Exchange"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Gives ≈ {fmtNumber(Number(coCcAmount) / (cfg.cc?.ccPerNexa ?? 50))} NexaCoin
            </p>
          </form>
          <form onSubmit={exchangeOut} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">NexaCoin → CC</p>
            <div className="mt-2 flex items-end gap-2">
              <label className="block flex-1">
                <span className="label">NexaCoin</span>
                <input className="input" type="number" min={1} value={coNexaAmount} onChange={(e) => setCoNexaAmount(e.target.value)} placeholder="1" />
              </label>
              <button type="submit" disabled={exBusy} className="btn-secondary disabled:opacity-60">
                {exBusy ? "…" : "Sell"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Gives ≈ {fmtNumber(Number(coNexaAmount) * (cfg.cc?.ccPerNexa ?? 50))} CC
            </p>
          </form>
        </div>
        {exMsg && <p className={`mt-2 text-xs ${exMsg.includes("Exchanged") || exMsg.includes("Sold") ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{exMsg}</p>}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <QrCode className="h-5 w-5 text-emerald-600" /> Receive (QR)
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Show this QR so others can scan and pay you.
          </p>
          <img
            src={nexasPayQrUrl(email)}
            alt={`NexaPay QR for ${email}`}
            className="mx-auto mt-3 h-44 w-44 rounded-lg border border-slate-200 dark:border-slate-700"
          />
          <p className="mt-2 truncate text-center text-xs text-slate-500 dark:text-slate-400">{email}</p>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Send className="h-5 w-5 text-emerald-600" /> Send coins
          </h2>
          <form onSubmit={send} className="mt-3 space-y-2">
            <label className="block">
              <span className="label">To (email or @username)</span>
              <input className="input" value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="friend@example.com or @friend" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="label">Coins</span>
                <input className="input" type="number" min={1} value={coinsToSend} onChange={(e) => setCoinsToSend(e.target.value)} placeholder="10" />
              </label>
              <label className="block">
                <span className="label">Memo (optional)</span>
                <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Lunch money" />
              </label>
            </div>
            <button type="submit" disabled={sendBusy} className="btn-primary w-full disabled:opacity-60">
              {sendBusy ? "Sending…" : "Send NexaCoin"}
            </button>
            {sendMsg && <p className={`text-xs ${sendMsg.startsWith("Sent") ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{sendMsg}</p>}
          </form>
        </div>
      </div>

      <div className="mt-6 card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <UserPlus className="h-5 w-5 text-emerald-600" /> @username
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Register a unique username so people can pay <span className="font-semibold">@{myUsername ?? "you"}</span> instead of typing your email.
        </p>
        {myUsername ? (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <BadgeCheck className="mr-1 inline h-4 w-4" />@{myUsername}
          </p>
        ) : (
          <form onSubmit={registerUsername} className="mt-2 flex gap-2">
            <input className="input flex-1" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="cool_username" />
            <button type="submit" disabled={profileBusy} className="btn-primary disabled:opacity-60">
              {profileBusy ? "…" : "Register"}
            </button>
          </form>
        )}
        {profileMsg && <p className={`mt-2 text-xs ${profileMsg.includes("registered") ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{profileMsg}</p>}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">History</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No transactions yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.slice(0, 12).map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-200">{tx.memo ?? tx.type}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(tx.at).toLocaleString()}</p>
                  </div>
                  <span className={`shrink-0 font-semibold ${Number(tx.coins) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {Number(tx.coins) >= 0 ? "+" : ""}{fmtNumber(Number(tx.coins))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Bell className="h-5 w-5 text-emerald-600" /> Notifications
          </h2>
          {notifs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Nothing new.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {notifs.slice(0, 8).map((n: any) => (
                <li key={n.id} className={`rounded-lg px-3 py-2 text-sm ${n.read ? "bg-slate-50 dark:bg-slate-800/50" : "bg-amber-50 dark:bg-amber-950/40"}`}>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{n.title ?? n.type}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                  {!n.read && (
                    <button onClick={() => { nexasMarkRead(email, n.id); setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x))); }} className="mt-1 text-xs font-semibold text-emerald-600 hover:underline">
                      Mark read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Powered by <span className="font-semibold text-emerald-600">NexasPay</span> — buy coins via MTN/Airtel, spend across the ZamAI ecosystem.
      </p>
    </div>
  );
}