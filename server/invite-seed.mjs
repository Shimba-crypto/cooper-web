import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const sa = JSON.parse(readFileSync(process.argv[2], "utf8"));
initializeApp({
  credential: cert(sa),
  databaseURL: "https://chikondi-dot-default-rtdb.firebaseio.com",
});
const db = getDatabase();

const action = process.argv[3];
const token = process.argv[4] ?? "qa-invite-test";
const email = process.argv[5] ?? "guest-invite-qa@mailinator.com";

if (action === "create") {
  const now = Date.now();
  await db.ref(`inviteLinks/${token}`).set({
    email,
    name: "QA Invitee",
    createdAt: now,
    expiresAt: now + 30 * 60 * 1000,
    createdBy: "qa",
  });
  console.log(`created inviteLinks/${token} -> ${email}`);
} else if (action === "delete") {
  await db.ref(`inviteLinks/${token}`).remove();
  console.log(`removed inviteLinks/${token}`);
} else if (action === "show") {
  const snap = await db.ref(`inviteLinks/${token}`).once("value");
  console.log(JSON.stringify(snap.val(), null, 2));
}
process.exit(0);