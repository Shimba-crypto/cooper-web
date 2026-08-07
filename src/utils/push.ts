import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { ref, set } from "firebase/database";
import { db } from "../firebase";

let registeredUid: string | null = null;

export async function registerPushToken(uid: string): Promise<void> {
  if (registeredUid === uid) return;
  try {
    if (!(await isSupported())) return;
    const messaging = getMessaging();
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) return;
    const token = await getToken(messaging, { vapidKey });
    if (!token) return;
    await set(ref(db, `pushTokens/${uid}`), {
      token,
      updatedAt: Date.now(),
    });
    registeredUid = uid;
  } catch {
    // Push is optional; ignore failures (permission denied, blocked, etc.)
  }
}
