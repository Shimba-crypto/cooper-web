import type { PlanId } from "../types";

export type BuyablePlanId = Exclude<PlanId, "free" | "admin" | "student_plus" | "teacher_plus">;

export interface PlanInfo {
  id: BuyablePlanId;
  name: string;
  price: string;
  priceK: number;
  description: string;
  features: string[];
}

export const PLANS: Record<BuyablePlanId, PlanInfo> = {
  teacher_full: {
    id: "teacher_full",
    name: "Teacher Full",
    price: "K200",
    priceK: 200,
    description: "Complete access to every CooperWeb feature.",
    features: [
      "Everything in the free plan",
      "Marking schemes",
      "All current and future features",
      "Priority support",
    ],
  },
};

export const PLAN_LEVEL: Record<PlanId, number> = {
  free: 0,
  student_plus: 0,
  teacher_plus: 1,
  teacher_full: 2,
  admin: 99,
};

export function hasPlan(current: PlanId, required: PlanId): boolean {
  return PLAN_LEVEL[current] >= PLAN_LEVEL[required];
}

const LEGACY_NAMES: Partial<Record<PlanId, string>> = {
  student_plus: "Free",
  teacher_plus: "Teacher Plus",
};

export function planName(id: PlanId): string {
  if (id === "admin") return "Admin";
  if (id === "free") return "Free";
  return PLANS[id as BuyablePlanId]?.name ?? LEGACY_NAMES[id] ?? id;
}

export function generateClaimToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let token = "cw-";
  for (const b of bytes) token += chars[b % chars.length];
  return token;
}
