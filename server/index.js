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
import { randomUUID, randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import express from "express";
import cors from "cors";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase, ServerValue } from "firebase-admin/database";
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
app.set("trust proxy", true); // Render terminates TLS; keep req.protocol honest (https)
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
const PLAN_PRICES = { student: 50, teacher_full: 200 };

const COINS_PER_CORRECT = 1;
const STREAK_BONUS_PER_DAY = 2;
const STREAK_BONUS_MAX = 20;
const FIRST_OF_DAY_BONUS = 5;
const PERFECT_BONUS = 10;
const REFERRAL_BONUS = 20;
const GIFT_DAILY_CAP = 50;

const MARKET_ITEMS = {
  "frame-emerald": { name: "Emerald Avatar Ring", price: 30, kind: "frame" },
  "frame-sunset": { name: "Sunset Avatar Ring", price: 60, kind: "frame" },
  "frame-gold": { name: "Gold Avatar Ring", price: 120, kind: "frame" },
  "frame-neon": { name: "Neon Avatar Ring", price: 90, kind: "frame" },
  "frame-ice": { name: "Ice Avatar Ring", price: 100, kind: "frame" },
  "frame-rainbow": { name: "Rainbow Avatar Ring", price: 180, kind: "frame" },
  "frame-royal": { name: "Royal Avatar Ring", price: 150, kind: "frame" },
  "frame-glow": { name: "Glow Boost", price: 60, kind: "frame" },
  "frame-pulse": { name: "Pulsing Ring", price: 140, kind: "frame" },
  "name-emerald": { name: "Emerald Name", price: 40, kind: "name_color" },
  "name-sky": { name: "Sky Name", price: 50, kind: "name_color" },
  "name-sunset": { name: "Sunset Name", price: 70, kind: "name_color" },
  "name-gold": { name: "Gold Name", price: 120, kind: "name_color" },
  "design-ocean": { name: "Ocean Card Design", price: 60, kind: "card_design" },
  "design-sunset": { name: "Sunset Card Design", price: 80, kind: "card_design" },
  "design-midnight": { name: "Midnight Card Design", price: 150, kind: "card_design" },
  "design-forest": { name: "Forest Card Design", price: 90, kind: "card_design" },
  "design-crimson": { name: "Crimson Card Design", price: 100, kind: "card_design" },
  "design-royal": { name: "Royal Card Design", price: 120, kind: "card_design" },
  "design-goldfoil": { name: "Gold Foil Card Design", price: 200, kind: "card_design" },
  "design-holo": { name: "Holographic Card Design", price: 250, kind: "card_design" },
  "chip-gold": { name: "Gold Chip", price: 80, kind: "chip" },
  "chip-silver": { name: "Silver Chip", price: 50, kind: "chip" },
  "pattern-dots": { name: "Dot Pattern", price: 70, kind: "pattern" },
  "pattern-waves": { name: "Wave Pattern", price: 70, kind: "pattern" },
  "pattern-grid": { name: "Grid Pattern", price: 70, kind: "pattern" },
  "badge-quizmaster": { name: "Quiz Master Badge", price: 200, kind: "badge" },
  "badge-perfect": { name: "Perfect 10 Badge", price: 250, kind: "badge" },
  "badge-rising-star": { name: "Rising Star Badge", price: 150, kind: "badge" },
  "badge-bookworm": { name: "Bookworm Badge", price: 180, kind: "badge" },
  "badge-speed": { name: "Speed Demon Badge", price: 250, kind: "badge" },
  "badge-sharp": { name: "Sharp Shooter Badge", price: 300, kind: "badge" },
  "badge-grind": { name: "Grind Master Badge", price: 400, kind: "badge" },
  "badge-teacher": { name: "Teacher's Pet Badge", price: 350, kind: "badge" },
  "badge-scholar": { name: "Scholar Badge", price: 450, kind: "badge" },
  "badge-legend": { name: "Legend Badge", price: 500, kind: "badge" },
  "overlay-cap": { name: "Graduation Cap", price: 80, kind: "overlay" },
  "overlay-headphones": { name: "Headphones", price: 100, kind: "overlay" },
  "overlay-crown": { name: "Crown", price: 150, kind: "overlay" },
  "banner-sky": { name: "Sky Banner", price: 40, kind: "banner" },
  "banner-violet": { name: "Violet Banner", price: 50, kind: "banner" },
  "banner-sunset": { name: "Sunset Banner", price: 60, kind: "banner" },
  "banner-gold": { name: "Gold Banner", price: 120, kind: "banner" },
  "status-fire": { name: "On Fire Status", price: 50, kind: "status" },
  "status-star": { name: "Star Status", price: 50, kind: "status" },
  "status-bolt": { name: "Bolt Status", price: 80, kind: "status" },
  "status-book": { name: "Book Status", price: 50, kind: "status" },
  "status-crown": { name: "Crown Status", price: 120, kind: "status" },
  "confetti-gold": { name: "Result Confetti", price: 100, kind: "confetti" },
  "timer-neon": { name: "Neon Timer", price: 60, kind: "timer_skin" },
  "timer-ocean": { name: "Ocean Timer", price: 80, kind: "timer_skin" },
  "lb-glow": { name: "Leaderboard Glow", price: 150, kind: "lb_glow" },
  "mult-2x-day": { name: "2x Coins (24h)", price: 100, kind: "multiplier", mult: 2, durationHours: 24 },
  "mult-3x-hour": { name: "3x Coins (1h)", price: 60, kind: "multiplier", mult: 3, durationHours: 1 },
  "bundle-starter": { name: "Starter Bundle", price: 150, kind: "bundle", grants: ["frame-emerald", "badge-rising-star"] },
  "bundle-star": { name: "Star Bundle", price: 350, kind: "bundle", grants: ["frame-gold", "design-goldfoil", "badge-quizmaster"] },
  "bundle-scholar": { name: "Scholar Bundle", price: 500, kind: "bundle", grants: ["design-royal", "badge-scholar", "name-gold", "banner-gold"] },
};

