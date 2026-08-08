import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Coins, CreditCard, Eye, ShoppingBag, Star, TrendingUp } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { usePapers } from "../hooks/usePapers";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useAuth } from "../context/AuthContext";
import { hasInteractiveAccess, planName } from "../utils/plans";
import PlanBadge from "../components/PlanBadge";
import RedeemCard from "../components/RedeemCard";
import UpgradeGate from "../components/UpgradeGate";
import Spinner from "../components/Spinner";
import type { QuizResult } from "../types";

export default function DashboardPage() {
  const { papers, loading } = usePapers();
  const { user, appUser, planId } = useAuth();
  const [viewed] = useLocalStorage<string[]>("cooperweb:viewed", []);
  const [bookmarks] = useLocalStorage<string[]>("cooperweb:bookmarks", []);
  const [ratings] = useLocalStorage<Record<string, number>>("cooperweb:ratings", {});
  const [payPromptDismissed, setPayPromptDismissed] = useLocalStorage("cooperweb:pay-prompt-dismissed", false);
  const [myResults, setMyResults] = useState<Record<string, QuizResult> | null>(null);

  useEffect(() => {
    if (!user) {
      setMyResults(null);
      return;
    }
    const unsubscribe = onValue(ref(db, `results/${user.uid}`), (snapshot) => {
      setMyResults(snapshot.val() ?? {});
    });
    return unsubscribe;
  }, [user]);

  if (loading) return <Spinner label="Loading dashboard…" />;

  if (!hasInteractiveAccess(planId)) {
    return (
      <UpgradeGate
        title="Dashboard is a Student plan feature"
        message="Your dashboard tracks your quizzes, bookmarks and ratings. Browse papers and quizzes freely — upgrade to unlock your dashboard."
      />
    );
  }

  const viewedPapers = viewed.map((id) => papers.find((p) => p.id === id)).filter(Boolean);
  const ratingValues = Object.values(ratings);
  const avgRatingGiven = ratingValues.length
    ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
    : 0;

  const bySubject = papers.reduce<Record<string, number>>((acc, p) => {
    if (viewed.includes(p.id)) acc[p.subject] = (acc[p.subject] ?? 0) + 1;
    return acc;
  }, {});
  const maxSubject = Math.max(1, ...Object.values(bySubject));

  const stats = [
    { label: "Papers viewed", value: viewed.length, icon: Eye },
    { label: "Bookmarks", value: bookmarks.length, icon: Bookmark },
    {
      label: "Avg rating given",
      value: ratingValues.length ? avgRatingGiven.toFixed(1) : "—",
      icon: Star,
    },
    {
      label: "Quizzes taken",
      value: myResults ? Object.keys(myResults).length : 0,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Your Dashboard</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">
        Your study progress — stored on this device.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <stat.icon className="h-6 w-6 text-emerald-600" />
            <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {appUser?.referredBy && !payPromptDismissed && planId !== "teacher_full" && planId !== "admin" && (
        <div className="card mt-8 border-amber-400 p-6 dark:border-amber-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Time to pay up</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
                A friend invited you to CooperWeb. Get the full experience — marking schemes,
                premium quizzes and priority support with <strong className="text-slate-800 dark:text-slate-200">Teacher Full (K200)</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/payments" className="btn-primary">
                Pay now
              </Link>
              <button onClick={() => setPayPromptDismissed(true)} className="btn-secondary">
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="card mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your plan</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              You're on the <strong className="text-slate-700 dark:text-slate-200">{planName(planId)}</strong> plan.
            </p>
          </div>
          <PlanBadge planId={planId} />
        </div>
        <div className="mt-5">
          <RedeemCard />
        </div>
      </section>

      <div className="card mt-8 flex flex-wrap items-center gap-4 p-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 dark:text-white">Your CooperCard</h2>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {appUser?.card?.number ?? "Tap to issue your digital card"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 dark:bg-amber-950/40">
          <Coins className="h-5 w-5 text-amber-500" />
          <span className="text-xl font-extrabold text-amber-700 dark:text-amber-400">
            {appUser?.coins ?? 0}
          </span>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-500">CC</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/card" className="btn-secondary !px-4 !py-1.5 text-sm">
            <CreditCard className="h-4 w-4" /> My card
          </Link>
          <Link to="/market" className="btn-primary !px-4 !py-1.5 text-sm">
            <ShoppingBag className="h-4 w-4" /> Market
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Papers viewed by subject
          </h2>
          {Object.keys(bySubject).length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              You haven't viewed any papers yet.{" "}
              <Link to="/papers" className="font-semibold text-emerald-600 hover:underline">
                Browse papers →
              </Link>
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {Object.entries(bySubject)
                .sort((a, b) => b[1] - a[1])
                .map(([subject, count]) => (
                  <div key={subject}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{subject}</span>
                      <span className="text-slate-500 dark:text-slate-400">{count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: `${(count / maxSubject) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recently viewed</h2>
          {viewedPapers.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Nothing here yet. Open a paper to start tracking your progress.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {viewedPapers
                .slice(-8)
                .reverse()
                .map((paper) => (
                  <li key={paper!.id}>
                    <Link
                      to={`/paper/${paper!.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm transition hover:bg-emerald-50 dark:bg-slate-800/50 dark:hover:bg-emerald-950"
                    >
                      <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">
                        {paper!.title}
                      </span>
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{paper!.year}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      {myResults && Object.keys(myResults).length > 0 && (
      <section className="card mt-8 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">My quiz results</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(myResults)
              .sort((a, b) => b[1].completedAt - a[1].completedAt)
              .map(([quizId, result]) => (
                <div
                  key={quizId}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
                >
                  <Link to={`/quiz/${quizId}`} className="min-w-0 truncate font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                    {quizId.replace(/-/g, " ")}
                  </Link>
                  <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {result.score}/{result.total} · {new Date(result.completedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
