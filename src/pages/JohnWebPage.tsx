import { ExternalLink, GraduationCap } from "lucide-react";
import PlansOverview from "../components/PlansOverview";
import { JOHNWEB_INVITE_URL, JOHNWEB_URL } from "../config";

export default function JohnWebPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white">John Web</h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-600 dark:text-slate-400">
          ECZ Grade 7 past papers, marking schemes and study resources — a companion to CooperWeb.
        </p>
        <a
          href={JOHNWEB_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-6"
        >
          <ExternalLink className="h-4 w-4" /> Visit John Web
        </a>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {JOHNWEB_URL} — opens in a new tab
        </p>
      </div>

      <div className="mt-12">
        <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-white">
          Payment plans
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Pick a plan on CooperWeb to unlock quizzes, leaderboards and more.
        </p>
        <div className="mt-6">
          <PlansOverview />
        </div>
      </div>
    </div>
  );
}
