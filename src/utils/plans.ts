import type { PlanId, UserPlan, UserRole } from "../types";

export type BuyablePlanId = Exclude<PlanId, "free" | "admin" | "dev" | "student_plus" | "teacher_plus">;

export interface PlanInfo {
  id: BuyablePlanId;
  name: string;
  price: string;
  priceK: number;
  description: string;
  features: string[];
}

export const PLANS: Record<BuyablePlanId, PlanInfo> = {
  student: {
    id: "student",
    name: "Student",
    price: "K50",
    priceK: 50,
    description: "Full access to quizzes, progress, Trading and Challenges.",
    features: [
      "Take all quizzes and save results",
      "Progress dashboard & reports",
      "Trading Post, Challenges and leaderboard scoring",
      "Gift CooperCoins to friends (50 CC per day)",
    ],
  },
  teacher_full: {
    id: "teacher_full",
    name: "Teacher Full",
    price: "K200",
    priceK: 200,
    description: "Complete access to every CooperWeb feature, including the Market and your CooperCard.",
    features: [
      "Everything in the Student plan",
      "Marking schemes",
      "Premium quizzes",
      "CooperCoins Market & custom card designs",
      "Your CooperCard with PIN lock and Nexa payments",
      "All current and future features",
      "Priority support",
    ],
  },
};

export const PLAN_LEVEL: Record<PlanId, number> = {
  free: 0,
  // Student Plus is the Auther trial tier: Student-level access while it lasts.
  // Legacy records carry no expiresAt and are resolved to "free" by effectivePlan().
  student_plus: 1,
  student: 1,
  teacher_plus: 1,
  teacher_full: 2,
  dev: 50,
  admin: 99,
};

export function hasPlan(current: PlanId, required: PlanId): boolean {
  return PLAN_LEVEL[current] >= PLAN_LEVEL[required];
}

/** Paid plans that unlock interactive features (quizzes, market, trading...). */
export function hasInteractiveAccess(planId: PlanId): boolean {
  return PLAN_LEVEL[planId] >= PLAN_LEVEL.student;
}

/** Teacher Full and above: the CooperCoins Market and the CooperCard. */
export function hasMarketAccess(planId: PlanId): boolean {
  return PLAN_LEVEL[planId] >= PLAN_LEVEL.teacher_full;
}

/** Teacher Full and above: the CooperCoins Market and your CooperCard. */
export function hasMarketAccess(planId: PlanId): boolean {
  return PLAN_LEVEL[planId] >= PLAN_LEVEL.teacher_full;
}

const LEGACY_NAMES: Partial<Record<PlanId, string>> = {
  student_plus: "Student Plus",
  teacher_plus: "Teacher Plus",
};

export function planName(id: PlanId): string {
  if (id === "admin") return "Admin";
  if (id === "free") return "Free";
  if (id === "dev") return "Developer";
  return PLANS[id as BuyablePlanId]?.name ?? LEGACY_NAMES[id] ?? id;
}

/** True once a time-limited grant has run out. Plans with no expiresAt never expire. */
export function isPlanExpired(plan: UserPlan | undefined, now = Date.now()): boolean {
  return !!plan?.expiresAt && plan.expiresAt <= now;
}

/**
 * Resolves the plan a user actually has right now.
 *
 * - admins always outrank their stored plan
 * - an expired grant falls back to "free"
 * - "student_plus" only counts while it carries a live expiry; legacy rows that
 *   predate the Auther trial have no expiresAt and stay "free" as before
 */
export function effectivePlan(
  plan: UserPlan | undefined,
  role: UserRole | undefined,
  now = Date.now()
): PlanId {
  if (role === "admin") return "admin";
  if (!plan) return "free";
  if (isPlanExpired(plan, now)) return "free";
  if (plan.id === "student_plus" && !plan.expiresAt) return "free";
  return plan.id ?? "free";
}

/** Milliseconds left on a time-limited plan, or null if it is permanent/absent. */
export function planTimeLeft(plan: UserPlan | undefined, now = Date.now()): number | null {
  if (!plan?.expiresAt) return null;
  return Math.max(0, plan.expiresAt - now);
}

/**
 * True while an active Auther Student Plus trial is running.
 * Requires expiresAt: a trial without one is malformed, not perpetual.
 */
export function isTrialActive(plan: UserPlan | undefined, now = Date.now()): boolean {
  return (
    plan?.kind === "student_plus_trial" && !!plan.expiresAt && !isPlanExpired(plan, now)
  );
}

export function generateClaimToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let token = "cw-";
  for (const b of bytes) token += chars[b % chars.length];
  return token;
}
