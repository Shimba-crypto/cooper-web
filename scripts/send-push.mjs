// Send web push notifications AND in-app bell notifications via FCM using a Firebase service account.
// Usage:
//   node scripts/send-push.mjs path/to/service-account.json "Title" "Body" [--url /quizzes]
// Reads push tokens from the Realtime Database (pushTokens/<uid>/token) and user uids for bell notifications.
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getMessaging } from "firebase-admin/messaging";

const [, , serviceAccountPath, title, body] = process.argv;
const urlArg = process.argv.find((a) => a.startsWith("--url="));
const url = urlArg ? urlArg.split("=")[1] : undefined;

if (!serviceAccountPath || !title || !body) {
  console.error("Usage: node scripts/send-push.mjs <service-account.json> <title> <body> [--url=/quizzes]");
  process.exit(1);
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
initializeApp({ credential: cert(serviceAccount), databaseURL: "https://chikondi-dot-default-rtdb.firebaseio.com" });
const db = getDatabase();

const usersSnap = await db.ref("users").once("value");
const users = usersSnap.val() ?? {};
const uids = Object.keys(users);
console.log(`Found ${uids.length} user(s).`);

// 1. In-app bell notifications for every user
const now = Date.now();
const notifyUpdates = {};
for (const uid of uids) {
  const nid = `n-${now}-${randomUUID().slice(0, 6)}`;
  notifyUpdates[`notifications/${uid}/${nid}`] = {
    id: nid,
    type: "announcement",
    title,
    message: body,
    ...(url ? { link: url } : {}),
    read: false,
    createdAt: now,
  };
}
if (uids.length > 0) {
  await db.ref().update(notifyUpdates);
  console.log("Bell notifications sent.");
}

// 2. Web pushes to registered tokens
const tokensSnap = await db.ref("pushTokens").once("value");
const tokens = [];
tokensSnap.forEach((child) => {
  const token = child.val()?.token;
  if (token) tokens.push(token);
});
console.log(`Found ${tokens.length} push token(s).`);

if (tokens.length === 0) {
  console.log("No push tokens — no one has enabled notifications yet.");
} else {
  const messaging = getMessaging();
  const result = await messaging.sendEachForMulticast({
    notification: { title, body },
    ...(url ? { data: { url } } : {}),
    tokens,
  });
  console.log(`Push success: ${result.successCount}, failures: ${result.failureCount}`);
  result.responses.forEach((r, i) => {
    if (r.error) console.error(`  token ${i}: ${r.error.message}`);
  });
}

process.exit(0);