function applyItemEffect(updates, uid, itemId) {
  const item = MARKET_ITEMS[itemId];
  if (!item) return;
  if (item.kind === "frame") updates[`users/${uid}/avatarFrame`] = itemId;
  if (item.kind === "name_color") updates[`users/${uid}/nameColor`] = itemId;
  if (item.kind === "card_design") updates[`users/${uid}/cardDesign`] = itemId;
  if (item.kind === "chip") updates[`users/${uid}/chipColor`] = itemId;
  if (item.kind === "pattern") updates[`users/${uid}/cardPattern`] = itemId;
  if (item.kind === "overlay") updates[`users/${uid}/avatarOverlay`] = itemId;
  if (item.kind === "banner") updates[`users/${uid}/bannerColor`] = itemId;
  if (item.kind === "status") updates[`users/${uid}/statusEmoji`] = itemId;
  if (item.kind === "confetti") updates[`users/${uid}/confettiOwned`] = true;
  if (item.kind === "timer_skin") updates[`users/${uid}/timerSkin`] = itemId;
  if (item.kind === "lb_glow") updates[`users/${uid}/lbGlow`] = true;
  if (item.kind === "multiplier") {
    updates[`users/${uid}/coinsMultiplier`] = {
      mult: item.mult ?? 2,
      expiresAt: Date.now() + (item.durationHours ?? 24) * 3600000,
    };
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const CARD_NUMBER_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCardNumber() {
  let out = "CW-";
  for (let i = 0; i < 3; i++) {
    let group = "";
    for (let j = 0; j < 4; j++) {
      group += CARD_NUMBER_CHARS[Math.floor(Math.random() * CARD_NUMBER_CHARS.length)];
    }
    out += group;
    if (i < 2) out += "-";
  }
  return out;
}

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

// GET /api/people — public member directory: uid, displayName, avatarUrl, role, planId, bio
// plus public cosmetics (frame, overlay, name color, status emoji, badges) and coin balance.
// (never exposes emails or other private fields; users node is admin-only in the DB rules)
app.get("/api/people", async (_req, res) => {
  try {
    const [usersSnap, profilesSnap] = await Promise.all([
      db.ref("users").once("value"),
      db.ref("profiles").once("value"),
    ]);
    const users = usersSnap.val() ?? {};
    const profiles = profilesSnap.val() ?? {};
    const people = Object.entries(users)
      .map(([uid, u]) => {
        const p = profiles[uid] ?? {};
        const displayName = u.displayName || u.email?.split("@")[0] || "";
        return {
          uid,
          displayName,
          avatarUrl: u.avatarUrl || p.avatarUrl || "",
          role: u.role ?? "user",
          planId: u.plan?.id ?? "free",
          bio: p.bio ?? "",
          coins: Number(u.coins) || 0,
          avatarFrame: u.avatarFrame ?? "",
          avatarOverlay: u.avatarOverlay ?? "",
          nameColor: u.nameColor ?? "",
          statusEmoji: u.statusEmoji ?? "",
          bannerColor: u.bannerColor ?? "",
          showcasedBadges: u.showcasedBadges ?? [],
          showcasedCard: Boolean(u.showcasedCard),
        };
      })
      .filter((p) => p.displayName)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    res.json({ count: people.length, people });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gift  body: { uid, toUid, amount }
// Public: send CooperCoins to another member. Daily cap enforced; server deducts
// from sender and credits recipient with a ledger entry each.
app.post("/api/gift", async (req, res) => {
  const { uid, toUid, amount } = req.body ?? {};
  const amt = Number(amount);
  if (!uid || !toUid || !Number.isInteger(amt) || amt <= 0) {
    return res.status(400).json({ error: "Need uid, toUid and a positive integer amount" });
  }
  if (uid === toUid) return res.status(400).json({ error: "You cannot gift yourself" });
  if (amt > GIFT_DAILY_CAP) return res.status(400).json({ error: `Gifts are capped at ${GIFT_DAILY_CAP} CC per day` });
  try {
    const [senderSnap, recipientSnap, givenSnap] = await Promise.all([
      db.ref(`users/${uid}`).once("value"),
      db.ref(`users/${toUid}`).once("value"),
      db.ref(`gifts/${uid}`).once("value"),
    ]);
    const sender = senderSnap.val();
    const recipient = recipientSnap.val();
    if (!sender || !recipient) return res.status(404).json({ error: "User not found" });
    if ((Number(sender.coins) || 0) < amt) return res.status(400).json({ error: "Not enough CooperCoins" });
    const today = todayKey();
    const givenToday = (givenSnap.val() ?? {})[today] ?? 0;
    if (givenToday + amt > GIFT_DAILY_CAP) {
      return res.status(400).json({ error: `Gift limit reached (${GIFT_DAILY_CAP} CC per day)` });
    }
    const giftId = `gift-${Date.now()}-${randomUUID().slice(0, 6)}`;
    await db.ref().update({
      [`users/${uid}/coins`]: ServerValue.increment(-amt),
      [`users/${toUid}/coins`]: ServerValue.increment(amt),
      [`gifts/${uid}/${today}`]: ServerValue.increment(amt),
      [`coinsLedger/${uid}/${giftId}`]: { amount: -amt, type: "gift_sent", at: Date.now(), ref: toUid },
      [`coinsLedger/${toUid}/${giftId}`]: { amount: amt, type: "gift_received", at: Date.now(), ref: uid },
    });
    res.json({ ok: true, gifted: amt, balance: (Number(sender.coins) || 0) - amt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/coins  body: { uid, amount, reason? } — admin only.
// Manually add or remove CooperCoins (positive = credit, negative = debit).
app.post("/api/admin/coins", requireAdmin, async (req, res) => {
  const { uid, amount, reason } = req.body ?? {};
  const amt = Number(amount);
  if (!uid || !Number.isFinite(amt) || amt === 0) {
    return res.status(400).json({ error: "Need uid and a non-zero amount" });
  }
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    if (!userSnap.exists()) return res.status(404).json({ error: "User not found" });
    const balance = (await db.ref(`users/${uid}/coins`).once("value")).val() ?? 0;
    if (amt < 0 && balance + amt < 0) {
      return res.status(400).json({ error: "Balance would go negative" });
    }
    const adjId = `adj-${Date.now()}-${randomUUID().slice(0, 6)}`;
    await db.ref().update({
      [`users/${uid}/coins`]: ServerValue.increment(amt),
      [`coinsLedger/${uid}/${adjId}`]: {
        amount: amt,
        type: "admin",
        at: Date.now(),
        ref: reason ?? "manual adjustment",
      },
    });
    res.json({ ok: true, adjusted: amt, balance: balance + amt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/payments", requireAdmin, async (_req, res) => {
  try {
    const [paymentsSnap, usersSnap] = await Promise.all([
      db.ref("payments").once("value"),
      db.ref("users").once("value"),
    ]);
    const payments = paymentsSnap.val() ?? {};
    const users = usersSnap.val() ?? {};
    for (const uid of Object.keys(payments)) {
      for (const pid of Object.keys(payments[uid])) {
        const rec = payments[uid][pid];
        rec.displayName = users[uid]?.displayName ?? "";
      }
    }
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/create  body: { uid, planId, method, phone, email?, amount? }
// Public: student clicked "Pay now" — record is created server-side (no client DB auth needed).
app.post("/api/payments/create", async (req, res) => {
  const { uid, planId, method, phone, email, amount } = req.body ?? {};
  if (!uid || !planId || !["mtn", "airtel"].includes(method) || !phone) {
    return res.status(400).json({ error: "Need uid, planId, method (mtn|airtel) and phone" });
  }
  try {
    const id = `pay-${Date.now()}`;
    const record = {
      id,
      uid,
      email: email ?? "",
      planId,
      amount: Number(amount) || PLAN_PRICES[planId] || 200,
      method,
      phone: String(phone),
      status: "pending",
      createdAt: Date.now(),
    };
    await db.ref(`payments/${uid}/${id}`).set(record);
    res.json({ ok: true, id, record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/history?uid=... — one user's payment records (public)
app.get("/api/payments/history", async (req, res) => {
  const uid = String(req.query.uid ?? "");
  if (!uid) return res.status(400).json({ error: "Need uid" });
  try {
    const snap = await db.ref(`payments/${uid}`).once("value");
    res.json(snap.val() ?? {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/redeem  body: { uid, code }
// Public: redeems a gift/promo/discount/pack code server-side (no client DB auth needed).
app.post("/api/redeem", async (req, res) => {
  const { uid, code: rawCode } = req.body ?? {};
  if (!uid || !rawCode) return res.status(400).json({ error: "Need uid and code" });
  const code = String(rawCode).trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "Enter a code first." });
  try {
    const codeSnap = await db.ref(`codes/${code}`).once("value");
    const data = codeSnap.val();
    if (!data) return res.status(404).json({ error: "Invalid code — double-check the spelling." });
    if (data.expiresAt && data.expiresAt < Date.now())
      return res.status(400).json({ error: "This code has expired." });
    if ((data.usedCount ?? 0) >= data.amount)
      return res.status(400).json({ error: "This code has already been fully used." });

    const already = await db.ref(`redeemed/${uid}/${code}`).once("value");
    if (already.exists()) return res.status(400).json({ error: "You've already redeemed this code." });

    const record = {
      code,
      type: data.type,
      ...(data.planId ? { planId: data.planId } : {}),
      ...(data.discountPercent ? { discountPercent: data.discountPercent } : {}),
      ...(data.quizIds ? { quizIds: data.quizIds } : {}),
      ...(data.coinValue ? { coinValue: data.coinValue } : {}),
      redeemedAt: Date.now(),
    };

    const updates = {};
    if (data.type === "gift" || data.type === "promo") {
      updates[`users/${uid}/plan`] = {
        id: data.planId ?? "teacher_full",
        activatedAt: Date.now(),
        claimedVia: `redeem:${code}`,
      };
    }
    if (data.type === "dev_plan") {
      updates[`users/${uid}/plan`] = {
        id: "dev",
        activatedAt: Date.now(),
        claimedVia: `redeem:${code}`,
      };
    }
    if (data.type === "discount") {
      updates[`users/${uid}/discount`] = {
        percent: data.discountPercent,
        code,
        redeemedAt: Date.now(),
      };
    }
    if (data.type === "pack" && data.quizIds) {
      const userSnap = await db.ref(`users/${uid}`).once("value");
      const existing = userSnap.val()?.unlockedQuizIds ?? [];
      updates[`users/${uid}/unlockedQuizIds`] = Array.from(new Set([...existing, ...data.quizIds]));
    }
    if (data.type === "market") {
      updates[`users/${uid}/marketAccess`] = true;
    }
    if (data.type === "coins") {
      const coinValue = Math.max(1, Number(data.coinValue) || 0);
      updates[`users/${uid}/coins`] = ServerValue.increment(coinValue);
      updates[`users/${uid}/coinsEarned`] = ServerValue.increment(coinValue);
      updates[`coinsLedger/${uid}/code-${code}-${Date.now()}`] = {
        amount: coinValue,
        type: "code",
        at: Date.now(),
        ref: code,
      };
    }

    await db.ref(`redeemed/${uid}/${code}`).set(record);
    await db.ref().update({
      ...updates,
      [`codes/${code}/usedCount`]: ServerValue.increment(1),
    });

    if (data.type === "gift" || data.type === "promo") {
      const planName =
        data.planId === "teacher_full" ? "Teacher Full" : data.planId === "student" ? "Student" : "Premium";
      return res.json({
        ok: true,
        message: `Plan activated! ${planName} is now yours.`,
      });
    }
    if (data.type === "dev_plan") {
      return res.json({
        ok: true,
        message: "Developer plan activated — full access, gifted by an admin.",
      });
    }
    if (data.type === "discount") {
      return res.json({ ok: true, message: `${data.discountPercent}% discount applied to Teacher Full.` });
    }
    if (data.type === "pack" && data.quizIds) {
      return res.json({ ok: true, message: `${data.quizIds.length} premium quiz(zes) unlocked.` });
    }
    if (data.type === "market") {
      return res.json({ ok: true, message: "Market unlocked! Head to the Market to spend your CooperCoins." });
    }
    if (data.type === "coins") {
      return res.json({
        ok: true,
        message: `${Math.max(1, Number(data.coinValue) || 0)} CooperCoins added to your wallet!`,
      });
    }
    return res.json({ ok: true, message: "Code redeemed!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/earn  body: { uid, quizId, submissionId, score, total }
// Public: awards CooperCoins for a completed quiz attempt. Server-verified: the
// result must exist in results/<uid>/<quizId> with a matching score, and each
// submissionId pays at most once (every attempt pays).
// Bonuses: coin multiplier items, daily streak, first quiz of the day,
// perfect score, and a one-time referral reward for the referrer.
app.post("/api/earn", async (req, res) => {
  const { uid, quizId, submissionId, score, total } = req.body ?? {};
  if (!uid || !quizId || !submissionId) {
    return res.status(400).json({ error: "Need uid, quizId and submissionId" });
  }
  const correct = Number(score);
  if (!Number.isFinite(correct) || correct < 0) {
    return res.status(400).json({ error: "Invalid score" });
  }
  try {
    const [resultSnap, alreadySnap, userSnap, walletSnap] = await Promise.all([
      db.ref(`results/${uid}/${quizId}`).once("value"),
      db.ref(`coinsLedger/${uid}/${submissionId}`).once("value"),
      db.ref(`users/${uid}`).once("value"),
      db.ref(`walletItems/${uid}`).once("value"),
    ]);
    const result = resultSnap.val();
    if (!result || Number(result.score) !== correct) {
      return res.status(400).json({ error: "Result not found or score mismatch" });
    }
    if (alreadySnap.exists()) {
      return res.json({ ok: true, earned: 0, balance: (await db.ref(`users/${uid}/coins`).once("value")).val() ?? 0 });
    }

    const user = userSnap.val() ?? {};
    let earned = correct * COINS_PER_CORRECT;
    const bonuses = [];

    // Multiplier is verified against owned wallet items (purchase provenance),
    // never trusted from the user node — clients are rules-blocked from writing
    // coinsMultiplier, but server verification makes tampering impossible anyway.
    const wallet = walletSnap.val() ?? {};
    const now = Date.now();
    let mult = 1;
    for (const entry of Object.values(wallet)) {
      const item = entry.itemId ? MARKET_ITEMS[entry.itemId] : undefined;
      if (item?.kind === "multiplier" && item.durationHours && entry.acquiredAt) {
        if (entry.acquiredAt + item.durationHours * 3600000 > now && (item.mult ?? 1) > mult) {
          mult = item.mult ?? 1;
        }
      }
    }
    if (mult > 1) {
      earned = Math.round(earned * mult);
      bonuses.push(`x${mult} multiplier`);
    }

    const today = todayKey();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let streakCount = Number(user.streakCount) || 0;
    if (user.lastEarnDate === today) {
      // already earned today — no streak change
    } else {
      streakCount = user.lastEarnDate === yesterday ? streakCount + 1 : 1;
      const firstBonus = FIRST_OF_DAY_BONUS;
      earned += firstBonus;
      bonuses.push("first quiz of the day");
      const streakBonus = Math.min(streakCount, STREAK_BONUS_MAX / STREAK_BONUS_PER_DAY) * STREAK_BONUS_PER_DAY;
      if (streakCount > 1) {
        earned += streakBonus;
        bonuses.push(`${streakCount}-day streak`);
      }
    }

    if (Number(total) > 0 && correct === Number(total)) {
      earned += PERFECT_BONUS;
      bonuses.push("perfect score");
    }

    const updates = {
      [`users/${uid}/coins`]: ServerValue.increment(earned),
      [`users/${uid}/coinsEarned`]: ServerValue.increment(earned),
      [`users/${uid}/streakCount`]: streakCount,
      [`users/${uid}/lastEarnDate`]: today,
      [`coinsLedger/${uid}/${submissionId}`]: {
        amount: earned,
        type: "quiz",
        at: Date.now(),
        ref: quizId,
      },
    };

    const referredBy = user.referredBy;
    if (referredBy?.referrerUid && !referredBy.rewardedAt) {
      const referrerUid = referredBy.referrerUid;
      const referralId = `ref-${uid}-${Date.now()}`;
      updates[`users/${referrerUid}/coins`] = ServerValue.increment(REFERRAL_BONUS);
      updates[`users/${referrerUid}/coinsEarned`] = ServerValue.increment(REFERRAL_BONUS);
      updates[`coinsLedger/${referrerUid}/${referralId}`] = {
        amount: REFERRAL_BONUS,
        type: "referral",
        at: Date.now(),
        ref: uid,
      };
      updates[`users/${uid}/referredBy/rewardedAt`] = Date.now();
    }

    await db.ref().update(updates);
    const balance = (await db.ref(`users/${uid}/coins`).once("value")).val() ?? 0;
    // NexasPay reward: mirror the CooperCoins earned onto the user's NexaCoin
    // wallet (merchant-key guarded; never blocks the quiz flow).
    if (NEXAS_ENABLED && earned > 0 && user.email) {
      nexasFetch("/api/merchant/credit", {
        method: "POST",
        merchant: true,
        body: { email: user.email, coins: earned, memo: "CooperWeb quiz reward" },
      }).catch(() => {
        /* quiet — CooperCoins still awarded even if Nexa fails */
      });
    }
    res.json({ ok: true, earned, balance, bonuses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/market/items — public catalog with sale prices and limited-item expiry applied
app.get("/api/market/items", async (_req, res) => {
  try {
    const configSnap = await db.ref("marketConfig").once("value");
    const config = configSnap.val() ?? {};
    const now = Date.now();
    const saleActive = config.salePercent > 0 && (!config.saleUntil || config.saleUntil > now);
    const items = Object.entries(MARKET_ITEMS).map(([id, item]) => {
      const limited = config.items?.[id]?.expiresAt;
      const expired = limited && limited < now;
      const price = saleActive ? Math.round(item.price * (1 - config.salePercent / 100)) : item.price;
      return {
        id,
        name: item.name,
        price,
        basePrice: item.price,
        kind: item.kind,
        ...(item.grants ? { grants: item.grants } : {}),
        ...(item.durationHours ? { durationHours: item.durationHours } : {}),
        ...(saleActive ? { salePercent: config.salePercent } : {}),
        ...(limited ? { expiresAt: limited, expired: Boolean(expired) } : {}),
      };
    });
    res.json({ items, sale: saleActive ? { percent: config.salePercent, until: config.saleUntil ?? null } : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/market/purchase  body: { uid, itemId, pin? }
// Public: spends CooperCoins on a market item. Server checks marketAccess,
// balance, sale price and expiry, deducts coins, and records ownership.
// If the user has set a card PIN, it must be provided and match — purchases
// are PIN-gated.
app.post("/api/market/purchase", async (req, res) => {
  const { uid, itemId, pin } = req.body ?? {};
  if (!uid || !itemId) return res.status(400).json({ error: "Need uid and itemId" });
  const item = MARKET_ITEMS[itemId];
  if (!item) return res.status(404).json({ error: "Unknown item" });
  try {
    const [userSnap, configSnap, ownedSnap] = await Promise.all([
      db.ref(`users/${uid}`).once("value"),
      db.ref("marketConfig").once("value"),
      db.ref(`walletItems/${uid}/${itemId}`).once("value"),
    ]);
    const user = userSnap.val();
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.marketAccess) return res.status(403).json({ error: "Market locked — redeem a code to unlock it." });
    if (user.cardPin) {
      if (typeof pin !== "string" || pin !== user.cardPin) {
        return res.status(403).json({ error: "Enter the correct card PIN to complete this purchase." });
      }
    }
    const config = configSnap.val() ?? {};
    const now = Date.now();
    const limited = config.items?.[itemId]?.expiresAt;
    if (limited && limited < now) return res.status(400).json({ error: "This limited item is no longer available." });
    if (ownedSnap.exists()) return res.status(400).json({ error: "You already own this item." });

    const saleActive = config.salePercent > 0 && (!config.saleUntil || config.saleUntil > now);
    const price = saleActive ? Math.round(item.price * (1 - config.salePercent / 100)) : item.price;
    const balance = Number(user.coins) || 0;
    if (balance < price) return res.status(400).json({ error: `Not enough CooperCoins (need ${price}).` });

    const purchaseId = `pur-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const updates = {
      [`users/${uid}/coins`]: ServerValue.increment(-price),
      [`walletItems/${uid}/${itemId}`]: { itemId, acquiredAt: now },
      [`coinsLedger/${uid}/${purchaseId}`]: {
        amount: -price,
        type: "purchase",
        at: now,
        ref: itemId,
      },
    };
    if (item.kind === "bundle" && item.grants) {
      for (const grantedId of item.grants) {
        updates[`walletItems/${uid}/${grantedId}`] = { itemId: grantedId, acquiredAt: now };
        applyItemEffect(updates, uid, grantedId);
      }
    } else {
      applyItemEffect(updates, uid, itemId);
    }
    await db.ref().update(updates);
    res.json({ ok: true, balance: balance - price, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trade/offer  body: { fromUid, toUid, itemId, priceCC, reason? }
// Trade offer: user A lists an item for sale to user B at CC price.
app.post("/api/trade/offer", async (req, res) => {
  const { fromUid, toUid, itemId, priceCC, reason } = req.body ?? {};
  if (!fromUid || !toUid || !itemId || !Number.isFinite(priceCC) || priceCC <= 0) {
    return res.status(400).json({ error: "Need fromUid, toUid, itemId, and priceCC" });
  }
  if (fromUid === toUid) return res.status(400).json({ error: "Cannot trade to yourself" });
  try {
    const fromSnap = await db.ref(`users/${fromUid}`).once("value");
    const toSnap = await db.ref(`users/${toUid}`).once("value");
    const fromUser = fromSnap.val();
    const toUser = toSnap.val();
    if (!fromUser || !toUser) return res.status(404).json({ error: "User not found" });
    if (fromUser.uid === toUid || toUser.uid === fromUid)
      return res.status(400).json({ error: "Cannot trade with yourself" });
    const fromOwned = (fromUser.walletItems || {})[itemId];
    if (!fromOwned) return res.status(404).json({ error: "You don't own this item" });
    const fromItem = MARKET_ITEMS[itemId];
    if (!fromItem || fromItem.kind !== "frame" && fromItem.kind !== "badge" && fromItem.kind !== "overlay") {
      return res.status(400).json({ error: "Only cosmetic items can be traded" });
    }
    if ((toUser.coins ?? 0) < priceCC) return res.status(400).json({ error: `Buyer needs ${priceCC} CC` });
    const tradeId = `trade-${Date.now()}-${randomUUID().slice(0, 6)}`;
    await db.ref().update({
      [`tradeOffers/${tradeId}`]: {
        fromUid, toUid, itemId, priceCC, reason: reason ?? "No reason",
        status: "pending", createdAt: Date.now(),
      },
      [`coinsLedger/${fromUid}/${tradeId}`]: {
        amount: 0, type: "trade_offer", at: Date.now(), ref: toUid,
      },
      [`coinsLedger/${toUid}/${tradeId}`]: {
        amount: 0, type: "trade_offer", at: Date.now(), ref: fromUid,
      },
    });
    await notifyUser(toUid, {
      type: "trade",
      title: "New trade offer",
      message: `${fromUser.displayName ?? "A classmate"} offered you ${fromItem.name} for ${priceCC} CC${reason ? ` — ${reason}` : ""}`,
      link: "/trading",
    });
    res.json({ ok: true, tradeId, priceCC, fromItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trade/accepted  body: { uid } — list trades the user is involved in (as buyer or seller)
app.post("/api/trade/accepted", async (req, res) => {
  const { uid } = req.body ?? {};
  if (!uid) return res.status(400).json({ error: "Need uid" });
  try {
    const tradesSnap = await db.ref("tradeOffers").once("value");
    const trades = tradesSnap.val() ?? {};
    const involved = Object.entries(trades)
      .filter(([, t]) => t.fromUid === uid || t.toUid === uid)
      .map(([tradeId, t]) => ({ tradeId, ...t }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    res.json({ trades: involved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/trade/accept  body: { tradeId, uid } — buyer accepts the offer, pays the seller, item moves
app.put("/api/trade/accept", async (req, res) => {
  const { tradeId, uid } = req.body ?? {};
  if (!tradeId) return res.status(400).json({ error: "Need tradeId" });
  try {
    const tradeSnap = await db.ref(`tradeOffers/${tradeId}`).once("value");
    const trade = tradeSnap.val();
    if (!trade || trade.status !== "pending") return res.status(400).json({ error: "Trade not pending" });
    if (uid && trade.toUid !== uid) return res.status(403).json({ error: "Only the buyer can accept" });
    const fromUser = (await db.ref(`users/${trade.fromUid}`).once("value")).val();
    const toUser = (await db.ref(`users/${trade.toUid}`).once("value")).val();
    if (!fromUser || !toUser) return res.status(404).json({ error: "User not found" });
    if ((toUser.coins ?? 0) < trade.priceCC)
      return res.status(400).json({ error: `Buyer needs ${trade.priceCC} CC` });
    await db.ref().update({
      [`users/${trade.toUid}/coins`]: ServerValue.increment(-trade.priceCC),
      [`users/${trade.fromUid}/coins`]: ServerValue.increment(trade.priceCC),
      [`coinsLedger/${trade.fromUid}/${tradeId}`]: {
        amount: trade.priceCC,
        type: "trade",
        at: Date.now(),
        ref: trade.toUid,
      },
      [`coinsLedger/${trade.toUid}/${tradeId}`]: {
        amount: -trade.priceCC,
        type: "trade",
        at: Date.now(),
        ref: trade.fromUid,
      },
      [`tradeOffers/${tradeId}/status`]: "accepted",
      [`tradeOffers/${tradeId}/acceptedAt`]: Date.now(),
      [`walletItems/${trade.fromUid}/${trade.itemId}`]: null,
      [`walletItems/${trade.toUid}/${trade.itemId}`]: { itemId: trade.itemId, acquiredAt: Date.now() },
    });
    await notifyUser(trade.fromUid, {
      type: "trade",
      title: "Offer accepted",
      message: `${toUser.displayName ?? "A classmate"} accepted your ${MARKET_ITEMS[trade.itemId]?.name ?? "item"} offer for ${trade.priceCC} CC`,
      link: "/trading",
    });
    res.json({ ok: true, tradeId, priceCC: trade.priceCC, fromItem: MARKET_ITEMS[trade.itemId] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/trade/decline  body: { tradeId, uid } — buyer declines the offer
app.put("/api/trade/decline", async (req, res) => {
  const { tradeId, uid } = req.body ?? {};
  if (!tradeId) return res.status(400).json({ error: "Need tradeId" });
  try {
    const tradeSnap = await db.ref(`tradeOffers/${tradeId}`).once("value");
    const trade = tradeSnap.val();
    if (!trade || trade.status !== "pending") return res.status(400).json({ error: "Trade not pending" });
    if (uid && trade.toUid !== uid) return res.status(403).json({ error: "Only the buyer can decline" });
    await db.ref().update({
      [`tradeOffers/${tradeId}/status`]: "declined",
      [`tradeOffers/${tradeId}/declinedAt`]: Date.now(),
    });
    res.json({ ok: true, tradeId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trade/list  body: { uid, itemId, priceCC, reason? }
// Create a marketplace listing (public, anyone can buy). 5% listing fee charged now.
app.post("/api/trade/list", async (req, res) => {
  const { uid, itemId, priceCC, reason } = req.body ?? {};
  if (!uid || !itemId || !Number.isFinite(priceCC) || priceCC <= 0) {
    return res.status(400).json({ error: "Need uid, itemId, priceCC" });
  }
  const item = MARKET_ITEMS[itemId];
  if (!item) return res.status(404).json({ error: "Unknown item" });
  if (item.kind !== "frame" && item.kind !== "badge" && item.kind !== "overlay" && item.kind !== "confetti") return res.status(400).json({ error: "Only frame/badge/overlay/confetti can be listed" });
  if (item.kind === "confetti") return res.status(400).json({ error: "Confetti can't be listed — use Market instead" });
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    const user = userSnap.val();
    if (!userSnap.exists()) return res.status(404).json({ error: "User not found" });
    const fee = Math.round(priceCC * 0.05);
    if ((user.coins ?? 0) < fee) return res.status(400).json({ error: `Need ${fee} CC for the 5% listing fee` });
    const price = Math.round(priceCC);
    const listingId = `list-${Date.now()}-${randomUUID().slice(0, 6)}`;
    await db.ref().update({
      [`tradeListings/${listingId}`]: {
        sellerUid: uid, itemId, price, fee, reason: reason ?? "",
        createdAt: Date.now(), expiresAt: Date.now() + 30 * 86400000,
      },
      [`users/${uid}/coins`]: ServerValue.increment(-fee),
      [`coinsLedger/${uid}/${listingId}`]: {
        amount: -fee, type: "listing_fee", at: Date.now(), ref: itemId,
      },
    });
    res.json({ ok: true, listingId, price, fee, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trade/listings?seller=uid — public listings for a seller
app.get("/api/trade/listings", async (req, res) => {
  const { sellerUid } = req.query;
  if (!sellerUid) return res.status(400).json({ error: "Need sellerUid" });
  try {
    const snap = await db.ref(`tradeListings/${sellerUid}`).once("value");
    const listings = snap.val() ?? {};
    const items = Object.entries(listings).map(([lid, l]) => ({
      listingId: lid, sellerUid: l.sellerUid, itemId: l.itemId, price: l.price,
      reason: l.reason || "", createdAt: l.createdAt, expiresAt: l.expiresAt,
    }));
    res.json({ listings: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/trade/confirm  body: { listingId, buyerUid }
app.put("/api/trade/confirm", async (req, res) => {
  const { listingId, buyerUid } = req.body ?? {};
  if (!listingId || !buyerUid) return res.status(400).json({ error: "Need listingId and buyerUid" });
  try {
    const listingSnap = await db.ref(`tradeListings/${listingId}`).once("value");
    const listing = listingSnap.val();
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.status === "confirmed") return res.status(400).json({ error: "Listing already sold" });
    if (listing.status === "cancelled") return res.status(400).json({ error: "Listing was cancelled" });
    if ((listing.expiresAt ?? 0) < Date.now()) return res.status(400).json({ error: "Listing has expired" });
    if (listing.sellerUid === buyerUid) return res.status(400).json({ error: "Can't buy your own listing" });
    const seller = (await db.ref(`users/${listing.sellerUid}`).once("value")).val();
    const buyer = (await db.ref(`users/${buyerUid}`).once("value")).val();
    if (!seller || !buyer) return res.status(404).json({ error: "User not found" });
    if ((buyer.coins ?? 0) < listing.price) return res.status(400).json({ error: "Not enough CC" });
    const item = MARKET_ITEMS[listing.itemId];
    const purchaseId = `pur-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const updates = {
      [`users/${buyerUid}/coins`]: ServerValue.increment(-listing.price),
      [`users/${listing.sellerUid}/coins`]: ServerValue.increment(listing.price),
      [`walletItems/${listing.sellerUid}/${listing.itemId}`]: null,
      [`walletItems/${buyerUid}/${listing.itemId}`]: { itemId: listing.itemId, acquiredAt: Date.now() },
      [`coinsLedger/${listing.sellerUid}/${purchaseId}`]: {
        amount: listing.price, type: "listing_confirm", at: Date.now(), ref: listing.itemId,
      },
      [`coinsLedger/${buyerUid}/${purchaseId}`]: {
        amount: -listing.price, type: "listing_confirm", at: Date.now(), ref: listing.itemId,
      },
      [`tradeListings/${listingId}/status`]: "confirmed",
      [`tradeListings/${listingId}/confirmedAt`]: Date.now(),
      [`tradeListings/${listingId}/buyerUid`]: buyerUid,
    };
    await db.ref().update(updates);
    await notifyUser(listing.sellerUid, {
      type: "trade",
      title: "Item sold!",
      message: `${buyer.displayName ?? "A classmate"} bought your ${item?.name ?? listing.itemId} for ${listing.price} CC`,
      link: "/trading",
    });
    res.json({ ok: true, listingId, price: listing.price, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/trade/admin/listings — all listings + offers (admin)
app.get("/api/trade/admin/listings", requireAdmin, async (_req, res) => {
  try {
    const [listSnap, offerSnap] = await Promise.all([
      db.ref("tradeListings").once("value"),
      db.ref("tradeOffers").once("value"),
    ]);
    const listings = Object.entries(listSnap.val() ?? {}).map(([listingId, l]) => ({ listingId, ...l }));
    const offers = Object.entries(offerSnap.val() ?? {}).map(([tradeId, t]) => ({ tradeId, ...t }));
    res.json({ listings, offers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/trade/admin/cancel  body: { listingId } — cancel a listing + refund fee (admin)
app.put("/api/trade/admin/cancel", requireAdmin, async (req, res) => {
  const { listingId } = req.body ?? {};
  if (!listingId) return res.status(400).json({ error: "Need listingId" });
  try {
    const snap = await db.ref(`tradeListings/${listingId}`).once("value");
    const listing = snap.val();
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.status === "confirmed") return res.status(400).json({ error: "Already sold" });
    if (listing.status === "cancelled") return res.status(400).json({ error: "Already cancelled" });
    await db.ref().update({
      [`tradeListings/${listingId}/status`]: "cancelled",
      [`tradeListings/${listingId}/cancelledAt`]: Date.now(),
      [`users/${listing.sellerUid}/coins`]: ServerValue.increment(listing.fee ?? 0),
      [`coinsLedger/${listing.sellerUid}/${listingId}`]: {
        amount: listing.fee ?? 0, type: "listing_fee_refund", at: Date.now(), ref: listingId,
      },
    });
    res.json({ ok: true, listingId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/card", async (req, res) => {
  const uid = String(req.query.uid ?? "");
  if (!uid) return res.status(400).json({ error: "Need uid" });
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    const user = userSnap.val();
    if (!user) return res.status(404).json({ error: "User not found" });
    let card = user.card;
    if (!card) {
      card = {
        number: randomCardNumber(),
        holderName: user.displayName ?? user.email?.split("@")[0] ?? "Student",
        issuedAt: Date.now(),
      };
      await db.ref(`users/${uid}/card`).set(card);
    }
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/card/pin  body: { uid, pin } — sets (4 digits) or removes (empty string)
// the card PIN. Clients are rules-blocked from writing cardPin directly.
app.post("/api/card/pin", async (req, res) => {
  const { uid, pin } = req.body ?? {};
  if (!uid) return res.status(400).json({ error: "Need uid" });
  if (typeof pin !== "string" || (pin !== "" && !/^\d{4}$/.test(pin))) {
    return res.status(400).json({ error: "PIN must be exactly 4 digits (or empty to remove)" });
  }
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    if (!userSnap.exists()) return res.status(404).json({ error: "User not found" });
    if (pin === "") {
      await db.ref(`users/${uid}/cardPin`).set(null);
    } else {
      await db.ref(`users/${uid}/cardPin`).set(pin);
    }
    res.json({ ok: true, hasPin: pin !== "" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/card/pay  body: { uid, cardNumber, coins, memo?, pin? }
// Pay NexaCoin to the owner of a CooperCard number (the card's QR encodes its
// number, so this is the "scan card → pay" flow). Debits the payer's Nexa
// wallet. If the payer has a card PIN set, it must be supplied.
app.post("/api/card/pay", async (req, res) => {
  const { uid, cardNumber, coins, memo, pin } = req.body ?? {};
  const c = Number(coins);
  const number = String(cardNumber ?? "").trim().toUpperCase();
  if (!uid || !number || !Number.isFinite(c) || c <= 0) {
    return res.status(400).json({ error: "Need uid, cardNumber and a positive coin amount" });
  }
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    const payer = userSnap.val();
    if (!payer || !payer.email) return res.status(404).json({ error: "User or email not found" });
    const snap = await db
      .ref("users")
      .orderByChild("card/number")
      .equalTo(number)
      .limitToFirst(1)
      .once("value");
    const entries = snap.val();
    if (!entries) return res.status(404).json({ error: "No card with that number was found" });
    const targetUid = Object.keys(entries)[0];
    const target = entries[targetUid];
    if (targetUid === uid) return res.status(400).json({ error: "You cannot pay your own card" });
    const payerPin = String(payer.cardPin ?? "");
    if (payerPin && String(pin ?? "") !== payerPin) {
      return res.status(401).json({ error: "Card is PIN-locked — enter your PIN to pay" });
    }
    const { status, data } = await nexasFetch("/api/merchant/transfer", {
      method: "POST",
      merchant: true,
      body: {
        from: payer.email,
        to: target.email,
        coins: c,
        memo: memo ?? `Card ${number} payment`,
      },
    });
    if (status === 200) {
      for (const w of [payer.email, target.email]) {
        nexasFetch(`/api/wallet?email=${encodeURIComponent(w)}`)
          .then((r) => (r.status === 200 ? mirroWallet(w, r.data) : null))
          .catch(() => {});
      }
      await notifyUser(targetUid, {
        type: "payment",
        title: "Card payment received",
        message: `${payer.displayName ?? payer.email} paid ${c} NexaCoin to your card (${number}).`,
        link: "/nexas-wallet",
      });
    }
    res.status(status).json(data ?? { error: "Card payment failed" });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/admin/exchange-rate  body: { rate } — admin only.
// Sets the CC ↔ NexaCoin exchange rate (1 NexaCoin = N CooperCoins).
app.post("/api/admin/exchange-rate", requireAdmin, async (req, res) => {
  const rate = Number(req.body?.rate);
  if (!Number.isFinite(rate) || rate < 1 || rate > 10000) {
    return res.status(400).json({ error: "Rate must be between 1 and 10000" });
  }
  try {
    await db.ref("nexas/ccPerNexa").set(rate);
    ccPerNexaCache = { rate, at: 0 };
    res.json({ ok: true, rate });
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

// ---------- NexasPay (ZamAI unified payments / NexasCoin) ----------
const JOHNWEB_BASE = process.env.JOHNWEB_URL ?? "https://johnweb-qncu.onrender.com";
const NEXAS = {
  baseUrl: process.env.NEXAS_BASE_URL ?? "https://nexas-pay.onrender.com",
  merchantKey: process.env.NEXAS_MERCHANT_KEY ?? "np_9txq8poxi6_xwof2mc7ds",
  merchantId: process.env.NEXAS_MERCHANT_ID ?? "cooperweb",
  merchantNumber: process.env.NEXAS_MERCHANT_NUMBER ?? "0771460648",
};
const NEXAS_ENABLED = !!NEXAS.merchantKey;
const NEXAS_WEBHOOK_TOKEN =
  process.env.NEXAS_WEBHOOK_TOKEN ?? "nxw_0cb4e0db04c94c760a6e42bf996549fd";
const NEXAS_COIN_PRICES = { student: 50, teacher_full: 200 };
// CC ↔ NexaCoin exchange rate: 1 NexaCoin == CC_PER_NEXA CooperCoins.
// Admin-tunable at runtime via POST /api/admin/exchange-rate (stored in DB).
const CC_PER_NEXA = 50;
let ccPerNexaCache = { rate: null, at: 0 };
async function ccPerNexa() {
  const now = Date.now();
  if (ccPerNexaCache.rate && now - ccPerNexaCache.at < 30000) return ccPerNexaCache.rate;
  try {
    const snap = await db.ref("nexas/ccPerNexa").once("value");
    const v = Number(snap.val());
    ccPerNexaCache = { rate: Number.isFinite(v) && v > 0 ? v : CC_PER_NEXA, at: now };
  } catch {
    ccPerNexaCache = { rate: CC_PER_NEXA, at: now };
  }
  return ccPerNexaCache.rate;
}
let nexasRateCache = { rate: null, at: 0 };

async function nexasRate() {
  const now = Date.now();
  if (nexasRateCache.rate && now - nexasRateCache.at < 60000) return nexasRateCache.rate;
  try {
    const res = await fetch(`${NEXAS.baseUrl}/api/rate`);
    const data = await res.json();
    nexasRateCache = { rate: Number(data.rate) || 1, at: now };
  } catch {
    nexasRateCache = { rate: 1, at: now };
  }
  return nexasRateCache.rate;
}

async function nexasFetch(path, { method = "GET", body, merchant = false } = {}) {
  const headers = merchant ? { "X-Merchant-Key": NEXAS.merchantKey } : {};
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${NEXAS.baseUrl}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, data };
}

const activateNexaPlan = async ({ uid, planId, paymentId }) => {
  const updates = {
    [`payments/${uid}/${paymentId}/status`]: "confirmed",
    [`payments/${uid}/${paymentId}/confirmedAt`]: Date.now(),
    [`payments/${uid}/${paymentId}/momoTransactionId`]: `nexa:${Date.now()}`,
    [`users/${uid}/plan`]: { id: planId, activatedAt: Date.now(), claimedVia: "nexa" },
  };
  await db.ref().update(updates);
  const planLabel = planId === "teacher_full" ? "Teacher Full" : planId === "student" ? "Student" : planId;
  await notifyUser(uid, {
    type: "payment",
    title: "Payment confirmed",
    message: `Your ${planLabel} plan is now active. Welcome aboard!`,
    link: "/dashboard",
  });
};

// ---------- NexasPay → Firebase mirror ----------
// Writes through every merchant/wallet response into Google Firebase RTDB under
// `nexas/` (rate, ledger, wallets/<email>), and periodically re-syncs the
// merchant ledger + live rate so Firebase always has a recent copy.
const mirroWallet = async (email, walletData) => {
  if (!walletData) return;
  const safeEmail = String(email).replace(/\./g, "_");
  await db.ref(`nexas/wallets/${safeEmail}`).set({
    ...walletData,
    email: String(email),
    syncedAt: Date.now(),
  });
};

const nexasSync = async () => {
  if (!NEXAS_ENABLED) return;
  try {
    const now = Date.now();
    const [ledgerRes, rate] = await Promise.all([
      nexasFetch("/api/merchant/ledger", { merchant: true }),
      nexasRate(),
    ]);
    const updates = {
      "nexas/lastSyncAt": now,
      "nexas/rate": { rate, at: now },
    };
    if (ledgerRes.status === 200 && Array.isArray(ledgerRes.data?.transactions)) {
      const txs = ledgerRes.data.transactions.slice(0, 200);
      for (const tx of txs) updates[`nexas/ledger/${tx.id}`] = tx;
      updates["nexas/ledger/updatedAt"] = now;
    }
    await db.ref().update(updates);
  } catch (err) {
    console.error("nexas sync error:", err.message);
  }
};
nexasSync();
setInterval(nexasSync, 60_000);

// Keep the hosted app warm and verify the pairing — harmless fire-and-forget
// ping back at the Firebase Hosting site every 10 minutes.
const HOST_APP_URL = (process.env.APP_URL ?? "https://chikondi-dot.web.app").replace(/\/+$/, "");
setInterval(() => {
  fetch(HOST_APP_URL)
    .then((r) => r.text())
    .catch(() => {});
}, 10 * 60 * 1000);

// GET /api/nexas/config — public client config: whether NexasPay is wired, live rate
app.get("/api/nexas/config", async (_req, res) => {
  try {
    const [rate, cc] = await Promise.all([nexasRate(), ccPerNexa()]);
    res.json({
      enabled: NEXAS_ENABLED,
      baseUrl: NEXAS.baseUrl,
      merchantId: NEXAS.merchantId,
      merchantNumber: NEXAS.merchantNumber,
      coinPrices: NEXAS_COIN_PRICES,
      cc: { ccPerNexa: cc },
      plans: PLAN_PRICES,
      rate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nexas/wallet?email=... — user's NexasCoin wallet (public lookup, wallet auto-creates)
app.get("/api/nexas/wallet", async (req, res) => {
  const email = String(req.query.email ?? "");
  if (!email) return res.status(400).json({ error: "Need email" });
  try {
    const { status, data } = await nexasFetch(`/api/wallet?email=${encodeURIComponent(email)}`);
    if (status === 200 && data) {
      mirroWallet(email, data).catch(() => {});
    }
    res.status(status).json(data ?? { error: "NexasPay wallet lookup failed" });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/nexas/buy  body: { email, amountK }
// Public: creates a buy order — user pays K to the NexasPay mobile-money number.
app.post("/api/nexas/buy", async (req, res) => {
  const { email, amountK } = req.body ?? {};
  const amt = Number(amountK);
  if (!email || !Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: "Need email and a positive amountK" });
  }
  try {
    const { status, data } = await nexasFetch("/api/wallet/buy", {
      method: "POST",
      body: { email, amountK: amt },
      merchant: true,
    });
    if (status !== 200) return res.status(status).json(data ?? { error: "Buy order failed" });
    const rate = await nexasRate();
    nexasFetch(`/api/wallet?email=${encodeURIComponent(email)}`)
      .then((w) => (w.status === 200 ? mirroWallet(email, w.data) : null))
      .catch(() => {});
    res.json({ ...(data ?? {}), merchantNumber: NEXAS.merchantNumber, merchantId: NEXAS.merchantId, rate });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/nexas/sell  body: { email, coins }
app.post("/api/nexas/sell", async (req, res) => {
  const { email, coins } = req.body ?? {};
  const c = Number(coins);
  if (!email || !Number.isFinite(c) || c <= 0) {
    return res.status(400).json({ error: "Need email and a positive coin amount" });
  }
  try {
    const { status, data } = await nexasFetch("/api/wallet/sell", { method: "POST", body: { email, coins: c } });
    if (status === 200 && data) {
      nexasFetch(`/api/wallet?email=${encodeURIComponent(email)}`)
        .then((w) => (w.status === 200 ? mirroWallet(email, w.data) : null))
        .catch(() => {});
    }
    res.status(status).json(data ?? { error: "Sell order failed" });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/nexas/charge  body: { uid, planId }
// Charge the user's NexasCoin wallet for their plan and activate it.
app.post("/api/nexas/charge", async (req, res) => {
  const { uid, planId } = req.body ?? {};
  const coins = NEXAS_COIN_PRICES[planId];
  if (!uid || !coins) {
    return res.status(400).json({ error: "Need uid and a valid planId" });
  }
  let email = "";
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    const user = userSnap.val();
    if (!user) return res.status(404).json({ error: "User not found" });
    email = user.email ?? "";
    if (!email) return res.status(400).json({ error: "Account has no email — cannot link a NexasCoin wallet" });
    const lockSnap = await db.ref(`nexaCharges/${uid}`).once("value");
    const lock = lockSnap.val();
    if (lock && lock.planId === planId && Date.now() - (lock.at ?? 0) < 120000) {
      return res.status(409).json({ error: "A Nexa charge is already in progress for this plan" });
    }
    const paymentId = `pay-nexa-${Date.now()}`;
    const payment = {
      id: paymentId,
      uid,
      email,
      planId,
      amount: coins,
      method: "nexa",
      phone: "",
      status: "requested",
      createdAt: Date.now(),
    };
    await db.ref().update({
      [`payments/${uid}/${paymentId}`]: payment,
      [`nexaCharges/${uid}`]: { planId, at: Date.now() },
    });
    const { status, data } = await nexasFetch("/api/merchant/charge", {
      method: "POST",
      merchant: true,
      body: { email, coins, memo: `CooperWeb ${planId} plan (${coins} NexaCoin)` },
    });
    if (status !== 200) {
      const insufficient = data?.error === "insufficient balance" || data?.balance === undefined && status === 400;
      await db.ref(`payments/${uid}/${paymentId}/status`).set("rejected");
      if (insufficient) {
        return res.status(400).json({ needsTopUp: true, error: "Not enough NexaCoin — buy more first." });
      }
      return res.status(status).json(data ?? { error: "Nexa charge failed" });
    }
    await activateNexaPlan({ uid, planId, paymentId });
    nexasFetch(`/api/wallet?email=${encodeURIComponent(email)}`)
      .then((w) => (w.status === 200 ? mirroWallet(email, w.data) : null))
      .catch(() => {});
    res.json({ ok: true, balance: data.balance ?? null, charged: data.charged ?? coins, planId });
  } catch (err) {
    console.error("nexa charge error:", err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/nexas/credit  body: { uid, coins, memo? } — reward a user's NexaCoin wallet
app.post("/api/nexas/credit", async (req, res) => {
  const { uid, coins, memo } = req.body ?? {};
  const c = Number(coins);
  if (!uid || !Number.isFinite(c) || c < 0) return res.status(400).json({ error: "Need uid and coins" });
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    const user = userSnap.val();
    if (!user || !user.email) return res.status(404).json({ error: "User or email not found" });
    const { status, data } = await nexasFetch("/api/merchant/credit", {
      method: "POST",
      merchant: true,
      body: { email: user.email, coins: c, memo: memo ?? "CooperWeb reward" },
    });
    if (status === 200 && data?.balance !== undefined) {
      mirroWallet(user.email, data).catch(() => {});
    }
    res.status(status).json(data ?? { error: "Nexa credit failed" });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/nexas/exchange  body: { uid, direction: "in"|"out", amount }
// Bridge CooperCoins ↔ NexaCoin. direction "in" = spend CC to credit your Nexa
// wallet ("price" amount is CC); direction "out" = sell NexaCoin from your
// wallet into CC ("amount" is NexaCoin). Rate is server-governed (CC_PER_NEXA).
app.post("/api/nexas/exchange", async (req, res) => {
  const { uid, direction, amount } = req.body ?? {};
  const amt = Number(amount);
  if (!uid || !["in", "out"].includes(direction) || !Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: "Need uid, direction (in|out) and a positive amount" });
  }
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    const user = userSnap.val();
    if (!user || !user.email) return res.status(404).json({ error: "User or email not found" });
    const email = user.email;
    const ccAmt = Math.floor(amt * 100) / 100;

    if (direction === "in") {
      const rate = await ccPerNexa();
      const ccSpent = Math.round(ccAmt * 100) / 100;
      const nexaReceived = Math.round((ccSpent / rate) * 100) / 100;
      if (nexaReceived < 1) {
        return res.status(400).json({ error: `Minimum exchange is 1 NexaCoin (${rate} CC).` });
      }
      const balance = Number(user.coins) || 0;
      if (balance < ccSpent) {
        return res.status(400).json({ error: "Not enough CooperCoins — earn more with quizzes." });
      }
      const { status, data } = await nexasFetch("/api/merchant/credit", {
        method: "POST",
        merchant: true,
        body: { email, coins: nexaReceived, memo: `Exchanged ${ccSpent} CC → NexaCoin` },
      });
      if (status !== 200) return res.status(status).json(data ?? { error: "Nexa top-up failed" });
      const txId = `xchg-${Date.now()}-${randomUUID().slice(0, 6)}`;
      await db.ref().update({
        [`users/${uid}/coins`]: ServerValue.increment(-ccSpent),
        [`coinsLedger/${uid}/${txId}`]: {
          amount: -ccSpent,
          type: "exchange_in",
          at: Date.now(),
          ref: `nexa:${nexaReceived}`,
        },
      });
      mirroWallet(email, data).catch(() => {});
      res.json({
        ok: true,
        sent: nexaReceived,
        spentCc: ccSpent,
        balance: Math.round((balance - ccSpent) * 100) / 100,
        ccPerNexa: rate,
      });
      return;
    }

    const wallet = await nexasFetch(`/api/wallet?email=${encodeURIComponent(email)}`);
    const avail = Number(wallet.data?.balance ?? 0);
    if (wallet.status !== 200 || avail < ccAmt) {
      return res.status(400).json({ error: "Not enough NexaCoin in your wallet." });
    }
    const { status, data } = await nexasFetch("/api/wallet/sell", {
      method: "POST",
      body: { email, coins: ccAmt },
    });
    if (status !== 200) return res.status(status).json(data ?? { error: "Nexa sell order failed" });
    const rate = await ccPerNexa();
    const ccReceived = Math.round(ccAmt * rate);
    const txId = `xchg-${Date.now()}-${randomUUID().slice(0, 6)}`;
    await db.ref().update({
      [`users/${uid}/coins`]: ServerValue.increment(ccReceived),
      [`coinsLedger/${uid}/${txId}`]: {
        amount: ccReceived,
        type: "exchange_out",
        at: Date.now(),
        ref: `nexa:${ccAmt}`,
      },
    });
    if (data) mirroWallet(email, data).catch(() => {});
    res.json({
      ok: true,
      sold: ccAmt,
      receivedCc: ccReceived,
      balance: (Number(user.coins) || 0) + ccReceived,
      ccPerNexa: rate,
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/nexas/transfer  body: { uid, toEmail?, toUid?, coins, memo? }
// Move NexaCoin from the signed-in user to another wallet (QR / @username
// payments). Accepts the recipient as an email OR a CooperWeb uid (resolved
// server-side so emails stay private in the /api/people directory).
app.post("/api/nexas/transfer", async (req, res) => {
  const { uid, toEmail, toUid, coins, memo } = req.body ?? {};
  const c = Number(coins);
  if (!uid || (!toEmail && !toUid) || !Number.isFinite(c) || c <= 0) {
    return res.status(400).json({ error: "Need uid, toEmail or toUid, and a positive coin amount" });
  }
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    const user = userSnap.val();
    if (!user || !user.email) return res.status(404).json({ error: "User or email not found" });
    let target = String(toEmail ?? "");
    if (toUid) {
      const targetUser = (await db.ref(`users/${toUid}`).once("value")).val();
      if (!targetUser || !targetUser.email) return res.status(404).json({ error: "Recipient has no Nexa wallet linked" });
      target = targetUser.email;
    }
    const { status, data } = await nexasFetch("/api/merchant/transfer", {
      method: "POST",
      merchant: true,
      body: { from: user.email, to: target, coins: c, memo: memo ?? "CooperWeb transfer" },
    });
    if (status === 200) {
      for (const w of [user.email, target]) {
        nexasFetch(`/api/wallet?email=${encodeURIComponent(w)}`)
          .then((r) => (r.status === 200 ? mirroWallet(w, r.data) : null))
          .catch(() => {});
      }
    }
    res.status(status).json(data ?? { error: "Nexa transfer failed" });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/nexas/profile/lookup?username=... — find an @username → wallet email (public)
app.get("/api/nexas/profile/lookup", async (req, res) => {
  const username = String(req.query.username ?? "");
  if (!username) return res.status(400).json({ error: "Need username" });
  try {
    const { status, data } = await nexasFetch(`/api/profile/by-username/${encodeURIComponent(username)}`);
    res.status(status).json(data ?? { error: "Username lookup failed" });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/nexas/profile  body: { uid, username }
// Register an @username for easy payments.
app.post("/api/nexas/profile", async (req, res) => {
  const { uid, username } = req.body ?? {};
  if (!uid || !username) return res.status(400).json({ error: "Need uid and username" });
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    const user = userSnap.val();
    if (!user || !user.email) return res.status(404).json({ error: "User or email not found" });
    const { status, data } = await nexasFetch("/api/profile", {
      method: "POST",
      body: {
        email: user.email,
        username: String(username).replace(/^@/, "").trim(),
        displayName: user.displayName ?? user.email.split("@")[0],
      },
    });
    res.status(status).json(data ?? { error: "Profile registration failed" });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/globalsearch?q=... — public search across the whole ecosystem:
// CooperWeb papers/quizzes/notes/people (Firebase) + the John Web library
// (proxy). This is the "One Route" search API used by the Apps hub.
app.get("/api/globalsearch", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) return res.json({ query: q, papers: [], quizzes: [], notes: [], people: [], johnweb: null });
  const needle = q.toLowerCase();
  const matches = (text) => String(text ?? "").toLowerCase().includes(needle);
  try {
    const [papersSnap, quizzesSnap, notesSnap, usersSnap] = await Promise.all([
      db.ref("papers").once("value"),
      db.ref("quizzes").once("value"),
      db.ref("notes").once("value"),
      db.ref("users").once("value"),
    ]);
    const papers = Object.values(papersSnap.val() ?? {})
      .filter((p) => matches(p.title) || matches(p.subject) || matches(p.year))
      .slice(0, 8);
    const quizzes = Object.values(quizzesSnap.val() ?? {})
      .filter((q) => matches(q.title) || matches(q.subject))
      .slice(0, 8);
    const notes = Object.values(notesSnap.val() ?? {})
      .filter((n) => matches(n.title) || matches(n.subject) || matches(n.content))
      .slice(0, 8);
    const people = Object.entries(usersSnap.val() ?? {})
      .filter(([, u]) => matches(u.displayName))
      .slice(0, 8)
      .map(([uid, u]) => ({
        uid,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl ?? "",
        planId: u.plan?.id ?? "free",
        role: u.role ?? "user",
      }));
    let johnweb = null;
    try {
      const jwRes = await fetch(
        `${JOHNWEB_BASE}/api/public/search?q=${encodeURIComponent(q)}`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (jwRes.ok) johnweb = await jwRes.json();
    } catch {
      johnweb = null;
    }
    res.json({ query: q, papers, quizzes, notes, people, johnweb });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nexas/profiles/search?q=... — public user search
app.get("/api/nexas/profiles/search", async (req, res) => {
  const q = String(req.query.q ?? "");
  if (!q) return res.json({ results: [] });
  try {
    const { status, data } = await nexasFetch(`/api/profiles/search?q=${encodeURIComponent(q)}`);
    res.status(status).json(data ?? []);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/nexas/notifications?email=... — in-app notifications for a wallet
app.get("/api/nexas/notifications", async (req, res) => {
  const email = String(req.query.email ?? "");
  if (!email) return res.status(400).json({ error: "Need email" });
  try {
    const { status, data } = await nexasFetch(`/api/notifications?email=${encodeURIComponent(email)}`);
    res.status(status).json(data ?? {});
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/nexas/notifications/read  body: { email, id }
app.post("/api/nexas/notifications/read", async (req, res) => {
  const { email, id } = req.body ?? {};
  if (!email || !id) return res.status(400).json({ error: "Need email and id" });
  try {
    const { status, data } = await nexasFetch("/api/notifications/read", {
      method: "POST",
      body: { email, id },
    });
    res.status(status).json(data ?? { ok: true });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/nexas/subscribe  body: { uid, subscriptionId } — recurring plan
app.post("/api/nexas/subscribe", async (req, res) => {
  const { uid, subscriptionId } = req.body ?? {};
  if (!uid || !subscriptionId) return res.status(400).json({ error: "Need uid and subscriptionId" });
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    const user = userSnap.val();
    if (!user || !user.email) return res.status(404).json({ error: "User or email not found" });
    const { status, data } = await nexasFetch("/api/subscriptions/subscribe", {
      method: "POST",
      body: { email: user.email, subscriptionId },
    });
    res.status(status).json(data ?? { error: "Subscription failed" });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/nexas/cancel  body: { uid, subscriptionId }
app.post("/api/nexas/cancel", async (req, res) => {
  const { uid, subscriptionId } = req.body ?? {};
  if (!uid || !subscriptionId) return res.status(400).json({ error: "Need uid and subscriptionId" });
  try {
    const userSnap = await db.ref(`users/${uid}`).once("value");
    const user = userSnap.val();
    if (!user || !user.email) return res.status(404).json({ error: "User or email not found" });
    const { status, data } = await nexasFetch("/api/subscriptions/cancel", {
      method: "POST",
      body: { email: user.email, subscriptionId },
    });
    res.status(status).json(data ?? { error: "Cancellation failed" });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/nexas/webhook — data link for the NexasPay service itself.
// The other AI/service running NexasPay pushes its data here (wallets, ledger,
// rate, profiles, subscriptions, events) and CooperWeb stores it into Firebase
// under `nexas/` so everything lives in one database.
// Auth: header `x-nexas-webhook-token: <NEXAS_WEBHOOK_TOKEN>`
app.post("/api/nexas/webhook", async (req, res) => {
  const token = req.get("x-nexas-webhook-token");
  if (!NEXAS_WEBHOOK_TOKEN || token !== NEXAS_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: "Invalid webhook token" });
  }
  const { type, data, email, username, id } = req.body ?? {};
  if (!type) return res.status(400).json({ error: "Need type" });
  const now = Date.now();
  try {
    if (type === "rate") {
      await db.ref("nexas/rate").set({ rate: Number(data) || 1, at: now });
      return res.json({ ok: true, node: "nexas/rate" });
    }
    if (type === "ledger" && Array.isArray(data)) {
      const updates = { "nexas/ledger/updatedAt": now };
      for (const tx of data.slice(0, 500)) {
        if (tx && tx.id) updates[`nexas/ledger/${tx.id}`] = tx;
      }
      await db.ref().update(updates);
      return res.json({ ok: true, node: "nexas/ledger", count: data.length });
    }
    if (type === "wallet" && email) {
      await mirroWallet(email, data ?? {});
      return res.json({ ok: true, node: `nexas/wallets/${email}` });
    }
    if (type === "profile" && username) {
      await db.ref(`nexas/profiles/${String(username).replace(/[^a-zA-Z0-9_.-]/g, "")}`).set({ ...(data ?? {}), syncedAt: now });
      return res.json({ ok: true, node: `nexas/profiles/${username}` });
    }
    if (type === "subscription" && id) {
      await db.ref(`nexas/subscriptions/${String(id).replace(/[^a-zA-Z0-9_.-]/g, "")}`).set({ ...(data ?? {}), syncedAt: now });
      return res.json({ ok: true, node: `nexas/subscriptions/${id}` });
    }
    if (type === "event" && id) {
      await db.ref(`nexas/events/${String(id).replace(/[^a-zA-Z0-9_.-]/g, "")}`).set({ ...(data ?? {}), at: now });
      return res.json({ ok: true, node: `nexas/events/${id}` });
    }
    // ---- Nexa Auth mirror (devices, sessions, security, privacy) ----
    if (type === "device" && email) {
      await db.ref(`nexas/devices/${String(email).replace(/\./g, "_")}/${String(id ?? Date.now()).replace(/[^a-zA-Z0-9_.-]/g, "")}`).set({ ...(data ?? {}), syncedAt: now });
      return res.json({ ok: true, node: `nexas/devices/${email}` });
    }
    if (type === "session" && email) {
      await db.ref(`nexas/sessions/${String(email).replace(/\./g, "_")}/${String(id ?? Date.now()).replace(/[^a-zA-Z0-9_.-]/g, "")}`).set({ ...(data ?? {}), syncedAt: now });
      return res.json({ ok: true, node: `nexas/sessions/${email}` });
    }
    if (type === "security" && email) {
      await db.ref(`nexas/security/${String(email).replace(/\./g, "_")}`).set({ ...(data ?? {}), syncedAt: now });
      return res.json({ ok: true, node: `nexas/security/${email}` });
    }
    if (type === "privacy" && email) {
      await db.ref(`nexas/privacy/${String(email).replace(/\./g, "_")}`).set({ ...(data ?? {}), syncedAt: now });
      return res.json({ ok: true, node: `nexas/privacy/${email}` });
    }
    return res.status(400).json({ error: "Unsupported type — use rate, ledger, wallet, profile, subscription, event, device, session, security or privacy" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nexas/ledger — read the mirrored NexasPay merchant ledger (public).
// This is the read side of the Firebase link: whatever the NexasPay service
// (or CooperWeb) pushed into `nexas/ledger` is returned newest-first.
app.get("/api/nexas/ledger", async (_req, res) => {
  try {
    const snap = await db.ref("nexas/ledger").once("value");
    const v = snap.val() ?? {};
    const { updatedAt, ...txs } = v;
    const entries = Object.values(txs)
      .filter((tx) => tx && typeof tx === "object" && tx.id)
      .sort((a, b) => String(b.at ?? b.id ?? "").localeCompare(String(a.at ?? a.id ?? "")))
      .slice(0, 200);
    res.json({ count: entries.length, updatedAt: updatedAt ?? null, transactions: entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- SSO: Login with Auther ----------
// Auther is the in-house identity provider. The browser is sent to Auther to
// authorize; Auther redirects back here with a one-time code; we exchange that
// server-to-server, upsert the matching Firebase user, and hand the SPA a
// Firebase custom token to sign in with.
//
//   GET /api/auth/sso           -> redirect to Auther (or ?token= direct login)
//   GET /api/auth/sso/callback  -> exchange code -> custom token -> back to app
const AUTHER_URL = process.env.AUTHER_URL ?? "https://auther-zblr.onrender.com";
const AUTHER_CLIENT_ID = process.env.AUTHER_CLIENT_ID ?? "cooperweb";
// Where the React app lives (Firebase Hosting), i.e. where we send sso_token.
const APP_URL = (process.env.APP_URL ?? "https://chikondi-dot.web.app").replace(/\/+$/, "");
// Signing key for the CSRF `state` value. Stateless so it survives restarts and
// works across instances; falls back to a per-boot secret if nothing is set.
const SSO_STATE_SECRET =
  process.env.SSO_STATE_SECRET ?? ADMIN_API_KEY ?? randomBytes(32).toString("hex");
const SSO_STATE_TTL_MS = 10 * 60 * 1000;
const TRIAL_DAYS = 14;
const AUTHER_TIMEOUT_MS = 20000;

// Server-side mirror of src/utils/plans.ts PLAN_LEVEL.
const PLAN_LEVEL_SERVER = {
  free: 0,
  student_plus: 1,
  student: 1,
  teacher_plus: 1,
  teacher_full: 2,
  dev: 50,
  admin: 99,
};

const signState = (payload) =>
  createHmac("sha256", SSO_STATE_SECRET).update(payload).digest("base64url");

const makeState = () => {
  const payload = `${Date.now()}.${randomBytes(8).toString("base64url")}`;
  return `${payload}.${signState(payload)}`;
};

const verifyState = (state) => {
  if (typeof state !== "string") return false;
  const idx = state.lastIndexOf(".");
  if (idx < 0) return false;
  const payload = state.slice(0, idx);
  const sig = state.slice(idx + 1);
  const expected = signState(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const ts = Number(payload.split(".")[0]);
  return Number.isFinite(ts) && Date.now() - ts < SSO_STATE_TTL_MS;
};

const ssoFail = (res, reason) =>
  res.redirect(`${APP_URL}/login?error=sso_failed${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`);

/**
 * Find the Firebase user for an Auther identity, creating it on first login.
 * Local users are keyed by email; the generated password is random and never
 * surfaced, so the account is only reachable through Auther (or a reset).
 */
const ssoLocalUser = async ({ email, name }) => {
  if (!email) return null;
  const adminAuth = getAuth();
  const displayName = name || email.split("@")[0];
  let record;
  try {
    record = await adminAuth.getUserByEmail(email);
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    record = await adminAuth.createUser({
      email,
      emailVerified: true, // Auther already owns verification
      displayName,
      password: randomBytes(24).toString("hex"),
    });
  }

  // Mirror the RTDB records the SPA signup path creates.
  const userRef = db.ref(`users/${record.uid}`);
  const snap = await userRef.once("value");
  if (!snap.exists()) {
    const createdAt = Date.now();
    await userRef.set({
      uid: record.uid,
      email,
      displayName,
      role: "user",
      createdAt,
    });
    await db.ref(`profiles/${record.uid}`).set({
      uid: record.uid,
      displayName,
      bio: "",
      createdAt,
    });
  }
  return record;
};

/**
 * Student Plus, free for two weeks, on Auther login.
 * Never downgrades a live paid plan, and only grants once per day so repeat
 * logins cannot stack extensions.
 */
const grantStudentPlus = async (uid) => {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const planRef = db.ref(`users/${uid}/plan`);
  const existing = (await planRef.once("value")).val();

  if (existing) {
    const live = !existing.expiresAt || existing.expiresAt > now;
    const level = PLAN_LEVEL_SERVER[existing.id] ?? 0;
    // A real plan they already hold outranks the promo — leave it alone.
    if (live && level >= PLAN_LEVEL_SERVER.student && existing.kind !== "student_plus_trial") {
      return { skipped: "has_plan" };
    }
    // Already granted today — don't stack another 14 days on.
    if (existing.kind === "student_plus_trial" && existing.grantedOn === today) {
      return { skipped: "granted_today", expiresAt: existing.expiresAt };
    }
  }

  // Extend from now, but never shorten an existing trial.
  const expiresAt = Math.max(now + TRIAL_DAYS * 24 * 60 * 60 * 1000, existing?.expiresAt ?? 0);
  await planRef.set({
    id: "student_plus",
    activatedAt: now,
    claimedVia: "auther",
    kind: "student_plus_trial",
    grantedOn: today,
    expiresAt,
  });
  await notifyUser(uid, {
    type: "success",
    title: "Student Plus unlocked",
    message: `Welcome via Auther! Student Plus is yours free until ${new Date(expiresAt).toDateString()}.`,
    link: "/dashboard",
  });
  return { expiresAt };
};

// Completes login for an Auther identity and bounces back to the SPA.
const finishSso = async (res, autherUser) => {
  const record = await ssoLocalUser(autherUser);
  if (!record) return ssoFail(res, "no_user");
  await grantStudentPlus(record.uid);
  const customToken = await getAuth().createCustomToken(record.uid);
  return res.redirect(`${APP_URL}/login?sso_token=${encodeURIComponent(customToken)}`);
};

app.get("/api/auth/sso", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/sso/callback`;
    const url =
      `${AUTHER_URL}/sso/authorize?client_id=${encodeURIComponent(AUTHER_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(makeState())}`;
    return res.redirect(url);
  }

  // Direct login with an Auther token already in hand.
  try {
    const r = await fetch(`${AUTHER_URL}/api/auth/me`, {
      headers: { "X-Auth-Token": String(token) },
      signal: AbortSignal.timeout(AUTHER_TIMEOUT_MS),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.user?.email) return ssoFail(res, "token_rejected");
    return await finishSso(res, d.user);
  } catch {
    return ssoFail(res, "auther_unreachable");
  }
});

app.get("/api/auth/sso/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) return ssoFail(res, "no_code");
  if (!verifyState(state)) return ssoFail(res, "bad_state");

  try {
    const r = await fetch(`${AUTHER_URL}/sso/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(AUTHER_TIMEOUT_MS),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok || !d.user?.email) return ssoFail(res, "exchange_failed");
    return await finishSso(res, d.user);
  } catch {
    return ssoFail(res, "auther_unreachable");
  }
});

app.listen(PORT, () => {
  console.log(`CooperWeb API listening on port ${PORT}`);
});
