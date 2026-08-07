// CooperWeb API server — Express + firebase-admin.
// Endpoints:
//   GET  /api/health                        health check
//   GET  /api/stats                         counts (users, quizzes, papers, results)
//   GET  /api/quizzes                       public quiz list (for John Web)
//   GET  /api/payments                      [ADMIN] all payment requests
//   POST /api/payments/confirm              [ADMIN] confirm/reject a payment + activate plan
//   POST /api/broadcast                     [ADMIN] bell notifications + web pushes
//
// Admin endpoints require header: x-api-key: <ADMIN_API_KEY>
// Service account: env SERVICE_ACCOUNT_JSON (raw JSON) or file ./serviceAccountKey.json
import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getMessaging } from "firebase-admin/messaging";

const DATABASE_URL = process.env.VITE_FIREBASE_DATABASE_URL ?? "https://chikondi-dot-default-rtdb.firebaseio.com";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";
const PORT = process.env.PORT ?? 3000;

let serviceAccount;
if (process.env.SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
} else if (existsSync("./serviceAccountKey.json")) {
  serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));
} else if (existsSync("../serviceAccountKey.json")) {
  serviceAccount = JSON.parse(readFileSync("../serviceAccountKey.json", "utf8"));
} else {
  console.error("Missing service account. Set SERVICE_ACCOUNT_JSON env or add serviceAccountKey.json.");
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount), databaseURL: DATABASE_URL });
const db = getDatabase();

const app = express();
app.use(cors());
app.use(express.json());

const requireAdmin = (req, res, next) => {
  if (!ADMIN_API_KEY || req.get("x-api-key") !== ADMIN_API_KEY) {
    return res.status(401).json({ error: "Invalid or missing x-api-key" });
  }
  next();
};

const notifyUser = async (uid, payload) => {
  const now = Date.now();
  const nid = `n-${now}-${randomUUID().slice(0, 6)}`;
  await db.ref(`notifications/${uid}/${nid}`).set({
    id: nid,
    type: payload.type ?? "info",
    title: payload.title,
    message: payload.message,
    ...(payload.link ? { link: payload.link } : {}),
    read: false,
    createdAt: now,
  });
};

// ---------- MTN MoMo (Collection) ----------
const MOMO = {
  baseUrl: process.env.MTN_MOMO_BASE_URL ?? "https://sandbox.momodeveloper.mtn.com",
  subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY ?? "",
  userId: process.env.MTN_MOMO_USER_ID ?? "",
  userKey: process.env.MTN_MOMO_USER_KEY ?? "",
  targetEnv: process.env.MTN_MOMO_TARGET_ENV ?? "sandbox",
  callbackUrl: process.env.MTN_MOMO_CALLBACK_URL ?? "",
};
const MOMO_ENABLED = !!(MOMO.subscriptionKey && MOMO.userId && MOMO.userKey);
const PLAN_PRICES = { teacher_full: 200 };

let momoTokenCache = { token: null, expiresAt: 0 };

async function momoToken() {
  if (momoTokenCache.token && momoTokenCache.expiresAt > Date.now() + 60000) return momoTokenCache.token;
  const auth = Buffer.from(`${MOMO.userId}:${MOMO.userKey}`).toString("base64");
  const res = await fetch(`${MOMO.baseUrl}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Ocp-Apim-Subscription-Key": MOMO.subscriptionKey,
    },
  });
  if (!res.ok) throw new Error(`MTN token failed: ${res.status}`);
  const data = await res.json();
  momoTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

async function momoRequestToPay({ amount, externalId, payerPhone, payerMessage }) {
  const token = await momoToken();
  const referenceId = randomUUID();
  const res = await fetch(`${MOMO.baseUrl}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": referenceId,
      "X-Target-Environment": MOMO.targetEnv,
      "Ocp-Apim-Subscription-Key": MOMO.subscriptionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: { amount: String(amount), currency: "ZMW" },
      externalId,
      payer: { partyIdType: "MSISDN", partyId: payerPhone },
      payerMessage,
      payeeNote: "CooperWeb plan payment",
    }),
  });
  if (!res.ok) throw new Error(`MTN requesttopay failed: ${res.status}`);
  return referenceId;
}

