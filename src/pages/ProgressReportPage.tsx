import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Printer } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { hasInteractiveAccess } from "../utils/plans";
import UpgradeGate from "../components/UpgradeGate";
import Spinner from "../components/Spinner";
import type { QuizResult } from "../types";

export default function ProgressReportPage() {
  const { user, planId, appUser } = useAuth();
  const [results, setResults] = useState<Record<string, Record<string, QuizResult>> | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `results/${user.uid}`), (snap) => setResults(snap.val() ?? {}));
    return unsub;
  }, [user]);

  const stats = useMemo(() => {
    if (!results) return null;
    const rows = Object.entries(results).map(([quizId, attempts]) => {
      const list = Object.values(attempts);
      const best = Math.max(...list.map((a) => (a.total ? Math.round((a.score / a.total) * 100) : 0)));
      return { quizId, attempts: list.length, best, lastPlayed: Math.max(...list.map((a) => a.completedAt)) };
    });
    const totalAttempts = rows.reduce((s, r) => s + r.attempts, 0);
    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.best, 0) / rows.length) : 0;
    const perfect = rows.filter((r) => r.best === 100).length;
    return { rows, totalAttempts, avg, perfect };
  }, [results]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log in required</h1>
        <Link to="/login?next=/progress-report" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  if (!hasInteractiveAccess(planId)) {
    return <UpgradeGate title="Progress reports are a Student plan feature" />;
  }

  if (!stats) return <Spinner label="Preparing report…" />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="no-print flex items-center justify-between">
        <Link to="/progress" className="text-sm font-semibold text-emerald-600 hover:underline">
          ← Back to progress
        </Link>
        <button onClick={() => window.print()} className="btn-primary">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <div className="certificate-print card mt-4 p-8">
        <h1 className="text-center text-2xl font-extrabold text-slate-900">CooperWeb Progress Report</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          ECZ Grade 7 — generated {new Date().toLocaleDateString()}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-2xl font-extrabold text-slate-900">{stats.totalAttempts}</p>
            <p className="text-xs font-medium text-slate-500">Total attempts</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-2xl font-extrabold text-slate-900">{stats.rows.length}</p>
            <p className="text-xs font-medium text-slate-500">Quizzes played</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-2xl font-extrabold text-slate-900">{stats.avg}%</p>
            <p className="text-xs font-medium text-slate-500">Average best</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-2xl font-extrabold text-slate-900">{stats.perfect}</p>
            <p className="text-xs font-medium text-slate-500">Perfect scores</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[26rem] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-2 pr-4 font-bold text-slate-700">Quiz</th>
                <th className="py-2 pr-4 font-bold text-slate-700">Attempts</th>
                <th className="py-2 pr-4 font-bold text-slate-700">Best</th>
                <th className="py-2 font-bold text-slate-700">Last played</th>
              </tr>
            </thead>
            <tbody>
              {stats.rows.sort((a, b) => b.lastPlayed - a.lastPlayed).map((r) => (
                <tr key={r.quizId} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-800">{r.quizId}</td>
                  <td className="py-2 pr-4 text-slate-600">{r.attempts}</td>
                  <td className="py-2 pr-4 font-semibold text-slate-800">{r.best}%</td>
                  <td className="py-2 text-slate-600">{new Date(r.lastPlayed).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
          Student: {appUser?.displayName ?? user.email ?? "—"} · CooperWeb · chikondi-dot.web.app
        </p>
      </div>
    </div>
  );
}
