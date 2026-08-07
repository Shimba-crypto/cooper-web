import { get, ref, update, type Database } from "firebase/database";
import type { Notification } from "../types";

export async function notifyAllUsers(
  db: Database,
  payload: Omit<Notification, "id" | "read" | "createdAt">
) {
  const snap = await get(ref(db, "users"));
  const users = snap.val() as Record<string, unknown> | null;
  if (!users) return;
  const now = Date.now();
  const updates: Record<string, unknown> = {};
  for (const uid of Object.keys(users)) {
    const nid = `n-${now}-${Math.random().toString(36).slice(2, 8)}`;
    updates[`notifications/${uid}/${nid}`] = {
      id: nid,
      ...payload,
      read: false,
      createdAt: now,
    } satisfies Notification;
  }
  await update(ref(db), updates);
}
