import { get, ref, runTransaction, set } from "firebase/database";
import type { Database } from "firebase/database";
import type { RedeemCode, RedeemRecord } from "../types";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(prefix = "CW"): string {
  const block = (n: number) => {
    let s = "";
    for (let i = 0; i < n; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  };
  return `${prefix}-${block(4)}-${block(4)}`;
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase();
}

export interface RedeemOutcome {
  ok: boolean;
  message: string;
}

export async function redeemCode(db: Database, uid: string, raw: string): Promise<RedeemOutcome> {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, message: "Enter a code first." };

  const snap = await get(ref(db, `codes/${code}`));
  const data = snap.val() as RedeemCode | null;
  if (!data) return { ok: false, message: "Invalid code — double-check the spelling." };
  if (data.expiresAt && data.expiresAt < Date.now())
    return { ok: false, message: "This code has expired." };
  if (data.usedCount >= data.amount)
    return { ok: false, message: "This code has already been fully used." };

  const already = await get(ref(db, `redeemed/${uid}/${code}`));
  if (already.exists()) return { ok: false, message: "You've already redeemed this code." };

  const tx = await runTransaction(ref(db, `codes/${code}`), (current) => {
    if (!current) return undefined;
    if (current.usedCount >= current.amount) return undefined;
    return { ...current, usedCount: current.usedCount + 1 };
  });
  if (!tx.committed) return { ok: false, message: "Sorry, this code was just used up." };

  const record: RedeemRecord = {
    code,
    type: data.type,
    ...(data.planId ? { planId: data.planId } : {}),
    ...(data.discountPercent ? { discountPercent: data.discountPercent } : {}),
    ...(data.quizIds ? { quizIds: data.quizIds } : {}),
    redeemedAt: Date.now(),
  };

  try {
    await set(ref(db, `redeemed/${uid}/${code}`), record);

    if (data.type === "gift" || data.type === "promo") {
      await set(ref(db, `users/${uid}/plan`), {
        id: data.planId ?? "teacher_full",
        activatedAt: Date.now(),
        claimedVia: `redeem:${code}`,
      });
      return {
        ok: true,
        message: `Plan activated! ${data.planId === "teacher_full" ? "Teacher Full" : "Premium"} is now yours.`,
      };
    }

    if (data.type === "discount") {
      await set(ref(db, `users/${uid}/discount`), {
        percent: data.discountPercent,
        code,
        redeemedAt: Date.now(),
      });
      return { ok: true, message: `${data.discountPercent}% discount applied to Teacher Full.` };
    }

    if (data.type === "pack" && data.quizIds) {
      const userSnap = await get(ref(db, `users/${uid}`));
      const existing = userSnap.val()?.unlockedQuizIds ?? [];
      const merged = Array.from(new Set([...existing, ...data.quizIds]));
      await set(ref(db, `users/${uid}/unlockedQuizIds`), merged);
      return { ok: true, message: `${data.quizIds.length} premium quiz(zes) unlocked.` };
    }
  } catch {
    return { ok: false, message: "Redeemed but failed to apply — contact an admin." };
  }

  return { ok: true, message: "Code redeemed!" };
}

export function canAccessPremiumQuiz(
  planId: string,
  unlockedQuizIds: string[] | undefined,
  quiz: { id: string; premium?: boolean } | undefined
): boolean {
  if (!quiz?.premium) return true;
  if (planId === "admin" || planId === "teacher_full") return true;
  return unlockedQuizIds?.includes(quiz.id) ?? false;
}
