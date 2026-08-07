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

app.listen(PORT, () => {
  console.log(`CooperWeb API listening on port ${PORT}`);
});
