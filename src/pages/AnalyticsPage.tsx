import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Eye,
  FileQuestion,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useQuizzes } from "../hooks/useQuizzes";
import Spinner from "../components/Spinner";
import type { AppUser, QuizResult } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

const dateKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const dayStart = (offset: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() + offset * DAY_MS;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

function Bars({ series, color, track }: { series: number[]; color: string; track: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);
  const max = Math.max(1, ...series);
  return (
    <div className="flex h-40 items-end gap-2 sm:gap-3">
      {series.map((v, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
          <span className={`text-xs font-bold tabular-nums ${v > 0 ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-600"}`}>
            {v.toLocaleString()}
          </span>
          <div className={`relative w-full flex-1 overflow-hidden rounded-t-md ${track}`}>
            <div
              className={`absolute inset-x-0 bottom-0 ${color} transition-all duration-700 ease-out`}
              style={{ height: ready ? `${Math.max(2, (v / max) * 100)}%` : "0%", transitionDelay: `${i * 90}ms` }}
            />
          </div>
          <span className="text-[10px] font-medium uppercase text-slate-400 dark:text-slate-500">
            {DAY_LABELS[(dayStart(i - 6) / DAY_MS + 4) % 7]}
          </span>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ series }: { series: number[] }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 150);
    return () => clearTimeout(t);
  }, []);
  const w = 560;
  const h = 120;
  const pad = 8;
  const max = Math.max(1, ...series);
  const pts = series.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (series.length - 1 || 1);
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const dashLen = 600;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full" aria-hidden>
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={3.5}
          className="fill-emerald-500"
          style={{ opacity: drawn ? 1 : 0, transition: `opacity .3s ${0.15 + i * 0.08}s` }}
        />
      ))}
      <polyline
        points={line}
        fill="none"
        stroke="#10b981"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashLen}
        strokeDashoffset={drawn ? 0 : dashLen}
        style={{ transition: "stroke-dashoffset 1.2s ease-out .1s" }}
      />
    </svg>
  );
}

function Delta({ now, prev, suffix = "" }: { now: number; prev: number; suffix?: string }) {
  if (prev === 0) {
    return now > 0 ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
        new
      </span>
    ) : null;
  }
  const pct = Math.round(((now - prev) / prev) * 100);
  if (pct === 0) return <span className="text-xs font-semibold text-slate-400">±0%</span>;
  const up = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold ${
        up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {up ? "+" : ""}
      {pct}%{suffix}
    </span>
  );
}

interface DayInfo {
  key: string;
  label: string;
  signups: number;
  attempts: number;
  views: number;
  unique: number;
}

