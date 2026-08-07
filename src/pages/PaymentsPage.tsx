import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, CreditCard, Phone } from "lucide-react";
import { onValue, ref, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { PLANS, planName } from "../utils/plans";
import RedeemCard from "../components/RedeemCard";
import { PAYMENT_MERCHANT_NUMBER, API_URL } from "../config";
import type { PaymentRecord, PlanId } from "../types";

const MERCHANT_DISPLAY = `+260 ${PAYMENT_MERCHANT_NUMBER.slice(1, 3)} ${PAYMENT_MERCHANT_NUMBER.slice(3, 6)} ${PAYMENT_MERCHANT_NUMBER.slice(6)}`;

export default function PaymentsPage() {
  const { user, appUser, planId } = useAuth();
  const [method, setMethod] = useState<"mtn" | "airtel">("mtn");
  const [plan, setPlan] = useState<PlanId>("teacher_full");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState<PaymentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [myPayments, setMyPayments] = useState<Record<string, PaymentRecord> | null>(null);
  const [searchParams] = useSearchParams();
  const [momoEnabled, setMomoEnabled] = useState(false);
  const [momoBusy, setMomoBusy] = useState(false);
  const [momoMsg, setMomoMsg] = useState<string | null>(null);
  const [airtelEnabled, setAirtelEnabled] = useState(false);
  const [airtelBusy, setAirtelBusy] = useState(false);
  const [airtelMsg, setAirtelMsg] = useState<string | null>(null);
  const [dpoEnabled, setDpoEnabled] = useState(false);
  const [dpoBusy, setDpoBusy] = useState(false);
  const [dpoMsg, setDpoMsg] = useState<string | null>(null);

  const buyablePlans = Object.values(PLANS);
  const discount = appUser?.discount;

  useEffect(() => {
    fetch(`${API_URL}/api/momo/config`)
      .then((r) => r.json())
      .then((cfg) => setMomoEnabled(Boolean(cfg?.enabled)))
      .catch(() => setMomoEnabled(false));
    fetch(`${API_URL}/api/airtel/config`)
      .then((r) => r.json())
      .then((cfg) => setAirtelEnabled(Boolean(cfg?.enabled)))
      .catch(() => setAirtelEnabled(false));
    fetch(`${API_URL}/api/dpo/config`)
      .then((r) => r.json())
      .then((cfg) => setDpoEnabled(Boolean(cfg?.enabled)))
      .catch(() => setDpoEnabled(false));
  }, []);

  useEffect(() => {
    const dpoPayment = searchParams.get("dpo");
    if (!dpoPayment || !user) return;
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/payments/dpo-verify?paymentId=${encodeURIComponent(dpoPayment)}`);
        const data = await res.json();
        if (!cancelled && data?.status === "confirmed") {
          setDpoMsg("Payment confirmed! Your Teacher Full plan is now active.");
        } else if (!cancelled && data?.status === "requested") {
          setDpoMsg("Payment still processing — we'll activate your plan the moment DPO confirms it.");
        }
      } catch {
        /* ignore polling errors */
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [searchParams, user]);

  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (planParam && buyablePlans.some((p) => p.id === planParam)) {
      setPlan(planParam as PlanId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `payments/${user.uid}`), (snap) => {
      const val = snap.val() as Record<string, PaymentRecord> | null;
      setMyPayments(val ?? {});
    });
    return unsub;
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log in required</h1>
        <Link to="/login?next=/payments" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  const selectedPlan = buyablePlans.find((p) => p.id === plan);
  const basePrice = selectedPlan?.priceK ?? 0;
  const effectivePrice = discount ? Math.round((basePrice * (100 - discount.percent)) / 100) : basePrice;

  const removeDiscount = async () => {
    await set(ref(db, `users/${user?.uid}/discount`), null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !name.trim()) return;
    setBusy(true);
    const id = `pay-${Date.now()}`;
    const record: PaymentRecord = {
      id,
      uid: user.uid,
      email: user.email ?? "",
      planId: plan,
      amount: effectivePrice,
      method,
      phone: phone.trim(),
      status: "pending",
      createdAt: Date.now(),
    };
    await set(ref(db, `payments/${user.uid}/${id}`), record);
    if (discount) await set(ref(db, `users/${user.uid}/discount`), null);
    setSubmitted(record);
    setBusy(false);
  };

  const payWithDpo = async () => {
    setDpoBusy(true);
    setDpoMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/payments/request-dpo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, planId: plan, phone: phone.trim(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
      window.open(data.payUrl, "_blank", "noopener");
      setDpoMsg(
        "DPO checkout opened in a new tab — pay there with mobile money or card. Your plan activates automatically once DPO confirms the payment.",
      );
    } catch (err) {
      setDpoMsg(`DPO failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDpoBusy(false);
    }
  };

  const entries = myPayments ? Object.values(myPayments).sort((a, b) => b.createdAt - a.createdAt) : [];

  const payWithMomo = async () => {
    if (!phone.trim()) return;
    setMomoBusy(true);
    setMomoMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/payments/request-momo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, planId: plan, phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
      setMomoMsg(
        `Request sent! Check your phone (${phone.trim()}) and approve the MTN MoMo prompt for K${effectivePrice}. Your plan activates automatically once you confirm.`,
      );
    } catch (err) {
      setMomoMsg(`MTN MoMo failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setMomoBusy(false);
    }
  };

  const payWithAirtel = async () => {
    if (!phone.trim()) return;
    setAirtelBusy(true);
    setAirtelMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/payments/request-airtel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, planId: plan, phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
      setAirtelMsg(
        `Request sent! Check your phone (${phone.trim()}) and approve the Airtel Money prompt (USSD *778# or the app) for K${effectivePrice}. Your plan activates automatically once you approve.`,
      );
    } catch (err) {
      setAirtelMsg(`Airtel Money failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAirtelBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-950">
          <CreditCard className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upgrade your plan</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pay by mobile money — we'll activate your plan after confirmation.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <RedeemCard />
      </div>

      {discount && (
        <div className="mt-4 card flex flex-wrap items-center justify-between gap-3 border-emerald-400 p-4">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {discount.percent}% discount active (code {discount.code}) — applied at checkout.
          </p>
          <button type="button" onClick={removeDiscount} className="text-xs font-semibold text-red-500 hover:underline">
            Remove discount
          </button>
        </div>
      )}

      {submitted ? (
        <div className="mt-6 card p-6 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">Payment request sent!</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Send <span className="font-bold">K{effectivePrice}</span> to the number below using{" "}
            <span className="font-bold">{method === "mtn" ? "MTN" : "Airtel"} Money</span>, then we'll verify and
            activate your {selectedPlan?.name} plan.
          </p>
          <div className="mx-auto mt-4 max-w-sm rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">Transfer to (merchant number):</p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white">
              {MERCHANT_DISPLAY}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Reference: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{submitted.id}</span>
            </p>
          </div>
          <button onClick={() => setSubmitted(null)} className="btn-secondary mt-4">Done</button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 card space-y-4 p-6">
          <label className="block">
            <span className="label">Plan</span>
            <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as PlanId)}>
              {buyablePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — K{p.price}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Mobile money provider</span>
            <div className="grid grid-cols-2 gap-2">
              {(["mtn", "airtel"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition ${
                    method === m
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "border-slate-200 text-slate-600 hover:border-emerald-300 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Phone className="h-4 w-4" /> {m === "mtn" ? "MTN Money" : "Airtel Money"}
                </button>
              ))}
            </div>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Your full name</span>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="As it appears on your account" />
            </label>
            <label className="block">
              <span className="label">{method === "mtn" ? "MTN" : "Airtel"} number</span>
              <input className="input" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+260 97…" />
            </label>
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy
              ? "Submitting…"
              : discount
                ? `Pay K${effectivePrice} (was K${basePrice}) and request activation`
                : `Pay K${effectivePrice} and request activation`}
          </button>
          {momoEnabled && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Instant payment via MTN MoMo</p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                Enter your MTN number above, then tap the button — we'll send you a request-to-pay and
                activate your plan automatically the moment you approve it.
              </p>
              <button
                type="button"
                disabled={momoBusy}
                onClick={payWithMomo}
                className="btn-primary mt-3 w-full disabled:opacity-60"
              >
                {momoBusy ? "Sending request…" : `Pay now with MTN MoMo (K${effectivePrice})`}
              </button>
              {momoMsg && <p className={`mt-2 text-xs ${momoMsg.startsWith("MTN MoMo failed") ? "text-red-600 dark:text-red-400" : "text-emerald-800 dark:text-emerald-300"}`}>{momoMsg}</p>}
            </div>
          )}
          {airtelEnabled && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Instant payment via Airtel Money</p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                Enter your Airtel number above, then tap the button — we'll send you a push payment and
                activate your plan automatically the moment you approve it (USSD *778# or the Airtel Money app).
              </p>
              <button
                type="button"
                disabled={airtelBusy}
                onClick={payWithAirtel}
                className="btn-primary mt-3 w-full disabled:opacity-60"
              >
                {airtelBusy ? "Sending request…" : `Pay now with Airtel Money (K${effectivePrice})`}
              </button>
              {airtelMsg && <p className={`mt-2 text-xs ${airtelMsg.startsWith("Airtel Money failed") ? "text-red-600 dark:text-red-400" : "text-emerald-800 dark:text-emerald-300"}`}>{airtelMsg}</p>}
            </div>
          )}
          {dpoEnabled && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
              <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">Pay with DPO (mobile money or card)</p>
              <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-400">
                One checkout for MTN MoMo, Airtel Money, Zamtel Kwacha and Visa/Mastercard.
                We open DPO's hosted payment page — your plan activates automatically when it's paid.
              </p>
              <button
                type="button"
                disabled={dpoBusy}
                onClick={payWithDpo}
                className="btn-primary mt-3 w-full disabled:opacity-60"
              >
                {dpoBusy ? "Starting checkout…" : `Pay K${effectivePrice} with DPO`}
              </button>
              {dpoMsg && <p className={`mt-2 text-xs ${dpoMsg.startsWith("DPO failed") ? "text-red-600 dark:text-red-400" : "text-indigo-800 dark:text-indigo-300"}`}>{dpoMsg}</p>}
            </div>
          )}
          <p className="text-xs text-slate-400">
            Current plan: <span className="font-semibold">{planId}</span>. Manual payments are confirmed within 24 hours; MTN MoMo is instant.
          </p>
        </form>
      )}

      {entries.length > 0 && (
        <div className="mt-6 card p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">My payment requests</h2>
          <ul className="mt-3 space-y-2">
            {entries.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm dark:bg-slate-800/50">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {planName(p.planId)} — K{p.amount}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString()} · {p.method.toUpperCase()} · {p.phone}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === "confirmed" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400" : p.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"}`}>
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
