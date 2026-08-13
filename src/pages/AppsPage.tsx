import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Globe, Search, ShieldCheck, Zap } from "lucide-react";
import { JOHNWEB_INVITE_URL, JOHNWEB_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { planName } from "../utils/plans";

interface AppCard {
  name: string;
  tagline: string;
  status: "live" | "coming-soon";
  icon: typeof Globe;
  href?: string;
  to?: string;
  accent: string;
  badge: string;
}

export default function AppsPage() {
  const { appUser, planId } = useAuth();

  const apps: AppCard[] = [
    {
      name: "CooperWeb",
      tagline: "Past papers, quizzes, coins & your card — this app.",
      status: "live",
      icon: BookOpen,
      to: "/",
      accent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
      badge: "You are here",
    },
    {
      name: "John Web",
      tagline: "The ECZ past-paper question library that feeds CooperWeb.",
      status: "live",
      icon: Globe,
      href: JOHNWEB_URL,
      accent: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
      badge: "External",
    },
    {
      name: "Auther",
      tagline: "One identity across every Shimba app — and Student Plus free for 2 weeks.",
      status: "live",
      icon: ShieldCheck,
      to: "/login",
      accent: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
      badge: "Sign in",
    },
    {
      name: "Global Search",
      tagline: "One search across papers, quizzes, notes, people and John Web.",
      status: "live",
      icon: Search,
      to: "/search",
      accent: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
      badge: "One route",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3">
        <Zap className="h-8 w-8 text-emerald-600" />
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Apps</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The Shimba ecosystem — one account, many apps. Signed in as{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {appUser?.displayName ?? "guest"} ({planName(planId)})
            </span>
            .
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {apps.map((app) => {
          const Icon = app.icon;
          const inner = (
            <>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${app.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 dark:text-white">{app.name}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      app.status === "live"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {app.badge}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{app.tagline}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
            </>
          );
          const className =
            "flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-emerald-400 dark:bg-slate-900 dark:ring-slate-800";
          return app.to ? (
            <Link key={app.name} to={app.to} className={className}>
              {inner}
            </Link>
          ) : app.href ? (
            <a key={app.name} href={app.href} target="_blank" rel="noreferrer" className={className}>
              {inner}
            </a>
          ) : (
            <div key={app.name} className={`${className} cursor-default`}>
              {inner}
            </div>
          );
        })}
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-bold text-slate-900 dark:text-white">John Web invite</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your shared invite link for the John Web question library.
        </p>
        <a
          href={JOHNWEB_INVITE_URL}
          target="_blank"
          rel="noreferrer"
          className="btn-primary mt-3 inline-block"
        >
          Open invite
        </a>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        shimbaData powers the content · John Web serves it · CooperWeb runs it · Auther ties it together.
      </p>
    </div>
  );
}
