import type { PlanId } from "../types";

export interface PlanInfo {
  id: Exclude<PlanId, "free" | "admin">;
  name: string;
  price: string;
  priceK: number;
  description: string;
  features: string[];
}

export const PLANS: Record<Exclude<PlanId, "free" | "admin">, PlanInfo> = {
  student_plus: {
    id: "student_plus",
    name: "Student Plus",
    price: "K50",
    priceK: 50,
    description: "For learners who want to practise with quizzes.",
    features: ["Unlimited timed quizzes", "Leaderboard access", "Instant quiz results"],
  },
  teacher_plus: {
    id: "teacher_plus",
    name: "Teacher Plus",
    price: "K100",
    priceK: 100,
    description: "Everything a teacher needs for classroom prep.",
    features: [
      "Everything in Student Plus",
      "Marking schemes",
    ],
  },
  teacher_full: {
    id: "teacher_full",
    name: "Teacher Full",
    price: "K200",
    priceK: 200,
    description: "Complete access to every CooperWeb feature.",
    features: [
      "Everything in Teacher Plus",
      "All current and future features",
      "Priority support",
    ],
  },
};

export const PLAN_LEVEL: Record<PlanId, number> = {
  free: 0,
  student_plus: 1,
  teacher_plus: 2,
  teacher_full: 3,
  admin: 99,
};

export function hasPlan(current: PlanId, required: PlanId): boolean {
  return PLAN_LEVEL[current] >= PLAN_LEVEL[required];
}

export function planName(id: PlanId): string {
  if (id === "admin") return "Admin";
  if (id === "free") return "Free";
  return PLANS[id].name;
}

export function requiredPlanName(required: Exclude<PlanId, "free" | "admin">): PlanInfo {
  return PLANS[required];
}

export function generateClaimToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let token = "cw-";
  for (const b of bytes) token += chars[b % chars.length];
  return token;
}
