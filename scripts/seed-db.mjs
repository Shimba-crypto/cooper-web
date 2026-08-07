import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { getDatabase } from "firebase-admin/database";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const args = process.argv.slice(2);
const adminEmail = args.includes("--admin") ? args[args.indexOf("--admin") + 1] : null;

const keyPath = join(root, "serviceAccountKey.json");
if (!existsSync(keyPath)) {
  console.error(
    "Missing serviceAccountKey.json.\n" +
      "1. Firebase console -> Project settings -> Service accounts\n" +
      "2. Click 'Generate new private key' and save it as serviceAccountKey.json in the project root."
  );
  process.exit(1);
}

const key = JSON.parse(readFileSync(keyPath, "utf8"));
const databaseURL =
  process.env.VITE_FIREBASE_DATABASE_URL ??
  "https://chikondi-dot-default-rtdb.firebaseio.com";

admin.initializeApp({
  credential: admin.cert(key),
  databaseURL,
});

const db = getDatabase();
const read = (name) => JSON.parse(readFileSync(join(root, "database", `${name}.json`), "utf8"));

async function seed(name) {
  const data = read(name);
  console.log(`Seeding ${name} (${Object.keys(data[name]).length} records)...`);
  await db.ref(name).set(data[name]);
  console.log(`Done: ${name}`);
}

async function promoteAdmin(email) {
  const snapshot = await db.ref("users").orderByChild("email").equalTo(email).once("value");
  const matches = snapshot.val();
  if (!matches) {
    console.error(`No user found with email ${email}. Ask them to sign up in the app first.`);
    return;
  }
  const uid = Object.keys(matches)[0];
  await db.ref(`users/${uid}`).update({ role: "admin" });
  console.log(`Promoted ${email} (${uid}) to admin.`);
}

async function main() {
  await seed("papers");
  await seed("quizzes");
  if (adminEmail) await promoteAdmin(adminEmail);
  console.log("All done. Run: npm run deploy");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
