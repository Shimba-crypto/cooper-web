import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

const sa = JSON.parse(readFileSync(process.argv[2], "utf8"));
initializeApp({
  credential: cert(sa),
  databaseURL: "https://chikondi-dot-default-rtdb.firebaseio.com",
});
const auth = getAuth();
const db = getDatabase();

const pattern = /qabug\d*@mailinator\.com/;

// 1. Find matching Auth users.
const victims = [];
let page;
do {
  page = await auth.listUsers(1000, page?.pageToken);
  for (const u of page.users) {
    if (u.email && pattern.test(u.email)) victims.push({ uid: u.uid, email: u.email });
  }
} while (page.pageToken);

console.log("Auth matches:", victims.length);
for (const v of victims) console.log(" -", v.uid, v.email);

const perUid = [
  "users",
  "profiles",
  "results",
  "leaderboard",
  "following",
  "followers",
  "notifications",
  "pushTokens",
  "walletItems",
  "coinsLedger",
  "bookmarks",
  "saved",
];

for (const v of victims) {
  // 2. RTDB user-scoped nodes.
  const removes = [];
  for (const node of perUid) {
    const ref = db.ref(`${node}/${v.uid}`);
    const snap = await ref.once("value");
    if (snap.exists()) {
      removes.push(node);
      await ref.remove();
    }
  }

  // 3. Referral records pointing at them as the child.
  const refsSnap = await db.ref("referrals").once("value");
  const refs = refsSnap.val() ?? {};
  for (const [referrerUid, children] of Object.entries(refs)) {
    if (children?.[v.uid]) {
      await db.ref(`referrals/${referrerUid}/${v.uid}`).remove();
      removes.push(`referrals/${referrerUid}`);
    }
  }

  // 4. Challenge player entries.
  const chSnap = await db.ref("challenges").once("value");
  const chs = chSnap.val() ?? {};
  for (const [cid, ch] of Object.entries(chs)) {
    if (ch?.players?.[v.uid]) {
      await db.ref(`challenges/${cid}/players/${v.uid}`).remove();
      removes.push(`challenges/${cid}/players`);
    }
  }

  // 5. Group chat / wallet artifacts keyed by email.
  const safe = v.email.replace(/\./g, "_");
  const wallet = db.ref(`nexas/wallets/${safe}`);
  if ((await wallet.once("value")).exists()) {
    await wallet.remove();
    removes.push(`nexas/wallets/${safe}`);
  }

  // 6. Firebase Auth record.
  await auth.deleteUser(v.uid);
  console.log(`Deleted ${v.uid} (${v.email}): ${removes.join(", ") || "auth only"}`);
}

console.log("Done.");
