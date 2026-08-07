import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, BarChart3, BookOpen, Megaphone, Search, Trophy, X } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { usePapers } from "../hooks/usePapers";
import { useQuizzes } from "../hooks/useQuizzes";
import { useLocalStorage } from "../hooks/useLocalStorage";
import PaperCard from "../components/PaperCard";
import Spinner from "../components/Spinner";
import FollowFeed from "../components/FollowFeed";
import type { Announcement } from "../types";

export default function HomePage() {
  const { papers, loading, error, retry } = usePapers();
  const { quizzes } = useQuizzes();
  const [bookmarks, setBookmarks] = useLocalStorage<string[]>("cooperweb:bookmarks", []);
  const [ratings] = useLocalStorage<Record<string, number>>("cooperweb:ratings", {});
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const toggleBookmark = (id: string) =>
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );

  const featured = papers.slice(0, 6);
  const subjects = [...new Set(papers.map((p) => p.subject))];

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/papers?q=${encodeURIComponent(query.trim())}` : "/papers");
  };

  return (
    <div>
      <AnnouncementBanner />
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-300 sm:text-sm">
            Examination Council of Zambia · Grade 7
          </p>
          <h1 className="mx-auto max-w-3xl text-3xl font-extrabold sm:text-5xl">
            Pass your Grade 7 exams with past papers and quizzes
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-emerald-100 sm:text-lg">
            Search ECZ past papers, take timed quizzes, and climb the leaderboard —
            all free.
          </p>

          <form onSubmit={submitSearch} className="mx-auto mt-8 flex max-w-xl flex-col gap-2 sm:flex-row" role="search">
            <label className="relative flex-1">
              <span className="sr-only">Search past papers</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Mathematics 2023…"
                className="w-full rounded-lg border-0 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 shadow focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </label>
            <button type="submit" className="rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white shadow transition hover:bg-orange-600 sm:shrink-0">
              Search
            </button>
          </form>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-semibold">
            <Link to="/papers" className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
              Browse papers →
            </Link>
            <Link to="/quizzes" className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
              Take a quiz →
            </Link>
            <Link to="/leaderboard" className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
              View leaderboard →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-6 w-6 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{papers.length || "…"} past papers</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Official-style Grade 7 papers across all core subjects.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-0.5 h-6 w-6 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{quizzes.length || "…"} quizzes</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Timed multiple-choice tests with instant results.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Trophy className="mt-0.5 h-6 w-6 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Leaderboard</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Compete with other students on quiz scores.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Latest papers</h2>
          <Link to="/papers" className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {error && (
          <div className="card p-8 text-center">
            <p className="font-semibold text-red-600 dark:text-red-400">Failed to load papers: {error}</p>
            <button onClick={retry} className="btn-secondary mt-4">Retry</button>
          </div>
        )}
        {loading ? (
          <Spinner label="Loading papers…" />
        ) : papers.length === 0 ? (
          <div className="card p-8 text-center text-slate-500 dark:text-slate-400">
            No papers yet. If you're an admin, add papers from the Admin dashboard.
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  bookmarked={bookmarks.includes(paper.id)}
                  userRating={ratings[paper.id]}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>
            {subjects.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Subjects:</span>
                {subjects.map((s) => (
                  <Link
                    key={s}
                    to={`/papers?subject=${encodeURIComponent(s)}`}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-400"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <FollowFeed />
    </div>
  );
}

function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Record<string, Announcement> | null>(null);
  const [dismissed, setDismissed] = useLocalStorage<string[]>("cooperweb:ann-dismissed", []);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "announcements"), (snapshot) => {
      setAnnouncements(snapshot.val() ?? {});
    });
    return unsubscribe;
  }, []);

  if (!announcements) return null;

  const latest = Object.values(announcements)
    .filter((a) => a.active)
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  if (!latest) return null;
  if (latest.dismissible && dismissed.includes(latest.id)) return null;

  const dismiss = () => {
    if (latest.dismissible) setDismissed((prev) => [...prev, latest.id]);
  };

  return (
    <div role="status" className="bg-amber-500 text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Megaphone className="h-4 w-4 shrink-0" aria-hidden />
        <p className="flex-1 text-sm font-medium">{latest.text}</p>
        {latest.dismissible ? (
          <button
            onClick={dismiss}
            aria-label="Dismiss announcement"
            className="rounded p-1 transition hover:bg-amber-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-xs font-bold uppercase tracking-wide opacity-80">News</span>
        )}
      </div>
    </div>
  );
}