export default function AnalyticsPage() {
  const { user, appUser, loading: authLoading, isAdmin } = useAuth();
  const { quizzes } = useQuizzes();
  const [results, setResults] = useState<Record<string, Record<string, QuizResult>> | null>(null);
  const [users, setUsers] = useState<Record<string, AppUser> | null>(null);
  const [daily, setDaily] = useState<Record<string, Record<string, { views?: number; uniqueUsers?: Record<string, boolean> }>> | null>(null);
  const [lastVisit, setLastVisit] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const unsubs = [
      onValue(ref(db, "results"), (s) => setResults(s.val() ?? {})),
      onValue(ref(db, "users"), (s) => setUsers(s.val() ?? {})),
      onValue(ref(db, "analytics/daily"), (s) => setDaily(s.val() ?? {})),
      onValue(ref(db, "analytics/lastVisit"), (s) => setLastVisit(s.val() ?? {})),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const weekStart = dayStart(-6);
  const prevWeekStart = dayStart(-13);

  const days = useMemo<DayInfo[]>(() => {
    const week: DayInfo[] = [];
    for (let i = 0; i < 7; i++) {
      const start = dayStart(i - 6);
      const end = start + DAY_MS;
      const key = dateKey(start);
      week.push({ key, label: DAY_LABELS[(start / DAY_MS + 4) % 7], signups: 0, attempts: 0, views: 0, unique: 0 });
      const info = week[week.length - 1];

      if (users) {
        info.signups = Object.values(users).filter((u) => u.createdAt >= start && u.createdAt < end).length;
      }
      if (results) {
        for (const userResults of Object.values(results)) {
          for (const r of Object.values(userResults)) {
            if (r.completedAt >= start && r.completedAt < end) info.attempts += 1;
          }
        }
      }
      if (daily?.[key]) {
        const uids = new Set<string>();
        for (const pathData of Object.values(daily[key])) {
          info.views += pathData?.views ?? 0;
          if (pathData?.uniqueUsers) Object.keys(pathData.uniqueUsers).forEach((u) => uids.add(u));
        }
        info.unique = uids.size;
      }
    }
    return week;
  }, [results, users, daily]);

  const totals = useMemo(() => {
    const sum = (sel: (d: DayInfo) => number) => days.reduce((a, d) => a + sel(d), 0);
    return {
      signups: sum((d) => d.signups),
      attempts: sum((d) => d.attempts),
      views: sum((d) => d.views),
      unique: sum((d) => d.unique),
      active: lastVisit ? Object.values(lastVisit).filter((ts) => ts >= weekStart).length : 0,
    };
  }, [days, lastVisit, weekStart]);

  const prevTotals = useMemo(() => {
    if (!results || !users) return { signups: 0, attempts: 0 };
    let signups = 0;
    for (const u of Object.values(users)) {
      if (u.createdAt >= prevWeekStart && u.createdAt < weekStart) signups += 1;
    }
    let attempts = 0;
    for (const userResults of Object.values(results)) {
      for (const r of Object.values(userResults)) {
        if (r.completedAt >= prevWeekStart && r.completedAt < weekStart) attempts += 1;
      }
    }
    return { signups, attempts };
  }, [results, users, prevWeekStart, weekStart]);

  const topQuizzes = useMemo(() => {
    if (!results) return [];
    const map = new Map<string, { attempts: number; totalCorrect: number; totalQuestions: number }>();
    for (const userResults of Object.values(results)) {
      for (const [quizId, r] of Object.entries(userResults)) {
        if (r.completedAt < weekStart) continue;
        const row = map.get(quizId) ?? { attempts: 0, totalCorrect: 0, totalQuestions: 0 };
        row.attempts += 1;
        row.totalCorrect += r.score;
        row.totalQuestions += r.total;
        map.set(quizId, row);
      }
    }
    return [...map.entries()]
      .map(([quizId, row]) => ({
        quizId,
        title: quizzes.find((q) => q.id === quizId)?.title ?? quizId,
        ...row,
        avg: row.totalQuestions > 0 ? Math.round((row.totalCorrect / row.totalQuestions) * 100) : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 5);
  }, [results, quizzes, weekStart]);

  const topPages = useMemo(() => {
    if (!daily) return [];
    const map = new Map<string, { views: number; unique: Set<string> }>();
    for (const day of days) {
      const paths = daily[day.key] ?? {};
      for (const [path, data] of Object.entries(paths)) {
        const row = map.get(path) ?? { views: 0, unique: new Set<string>() };
        row.views += data?.views ?? 0;
        if (data?.uniqueUsers) Object.keys(data.uniqueUsers).forEach((u) => row.unique.add(u));
        map.set(path, row);
      }
    }
    return [...map.entries()]
      .map(([path, row]) => ({ path, views: row.views, unique: row.unique.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }, [daily, days]);

  const insights = useMemo(() => {
    const busiest = days.reduce((best, d) => (d.attempts + d.views > best.count ? { label: d.label, count: d.attempts + d.views } : best), { label: "—", count: 0 });
    const topQuiz = topQuizzes[0] ?? null;
    const topPage = topPages[0] ?? null;
    const avgScore =
      totals.attempts > 0 && results
        ? Math.round(
            (Object.values(results)
              .flatMap((ur) => Object.values(ur).filter((r) => r.completedAt >= weekStart))
              .reduce((a, r) => a + (r.total > 0 ? r.score / r.total : 0), 0) /
              Object.values(results)
                .flatMap((ur) => Object.values(ur).filter((r) => r.completedAt >= weekStart))
                .length) *
              100
          )
        : null;
    return { busiest, topQuiz, topPage, avgScore };
  }, [days, topQuizzes, topPages, totals.attempts, results, weekStart]);

  if (authLoading) return <Spinner label="Checking access…" />;
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Admin only</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">You need to log in to access analytics.</p>
        <Link to="/login?next=/analytics" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Access denied</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Your account ({appUser?.email}) doesn't have admin rights.
        </p>
      </div>
    );
  }
  if (!results || !users || !daily || !lastVisit) return <Spinner label="Crunching this week's numbers…" />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Weekly Analytics</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Last 7 days — {new Date(weekStart).toLocaleDateString()} to today. Updates live.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          <Activity className="h-4 w-4" /> Live
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <Users className="h-6 w-6 text-emerald-600" />
          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            <CountUp value={totals.signups} />
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">New students</p>
          <div className="mt-2"><Delta now={totals.signups} prev={prevTotals.signups} /></div>
        </div>
        <div className="card p-5">
          <FileQuestion className="h-6 w-6 text-emerald-600" />
          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            <CountUp value={totals.attempts} />
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Quiz attempts</p>
          <div className="mt-2"><Delta now={totals.attempts} prev={prevTotals.attempts} /></div>
        </div>
        <div className="card p-5">
          <Eye className="h-6 w-6 text-emerald-600" />
          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            <CountUp value={totals.views} />
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Page views</p>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Daily tracking started recently</p>
        </div>
        <div className="card p-5">
          <Activity className="h-6 w-6 text-emerald-600" />
          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            <CountUp value={totals.active} />
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Active students</p>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Visited in the last 7 days</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Users className="h-4 w-4 text-emerald-600" /> Signups
          </h2>
          <div className="mt-4"><Bars series={days.map((d) => d.signups)} color="bg-emerald-500" track="bg-emerald-50 dark:bg-emerald-950/40" /></div>
        </div>
        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <FileQuestion className="h-4 w-4 text-emerald-600" /> Quiz attempts
          </h2>
          <div className="mt-4"><Bars series={days.map((d) => d.attempts)} color="bg-teal-500" track="bg-teal-50 dark:bg-teal-950/40" /></div>
        </div>
        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Eye className="h-4 w-4 text-emerald-600" /> Page views
          </h2>
          <div className="mt-4"><Bars series={days.map((d) => d.views)} color="bg-blue-500" track="bg-blue-50 dark:bg-blue-950/40" /></div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <BarChart3 className="h-4 w-4 text-emerald-600" /> Attempts trend
          </h2>
          <div className="mt-4"><Sparkline series={days.map((d) => d.attempts)} /></div>
          <div className="mt-2 flex justify-between text-[10px] font-medium uppercase text-slate-400 dark:text-slate-500">
            {days.map((d) => (
              <span key={d.key}>{d.label}</span>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Trophy className="h-4 w-4 text-emerald-600" /> This week's insights
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-slate-600 dark:text-slate-300">
                Busiest day: <strong className="text-slate-900 dark:text-white">{insights.busiest.label}</strong>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <FileQuestion className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-slate-600 dark:text-slate-300">
                Most attempted quiz:{" "}
                <strong className="text-slate-900 dark:text-white">{insights.topQuiz?.title ?? "—"}</strong>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Eye className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-slate-600 dark:text-slate-300">
                Most visited page: <strong className="text-slate-900 dark:text-white">{insights.topPage ? `/${insights.topPage.path}` : "—"}</strong>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Trophy className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-slate-600 dark:text-slate-300">
                Average quiz score:{" "}
                <strong className="text-slate-900 dark:text-white">{insights.avgScore != null ? `${insights.avgScore}%` : "—"}</strong>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card h-fit p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Top quizzes this week</h2>
          {topQuizzes.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No attempts this week yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topQuizzes.map((q) => (
                <li key={q.quizId} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium text-slate-800 dark:text-slate-200">{q.title}</span>
                  <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
                    {q.attempts} attempts · <strong className="text-emerald-600 dark:text-emerald-400">{q.avg}%</strong>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card h-fit p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Top pages this week</h2>
          {topPages.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              No page views recorded yet this week — they start counting as students browse.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topPages.map((p) => (
                <li key={p.path} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium text-slate-800 dark:text-slate-200">/{p.path}</span>
                  <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
                    {p.views} views · {p.unique} students
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}