async function momoRequestStatus(referenceId) {
  const token = await momoToken();
  const res = await fetch(`${MOMO.baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Target-Environment": MOMO.targetEnv,
      "Ocp-Apim-Subscription-Key": MOMO.subscriptionKey,
    },
  });
  if (!res.ok) throw new Error(`MTN status failed: ${res.status}`);
  return res.json();
}

const cleanMsisdn = (phone) => {
  const digits = String(phone).replace(/[^\d]/g, "").replace(/^00/, "");
  return digits.startsWith("260") ? digits : digits.startsWith("0") ? `260${digits.slice(1)}` : `260${digits}`;
};

// ---------- Airtel Money (Airtel Africa OpenAPI Collection) ----------
const AIRTEL = {
  baseUrl: process.env.AIRTEL_BASE_URL ?? "https://openapiuat.airtel.africa",
  clientId: process.env.AIRTEL_CLIENT_ID ?? "",
  clientSecret: process.env.AIRTEL_CLIENT_SECRET ?? "",
  notifyUrl: process.env.AIRTEL_NOTIFY_URL ?? "",
  pin: process.env.AIRTEL_MERCHANT_PIN ?? "",
  country: process.env.AIRTEL_COUNTRY ?? "ZM",
  currency: process.env.AIRTEL_CURRENCY ?? "ZMW",
};
const AIRTEL_ENABLED = !!(AIRTEL.clientId && AIRTEL.clientSecret);

let airtelTokenCache = { token: null, expiresAt: 0 };

async function airtelToken() {
  if (airtelTokenCache.token && airtelTokenCache.expiresAt > Date.now() + 60000) return airtelTokenCache.token;
  const res = await fetch(`${AIRTEL.baseUrl}/auth/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: AIRTEL.clientId,
      client_secret: AIRTEL.clientSecret,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Airtel token failed: ${res.status}`);
  const data = await res.json();
  airtelTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

async function airtelRequestToPay({ amount, reference, txId, payerPhone }) {
  const token = await airtelToken();
  const body = {
    reference,
    subscriber: { country: AIRTEL.country, currency: AIRTEL.currency, msisdn: payerPhone },
    transaction: {
      amount: String(amount),
      country: AIRTEL.country,
      currency: AIRTEL.currency,
      id: txId,
    },
    ...(AIRTEL.pin ? { pin: AIRTEL.pin } : {}),
    ...(AIRTEL.notifyUrl ? { notifyUrl: AIRTEL.notifyUrl } : {}),
  };
  const res = await fetch(`${AIRTEL.baseUrl}/merchant/v2/payments/${AIRTEL.country}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Country": AIRTEL.country,
      "X-Currency": AIRTEL.currency,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Airtel requesttopay failed: ${res.status}`);
  return res.json();
}

// ---------- DPO Group (Pay by Network — cards + MTN + Airtel + Zamtel) ----------
const DPO = {
  baseUrl: process.env.DPO_BASE_URL ?? "https://secure.3gdirectpay.com/API/v6/",
  payUrl: process.env.DPO_PAY_URL ?? "https://secure.3gdirectpay.com/pay.asp",
  companyToken: process.env.DPO_COMPANY_TOKEN ?? "",
  serviceType: process.env.DPO_SERVICE_TYPE ?? "",
  redirectUrl: process.env.DPO_REDIRECT_URL ?? "https://chikondi-dot.web.app",
  currency: process.env.DPO_CURRENCY ?? "ZMW",
};
const DPO_ENABLED = !!(DPO.companyToken && DPO.serviceType);

const dpoXml = new XMLParser({ ignoreAttributes: false });

async function dpoRequest(operation, fields) {
  const xml = new XMLBuilder({ ignoreAttributes: false }).build({
    API3G: {
      CompanyToken: DPO.companyToken,
      Request: operation,
      ...fields,
    },
  });
  const res = await fetch(DPO.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/xml; charset=utf-8", Accept: "application/xml" },
    body: xml,
  });
  if (!res.ok) throw new Error(`DPO ${operation} failed: ${res.status}`);
  return dpoXml.parse(await res.text()).API3G ?? {};
}

async function dpoCreateToken({ paymentId, amount, email, phone }) {
  const res = await dpoRequest("createToken", {
    Transaction: {
      PaymentAmount: String(amount),
      PaymentCurrency: DPO.currency,
      CompanyRef: paymentId,
      CompanyRefUnique: "1",
      PTL: "60",
      RedirectURL: `${DPO.redirectUrl}/payments?dpo=${paymentId}`,
      BackURL: `${DPO.redirectUrl}/payments?dpo=${paymentId}`,
      customerFirstName: email.split("@")[0] ?? "Customer",
      customerLastName: "",
      customerEmail: email,
      ...(phone ? { customerPhone: phone } : {}),
    },
    Services: {
      Service: {
        ServiceType: DPO.serviceType,
        ServiceDescription: "CooperWeb Teacher Full plan",
        ServiceDate: "2026/01/20 19:00",
      },
    },
  });
  if (res.Result !== "000" || !res.TransToken) {
    throw new Error(`DPO createToken: ${res.Result} ${res.ResultExplanation ?? ""}`.trim());
  }
  return res.TransToken;
}

async function dpoVerifyToken(transToken) {
  const res = await dpoRequest("verifyToken", { TransactionToken: transToken });
  return res;
}

const confirmPaidPlan = async ({ uid, paymentId, planId, txId, via }) => {
  const paymentSnap = await db.ref(`payments/${uid}/${paymentId}`).once("value");
  if (!paymentSnap.exists() || paymentSnap.val().status === "confirmed") return;
  await db.ref().update({
    [`payments/${uid}/${paymentId}/status`]: "confirmed",
    [`payments/${uid}/${paymentId}/confirmedAt`]: Date.now(),
    [`payments/${uid}/${paymentId}/momoTransactionId`]: txId,
    [`users/${uid}/plan`]: { id: planId, activatedAt: Date.now(), claimedVia: via },
  });
  await notifyUser(uid, {
    type: "payment",
    title: "Payment confirmed",
    message: `Your Teacher Full plan is now active. Welcome aboard!`,
    link: "/dashboard",
  });
};

const notifyAllUsers = async (payload) => {
  const snap = await db.ref("users").once("value");
  const users = snap.val() ?? {};
  const now = Date.now();
  const updates = {};
  for (const uid of Object.keys(users)) {
    const nid = `n-${now}-${randomUUID().slice(0, 6)}`;
    updates[`notifications/${uid}/${nid}`] = {
      id: nid,
      type: "announcement",
      title: payload.title,
      message: payload.message,
      ...(payload.link ? { link: payload.link } : {}),
      read: false,
      createdAt: now,
    };
  }
  await db.ref().update(updates);
};

const sendPushes = async ({ title, body, url }) => {
  const snap = await db.ref("pushTokens").once("value");
  const tokens = [];
  snap.forEach((child) => {
    const token = child.val()?.token;
    if (token) tokens.push(token);
  });
  if (tokens.length === 0) return { sent: 0, failures: 0 };
  const result = await getMessaging().sendEachForMulticast({
    notification: { title, body },
    ...(url ? { data: { url } } : {}),
    tokens,
  });
  return { sent: result.successCount, failures: result.failureCount };
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "cooperweb-api", time: Date.now() });
});

app.get("/api/stats", async (_req, res) => {
  try {
    const [users, quizzes, papers, results] = await Promise.all([
      db.ref("users").once("value"),
      db.ref("quizzes").once("value"),
      db.ref("papers").once("value"),
      db.ref("results").once("value"),
    ]);
    res.json({
      users: Object.keys(users.val() ?? {}).length,
      quizzes: Object.keys(quizzes.val() ?? {}).length,
      papers: Object.keys(papers.val() ?? {}).length,
      studentsWithResults: Object.keys(results.val() ?? {}).length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/quizzes", async (_req, res) => {
  try {
    const snap = await db.ref("quizzes").once("value");
    const quizzes = snap.val() ?? {};
    res.json({
      count: Object.keys(quizzes).length,
      quizzes: Object.values(quizzes).map((q) => ({
        id: q.id,
        title: q.title,
        subject: q.subject,
        year: q.year,
        questionCount: q.questions?.length ?? 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/payments", requireAdmin, async (_req, res) => {
  try {
    const snap = await db.ref("payments").once("value");
    res.json(snap.val() ?? {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/confirm  body: { uid, paymentId, status: "confirmed" | "rejected" }
app.post("/api/payments/confirm", requireAdmin, async (req, res) => {
  const { uid, paymentId, status } = req.body ?? {};
  if (!uid || !paymentId || !["confirmed", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Need uid, paymentId and status (confirmed|rejected)" });
  }
  try {
    const paymentSnap = await db.ref(`payments/${uid}/${paymentId}`).once("value");
    const payment = paymentSnap.val();
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    const updates = {
      [`payments/${uid}/${paymentId}/status`]: status,
      [`payments/${uid}/${paymentId}/confirmedAt`]: Date.now(),
    };
    if (status === "confirmed") {
      updates[`users/${uid}/plan`] = { id: payment.planId, activatedAt: Date.now(), claimedVia: "payment" };
    }
    await db.ref().update(updates);
    res.json({
      ok: true,
      status,
      planActivated: status === "confirmed" ? payment.planId : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/broadcast  body: { title, message, link }
app.post("/api/broadcast", requireAdmin, async (req, res) => {
  const { title, message, link } = req.body ?? {};
  if (!title || !message) return res.status(400).json({ error: "Need title and message" });
  try {
    await notifyAllUsers({ title, message, link });
    const push = await sendPushes({ title, body: message, url: link });
    res.json({ ok: true, bell: true, push });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/momo/config — tells the client whether MTN MoMo is wired up (public)
app.get("/api/momo/config", (_req, res) => {
  res.json({
    enabled: MOMO_ENABLED,
    targetEnv: MOMO.targetEnv,
    callbackUrl: MOMO.callbackUrl,
    plans: PLAN_PRICES,
  });
});

// POST /api/payments/request-momo  body: { uid, planId, phone }
// Public (caller is the signed-in user paying). Creates a "requested" payment
// and fires an MTN request-to-pay; the MTN callback auto-confirms it.
app.post("/api/payments/request-momo", async (req, res) => {
  if (!MOMO_ENABLED) return res.status(503).json({ error: "MTN MoMo is not configured yet" });
  const { uid, planId, phone } = req.body ?? {};
  const price = PLAN_PRICES[planId];
  if (!uid || !phone || !price) {
    return res.status(400).json({ error: "Need uid, planId and phone" });
  }
  const msisdn = cleanMsisdn(phone);
  if (!/^2609\d{8}$/.test(msisdn)) {
    return res.status(400).json({ error: "Invalid phone number (expected +260 9x xxx xxxx)" });
  }
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    if (!userSnap.exists()) return res.status(404).json({ error: "User not found" });
    const email = userSnap.val().email ?? "";
    const paymentId = `pay-${Date.now()}`;
    const payment = {
      id: paymentId,
      uid,
      email,
      planId,
      amount: price,
      method: "mtn-momo",
      phone: msisdn,
      status: "requested",
      createdAt: Date.now(),
    };
    await db.ref(`payments/${uid}/${paymentId}`).set(payment);
    const referenceId = await momoRequestToPay({
      amount: price,
      externalId: paymentId,
      payerPhone: msisdn,
      payerMessage: `CooperWeb Teacher Full (K${price})`,
    });
    await db.ref(`momo/requests/${referenceId}`).set({
      uid,
      paymentId,
      planId,
      status: "PENDING",
      createdAt: Date.now(),
    });
    await db.ref(`momo/byExternal/${paymentId}`).set(referenceId);
    res.json({ ok: true, paymentId, referenceId });
  } catch (err) {
    console.error("request-momo error:", err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/momo/callback — MTN MoMo pushes payment status here (no x-api-key!)
// Body: { externalId, status, financialTransactionId, ... } + X-MTN-Reference-Id header
app.post("/api/momo/callback", async (req, res) => {
  const body = req.body ?? {};
  const externalId = body.externalId;
  const refHeader = req.get("X-MTN-Reference-Id");
  if (!externalId && !refHeader) return res.status(200).json({ ok: true });
  res.status(200).json({ ok: true });
  try {
    const referenceId =
      refHeader || (await db.ref(`momo/byExternal/${externalId}`).once("value")).val();
    if (!referenceId) return;
    const status = await momoRequestStatus(referenceId);
    if (status?.status !== "SUCCESSFUL") return;
    const reqSnap = await db.ref(`momo/requests/${referenceId}`).once("value");
    const momoReq = reqSnap.val();
    if (!momoReq) return;
    const paymentSnap = await db.ref(`payments/${momoReq.uid}/${momoReq.paymentId}`).once("value");
    if (!paymentSnap.exists() || paymentSnap.val().status === "confirmed") return;
    await db.ref().update({
      [`payments/${momoReq.uid}/${momoReq.paymentId}/status`]: "confirmed",
      [`payments/${momoReq.uid}/${momoReq.paymentId}/confirmedAt`]: Date.now(),
      [`payments/${momoReq.uid}/${momoReq.paymentId}/momoTransactionId`]: status.financialTransactionId ?? "",
      [`users/${momoReq.uid}/plan`]: { id: momoReq.planId, activatedAt: Date.now(), claimedVia: "momo" },
      [`momo/requests/${referenceId}/status`]: "SUCCESSFUL",
    });
    await notifyUser(momoReq.uid, {
      type: "payment",
      title: "Payment confirmed",
      message: `Your Teacher Full plan is now active. Welcome aboard!`,
      link: "/dashboard",
    });
  } catch (err) {
    console.error("momo callback error:", err.message);
  }
});

// GET /api/airtel/config — whether Airtel Money auto-verify is wired up (public)
app.get("/api/airtel/config", (_req, res) => {
  res.json({
    enabled: AIRTEL_ENABLED,
    baseUrl: AIRTEL.baseUrl,
    notifyUrl: AIRTEL.notifyUrl,
    plans: PLAN_PRICES,
  });
});

// POST /api/payments/request-airtel  body: { uid, planId, phone }
app.post("/api/payments/request-airtel", async (req, res) => {
  if (!AIRTEL_ENABLED) return res.status(503).json({ error: "Airtel Money is not configured yet" });
  const { uid, planId, phone } = req.body ?? {};
  const price = PLAN_PRICES[planId];
  if (!uid || !phone || !price) {
    return res.status(400).json({ error: "Need uid, planId and phone" });
  }
  const msisdn = cleanMsisdn(phone);
  if (!/^2609\d{8}$/.test(msisdn)) {
    return res.status(400).json({ error: "Invalid phone number (expected +260 9x xxx xxxx)" });
  }
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    if (!userSnap.exists()) return res.status(404).json({ error: "User not found" });
    const email = userSnap.val().email ?? "";
    const paymentId = `pay-${Date.now()}`;
    const payment = {
      id: paymentId,
      uid,
      email,
      planId,
      amount: price,
      method: "airtel-api",
      phone: msisdn,
      status: "requested",
      createdAt: Date.now(),
    };
    await db.ref(`payments/${uid}/${paymentId}`).set(payment);
    const txId = `CW-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const response = await airtelRequestToPay({
      amount: price,
      reference: paymentId,
      txId,
      payerPhone: msisdn,
    });
    const returnedTxId = response?.transaction?.id ?? txId;
    await db.ref(`momo/airtelTxs/${returnedTxId}`).set({
      uid,
      paymentId,
      planId,
      reference: paymentId,
      status: "PENDING",
      createdAt: Date.now(),
    });
    res.json({ ok: true, paymentId, txId: returnedTxId });
  } catch (err) {
    console.error("request-airtel error:", err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/airtel/callback — Airtel Africa posts payment status here (no x-api-key!)
// Body: { transaction: { id, status, reference, ... }, ... } — status "TS" = success
app.post("/api/airtel/callback", async (req, res) => {
  const body = req.body ?? {};
  const txId = body?.transaction?.id ?? body?.id ?? body?.transactionId;
  if (!txId) return res.status(200).json({ status: "received" });
  res.status(200).json({ status: "received" });
  try {
    const statusCode = body?.transaction?.status ?? body?.status;
    const snap = await db.ref(`momo/airtelTxs/${txId}`).once("value");
    const tx = snap.val();
    if (!tx || statusCode !== "TS") return;
    const paymentSnap = await db.ref(`payments/${tx.uid}/${tx.paymentId}`).once("value");
    if (!paymentSnap.exists() || paymentSnap.val().status === "confirmed") return;
    await db.ref().update({
      [`payments/${tx.uid}/${tx.paymentId}/status`]: "confirmed",
      [`payments/${tx.uid}/${tx.paymentId}/confirmedAt`]: Date.now(),
      [`payments/${tx.uid}/${tx.paymentId}/momoTransactionId`]: txId,
      [`users/${tx.uid}/plan`]: { id: tx.planId, activatedAt: Date.now(), claimedVia: "airtel" },
      [`momo/airtelTxs/${txId}/status`]: "SUCCESSFUL",
    });
    await notifyUser(tx.uid, {
      type: "payment",
      title: "Payment confirmed",
      message: `Your Teacher Full plan is now active. Welcome aboard!`,
      link: "/dashboard",
    });
  } catch (err) {
    console.error("airtel callback error:", err.message);
  }
});

// GET /api/dpo/config — whether DPO gateway is wired up (public)
app.get("/api/dpo/config", (_req, res) => {
  res.json({
    enabled: DPO_ENABLED,
    currency: DPO.currency,
    plans: PLAN_PRICES,
  });
});

// POST /api/payments/request-dpo  body: { uid, planId, phone?, name? }
// Creates a "requested" payment, asks DPO for a checkout token, returns the
// hosted payment URL. DPO's pushPayments webhook auto-confirms the plan.
app.post("/api/payments/request-dpo", async (req, res) => {
  if (!DPO_ENABLED) return res.status(503).json({ error: "DPO is not configured yet" });
  const { uid, planId, phone, name } = req.body ?? {};
  const price = PLAN_PRICES[planId];
  if (!uid || !price) return res.status(400).json({ error: "Need uid and planId" });
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    if (!userSnap.exists()) return res.status(404).json({ error: "User not found" });
    const email = userSnap.val().email ?? "";
    const paymentId = `pay-${Date.now()}`;
    const payment = {
      id: paymentId,
      uid,
      email,
      planId,
      amount: price,
      method: "dpo",
      phone: phone ?? "",
      status: "requested",
      createdAt: Date.now(),
    };
    await db.ref(`payments/${uid}/${paymentId}`).set(payment);
    const transToken = await dpoCreateToken({
      paymentId,
      amount: price,
      email,
      phone: cleanMsisdn(phone ?? ""),
    });
    await db.ref(`momo/dpoTxs/${transToken}`).set({
      uid,
      paymentId,
      planId,
      status: "PENDING",
      createdAt: Date.now(),
    });
    await db.ref(`momo/dpoByPayment/${paymentId}`).set(transToken);
    res.json({ ok: true, paymentId, transToken, payUrl: `${DPO.payUrl}?ID=${transToken}` });
  } catch (err) {
    console.error("request-dpo error:", err.message);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/payments/dpo-verify?paymentId=... — poll status after checkout return
app.get("/api/payments/dpo-verify", async (req, res) => {
  const { paymentId } = req.query;
  if (!paymentId) return res.status(400).json({ error: "Need paymentId" });
  try {
    const tokenSnap = await db.ref(`momo/dpoByPayment/${paymentId}`).once("value");
    const transToken = tokenSnap.val();
    const paymentsSnap = await db.ref("payments").once("value");
    let payment = null;
    paymentsSnap.forEach((uidChild) => {
      const byUser = uidChild.val() ?? {};
      if (byUser[paymentId]) {
        payment = byUser[paymentId];
        return true;
      }
      return false;
    });
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.status !== "confirmed" && transToken) {
      try {
        const verified = await dpoVerifyToken(transToken);
        if (verified.Result === "000") {
          await confirmPaidPlan({
            uid: payment.uid,
            paymentId,
            planId: payment.planId,
            txId: transToken,
            via: "dpo",
          });
          payment = { ...payment, status: "confirmed" };
        }
      } catch (err) {
        console.error("dpo verify error:", err.message);
      }
    }
    res.json({ ok: true, status: payment.status, planId: payment.planId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dpo/callback — DPO pushPayments webhook (XML, no x-api-key!)
app.post("/api/dpo/callback", express.text({ type: () => true }), async (req, res) => {
  const okXml = `<?xml version="1.0" encoding="utf-8"?>\n<API3G><Response>OK</Response></API3G>`;
  try {
    const parsed = dpoXml.parse(req.body ?? "").API3G ?? {};
    const transToken = parsed.TransactionToken;
    const paymentRef = parsed.TransactionRef ?? parsed.CompanyRef;
    if (!transToken || !paymentRef) return res.type("application/xml").send(okXml);
    res.type("application/xml").send(okXml);
    try {
      const verified = await dpoVerifyToken(transToken);
      if (verified.Result !== "000") return;
      const txSnap = await db.ref(`momo/dpoTxs/${transToken}`).once("value");
      const tx = txSnap.val();
      if (!tx) return;
      await db.ref(`momo/dpoTxs/${transToken}/status`).set("SUCCESSFUL");
      await confirmPaidPlan({ uid: tx.uid, paymentId: tx.paymentId, planId: tx.planId, txId: transToken, via: "dpo" });
    } catch (err) {
      console.error("dpo callback processing error:", err.message);
    }
  } catch (err) {
    console.error("dpo callback parse error:", err.message);
    res.status(200).type("application/xml").send(okXml);
  }
});

app.listen(PORT, () => {
  console.log(`CooperWeb API listening on port ${PORT}`);
});
