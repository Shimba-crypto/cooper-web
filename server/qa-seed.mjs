import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

const sa = JSON.parse(readFileSync(process.argv[2], "utf8"));
initializeApp({
  credential: cert(sa),
  databaseURL: "https://chikondi-dot-default-rtdb.firebaseio.com",
});
const db = getDatabase();

const action = process.argv[3];
const token = process.argv[4] ?? "qa-invite-flow";
const email = process.argv[5] ?? "invite-flow-qa@mailinator.com";

if (action === "create") {
  const now = Date.now();
  await db.ref(`inviteLinks/${token}`).set({
    email,
    name: "Flow QA",
    createdAt: now,
    expiresAt: now + 30 * 60 * 1000,
    createdBy: "qa",
  });
  console.log(`created inviteLinks/${token} -> ${email}`);
} else if (action === "cleanup") {
  await db.ref(`inviteLinks/${token}`).remove();
  const snap = await db.ref(`inviteLinks/${token}/usedBy`).once("value");
  const uid = snap.val();
  if (uid) {
    await getAuth().deleteUser(uid).catch(() => {});
    await db.ref(`users/${uid}`).remove();
    await db.ref(`profiles/${uid}`).remove();
    console.log(`removed user ${uid}`);
  }
  console.log(`removed inviteLinks/${token}`);
}
process.exit(0);