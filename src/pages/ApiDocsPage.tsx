import { Link } from "react-router-dom";
import { BookOpen, FileText, Lock, Mail, ShieldCheck } from "lucide-react";
import { API_URL } from "../config";
import { PLANS, hasInteractiveAccess, PLAN_LEVEL } from "../utils/plans";
import type { PlanId } from "../types";

interface Endpoint {
  method: "GET" | "POST" | "PUT";
  path: string;
  auth: string;
  body?: string;
  description: string;
}

const ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/api/health", auth: "public", description: "Server health check." },
  { method: "GET", path: "/api/stats", auth: "public", description: "Platform stats (users, quizzes taken, coins given out)." },
  { method: "GET", path: "/api/quizzes", auth: "public", description: "Full quiz catalog with questions and answers." },
  { method: "GET", path: "/api/people", auth: "public", description: "Member directory (displayName, avatar, role, planId, coins)." },
  { method: "GET", path: "/api/market/items", auth: "public", description: "Market item catalogue with live prices and sales." },
  { method: "GET", path: "/api/trade/listings", auth: "public", description: "Active trade listings." },
  { method: "GET", path: "/api/card?uid=…", auth: "public", description: "A user's CooperCard details (number, pin set, tier)." },
  { method: "GET", path: "/api/payments/history?uid=…", auth: "public", description: "One user's payment records." },
  { method: "GET", path: "/api/payments/dpo-verify?paymentId=…", auth: "public", description: "Poll a DPO payment status (requested | confirmed)." },
  { method: "GET", path: "/api/momo/config", auth: "public", description: "Whether MTN MoMo auto-verification is enabled." },
  { method: "GET", path: "/api/airtel/config", auth: "public", description: "Whether Airtel Money auto-verification is enabled." },
  { method: "GET", path: "/api/dpo/config", auth: "public", description: "Whether the DPO gateway is enabled." },
  { method: "GET", path: "/api/nexas/config", auth: "public", description: "NexasPay status, live NexaCoin rate, plan coin prices." },
  { method: "GET", path: "/api/nexas/wallet?email=…", auth: "public", description: "A user's NexaCoin wallet (auto-creates; mirrored to Firebase nexas/wallets)." },
  { method: "GET", path: "/api/nexas/profile/lookup?username=…", auth: "public", description: "Resolve an @username to a NexaPay profile." },
  { method: "GET", path: "/api/nexas/profiles/search?q=…", auth: "public", description: "Search NexaPay @usernames." },
  { method: "GET", path: "/api/nexas/notifications?email=…", auth: "public", description: "A wallet's NexasPay notifications." },
  { method: "GET", path: "/api/trade/admin/listings", auth: "admin", description: "All listings including expired/flagged, for moderation." },
  { method: "GET", path: "/api/payments", auth: "admin", description: "All payment records, newest first." },
  {
    method: "POST",
    path: "/api/gift",
    auth: "user",
    body: "{ uid, toUid, amount }",
    description: "Send CooperCoins to another user (capped at 50 CC/day).",
  },
  {
    method: "POST",
    path: "/api/earn",
    auth: "user",
    body: "{ uid, quizId, submissionId, score, total }",
    description: "Award CooperCoins for a saved quiz result (verified against results/<uid>).",
  },
  {
    method: "POST",
    path: "/api/redeem",
    auth: "user",
    body: "{ uid, code }",
    description: "Redeem a gift/promo/discount/pack/market/coins code.",
  },
  {
    method: "POST",
    path: "/api/payments/create",
    auth: "user",
    body: "{ uid, planId, method (mtn|airtel), phone, email?, amount? }",
    description: "Create a pending manual payment record (amount defaults to the plan price).",
  },
  {
    method: "POST",
    path: "/api/payments/request-momo",
    auth: "user",
    body: "{ uid, planId, phone }",
    description: "Fire an MTN MoMo request-to-pay; plan activates on callback.",
  },
  {
    method: "POST",
    path: "/api/payments/request-airtel",
    auth: "user",
    body: "{ uid, planId, phone }",
    description: "Fire an Airtel Money push payment; plan activates on callback.",
  },
  {
    method: "POST",
    path: "/api/payments/request-dpo",
    auth: "user",
    body: "{ uid, planId, phone?, name? }",
    description: "Create a DPO payment token; customer pays on DPO's hosted page.",
  },
  {
    method: "POST",
    path: "/api/nexas/charge",
    auth: "user",
    body: "{ uid, planId }",
    description: "Pay for a plan with NexaCoin — deducts the wallet and activates the plan instantly.",
  },
  {
    method: "POST",
    path: "/api/nexas/buy",
    auth: "user",
    body: "{ email, amountK }",
    description: "Create a NexaCoin buy order (pay the merchant number via MTN/Airtel).",
  },
  {
    method: "POST",
    path: "/api/nexas/sell",
    auth: "user",
    body: "{ email, coins }",
    description: "Sell NexaCoin for mobile money.",
  },
  {
    method: "POST",
    path: "/api/nexas/transfer",
    auth: "user",
    body: "{ uid, toEmail, coins, memo? }",
    description: "Send NexaCoin to another wallet (QR / @username payments).",
  },
  {
    method: "POST",
    path: "/api/nexas/credit",
    auth: "user",
    body: "{ uid, coins, memo? }",
    description: "Reward a user's NexaCoin wallet.",
  },
  {
    method: "POST",
    path: "/api/nexas/profile",
    auth: "user",
    body: "{ uid, username }",
    description: "Register an @username for easy payments.",
  },
  {
    method: "POST",
    path: "/api/nexas/notifications/read",
    auth: "user",
    body: "{ email, id }",
    description: "Mark a NexasPay notification as read.",
  },
  {
    method: "POST",
    path: "/api/nexas/subscribe",
    auth: "user",
    body: "{ uid, subscriptionId }",
    description: "Subscribe to a NexasPay recurring plan.",
  },
  {
    method: "POST",
    path: "/api/nexas/cancel",
    auth: "user",
    body: "{ uid, subscriptionId }",
    description: "Cancel a NexasPay subscription.",
  },
  {
    method: "POST",
    path: "/api/market/purchase",
    auth: "user",
    body: "{ uid, itemId, pin? }",
    description: "Buy a Market item with CooperCoins (PIN required for high-value items).",
  },
  {
    method: "POST",
    path: "/api/trade/list",
    auth: "user",
    body: "{ uid, itemId, priceCC, reason? }",
    description: "List a cosmetic item (frame/badge/overlay) for sale in the Trading Post.",
  },
  {
    method: "POST",
    path: "/api/trade/offer",
    auth: "user",
    body: "{ fromUid, toUid, itemId, priceCC, reason? }",
    description: "Send a trade offer to another user.",
  },
  {
    method: "PUT",
    path: "/api/trade/accept",
    auth: "user",
    body: "{ uid, offerId }",
    description: "Accept a trade offer — transfers the item and coins.",
  },
  {
    method: "PUT",
    path: "/api/trade/decline",
    auth: "user",
    body: "{ uid, offerId }",
    description: "Decline a trade offer.",
  },
  {
    method: "POST",
    path: "/api/trade/accepted",
    auth: "user",
    body: "{ fromUid, offerId }",
    description: "Mark an accepted trade as delivered by the seller.",
  },
  {
    method: "PUT",
    path: "/api/trade/confirm",
    auth: "user",
    body: "{ toUid, offerId }",
    description: "Buyer confirms receipt — releases the coins to the seller.",
  },
  {
    method: "POST",
    path: "/api/card/pin",
    auth: "user",
    body: "{ uid, pin }",
    description: "Create or change the 4-digit CooperCard PIN.",
  },
  {
    method: "POST",
    path: "/api/payments/confirm",
    auth: "admin",
    body: "{ paymentId, uid, planId, txId?, via? }",
    description: "Manually confirm a payment and activate the plan (x-api-key).",
  },
  {
    method: "POST",
    path: "/api/admin/coins",
    auth: "admin",
    body: "{ uid, amount }",
    description: "Adjust a user's CooperCoins (positive or negative) (x-api-key).",
  },
  {
    method: "POST",
    path: "/api/broadcast",
    auth: "admin",
    body: "{ title, body, type? }",
    description: "Bell notification + FCM push to all users (x-api-key).",
  },
  {
    method: "PUT",
    path: "/api/trade/admin/cancel",
    auth: "admin",
    body: "{ listingId }",
    description: "Cancel/remove a trade listing (moderation) (x-api-key).",
  },
  { method: "POST", path: "/api/momo/callback", auth: "webhook", description: "MTN MoMo result callback (no x-api-key)." },
  { method: "POST", path: "/api/airtel/callback", auth: "webhook", description: "Airtel result callback (no x-api-key)." },
  { method: "POST", path: "/api/dpo/callback", auth: "webhook", description: "DPO pushPayments webhook, XML body (no x-api-key)." },
];

