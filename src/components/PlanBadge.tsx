import type { PlanId } from "../types";
import { planName } from "../utils/plans";

const styles: Record<PlanId, string> = {
  admin: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-400",
  free: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  student_plus: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
  student: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
  teacher_plus: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400",
  teacher_full: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
};

export default function PlanBadge({ planId }: { planId: PlanId }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[planId]}`}
    >
      {planName(planId)}
    </span>
  );
}
