import { Link } from "react-router-dom";
import { Check, ShieldCheck } from "lucide-react";
import { PLANS } from "../utils/plans";

export default function PlansOverview() {
  const plans = Object.values(PLANS);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {plans.map((plan, i) => (
        <div
          key={plan.id}
          className={`card flex flex-col p-6 ${
            i === 1 ? "ring-2 ring-emerald-600 dark:ring-emerald-500" : ""
          }`}
        >
          {i === 1 && (
            <span className="mb-3 w-fit rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
              Most popular
            </span>
          )}
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{plan.name}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
          <p className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
            {plan.price}
            <span className="text-sm font-semibold text-slate-400"> / month</span>
          </p>
          <ul className="mt-4 flex-1 space-y-2">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {feature}
              </li>
            ))}
          </ul>
          <Link
            to={`/payments?plan=${plan.id}`}
            className={`${i === 1 ? "btn-primary" : "btn-secondary"} mt-6 w-full`}
          >
            Choose {plan.name}
          </Link>
        </div>
      ))}

      <div className="card flex flex-col p-6 sm:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Student Plus</h3>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            Free with Auther login
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Sign in with Auther and Student-level access is yours free for 2 weeks — quizzes,
          progress, Trading Post and Challenges. No card needed; it ends on its own.
        </p>
        <Link to="/login" className="btn-secondary mt-4 w-fit">
          Continue with Auther
        </Link>
      </div>
    </div>
  );
}