const METHOD_STYLE: Record<Endpoint["method"], string> = {
  GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  POST: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
  PUT: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
};

const AUTH_STYLE: Record<string, string> = {
  public: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  user: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  webhook: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
};

function planRow(planId: PlanId, price: string, unlocks: string[]) {
  return (
    <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {PLANS[planId as keyof typeof PLANS]?.name ?? planId}
        </h3>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          {price}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
        {unlocks.map((u) => (
          <li key={u} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            {u}
          </li>
        ))}
      </ul>
      {planId !== "free" && (
        <p className="mt-3 text-xs font-semibold text-slate-400 dark:text-slate-500">
          PLAN_LEVEL {PLAN_LEVEL[planId]} · interactive:{" "}
          {hasInteractiveAccess(planId) ? "yes" : "no"}
        </p>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-950">
          <BookOpen className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">API Docs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Plans, access levels and endpoints for CooperWeb — base URL{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{API_URL}</code>
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Plans & access levels</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          The free tier is read-only. <span className="font-semibold">hasInteractiveAccess(planId)</span> is
          true for plans with <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">PLAN_LEVEL &gt;= 1</code>{" "}
          and gates quizzes, progress, Market, Card, Trading and Challenges on the client.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {planRow("free", "K0", [
            "Browse papers, notes, quizzes and the leaderboard",
            "Quiz previews (questions visible, answers locked)",
            "People directory, profiles, referrals, John Web",
          ])}
          {planRow("student", "K50", [
            "Take quizzes, save results, leaderboard scoring",
            "Dashboard, progress tracking & reports",
            "CooperCoins Market, My Card, Trading Post",
            "Challenges and gifting",
          ])}
          {planRow("teacher_full", "K200", [
            "Everything in Student",
            "Marking schemes",
            "Premium quizzes",
            "Priority support",
          ])}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
          <ShieldCheck className="h-5 w-5 text-emerald-600" /> Authentication
        </h2>
        <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            Most user endpoints take a <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">uid</code> in
            the body and trust it — pair them with Firebase Authentication on the client.
          </p>
          <p className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            Admin endpoints require the <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">x-api-key</code> header
            (set as <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">ADMIN_API_KEY</code> on the server).
          </p>
          <p className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            Webhook endpoints are called by MTN / Airtel / DPO and need no key.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Endpoints</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          All endpoints live on the Express server at{" "}
          <Link to="/payments" className="font-semibold text-emerald-600 hover:underline">
            {API_URL}
          </Link>{" "}
          (JSON unless noted).
        </p>
        <div className="mt-4 space-y-3">
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${METHOD_STYLE[e.method]}`}>{e.method}</span>
                <code className="rounded bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  {e.path}
                </code>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${AUTH_STYLE[e.auth] ?? AUTH_STYLE.public}`}>
                  {e.auth}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{e.description}</p>
              {e.body && (
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  body: <code className="text-slate-500 dark:text-slate-400">{e.body}</code>
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-lg bg-emerald-50 p-6 dark:bg-emerald-950/40">
        <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-300">Making a request</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
{`fetch("${API_URL}/api/earn", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ uid: "USER_UID", quizId: "Q_ID", submissionId: "SUB_ID", score: 42, total: 50 }),
})
  .then((r) => r.json())
  .then((data) => console.log(data.earned, data.balance));`}
        </pre>
      </section>
    </div>
  );
}
