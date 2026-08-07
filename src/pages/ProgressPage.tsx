import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, BookOpen, CheckCircle2, Flame, Target, Trophy } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import type { QuizResult } from "../types";

interface Stat {
  quizId: string;
  quizTitle: string;
  best: number;
  attempts: number;
  lastPlayed: number;
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<Record<string, Record<string, QuizResult>> | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `results/${user.uid}`), (snap) => {
      setResults(snap.val() ?? {});
    });
    return unsub;
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log in required</h1>
        <Link to="/login?next=/progress" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  if (!results) return <Spinner label="Loading your progress…" />;

  const entries: Stat[] = Object.entries(results).map(([quizId, attempts]) => {
    const list = Object.values(attempts);
    const best = Math.max(...list.map((a) => (a.total > 0 ? Math.round((a.score / a.total) * 100) : 0)));
    const lastPlayed = Math.max(...list.map((a) => a.completedAt));
    return { quizId, quizTitle: quizId, best, attempts: list.length, lastPlayed };
  });

  const totalAttempts = entries.reduce((s, e) => s + e.attempts, 0);
  const avgScore = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.best, 0) / entries.length) : 0;
  const quizzesTaken = entries.length;
  const perfectScores = entries.filter((e) => e.best === 100).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Your Progress</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">Track your quiz performance over time.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center gap-3 p-5">
          <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-950">
            <Target className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalAttempts}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total attempts</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-5">
          <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-950">
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{quizzesTaken}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Quizzes played</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-5">
          <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-950">
            <Flame className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{avgScore}%</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Average best</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-5">
          <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-950">
            <Award className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{perfectScores}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Perfect scores</p>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
          <Trophy className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No quiz attempts yet. Take a quiz to see your progress here.
          </p>
          <Link to="/quizzes" className="btn-primary mt-4">Browse quizzes</Link>
        </div>
      ) : (
        <div className="mt-8 card p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Per-quiz breakdown</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Quiz</th>
                  <th className="py-2 pr-4 font-semibold">Attempts</th>
                  <th className="py-2 pr-4 font-semibold">Best score</th>
                  <th className="py-2 font-semibold">Last played</th>
                </tr>
              </thead>
              <tbody>
                {entries
                  .sort((a, b) => b.lastPlayed - a.lastPlayed)
                  .map((e) => (
                    <tr key={e.quizId} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                      <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200">
                        {e.quizTitle}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{e.attempts}</td>
                      <td className="py-2.5 pr-4">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          {e.best === 100 ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : null}
                          <span className={e.best >= 75 ? "text-emerald-700 dark:text-emerald-400" : e.best >= 50 ? "text-amber-700 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>
                            {e.best}%
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400">
                        {new Date(e.lastPlayed).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
