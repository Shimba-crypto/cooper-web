import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookMarked, CheckCircle2, Download, ExternalLink, HelpCircle, Lock } from "lucide-react";
import { usePapers } from "../hooks/usePapers";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useAuth } from "../context/AuthContext";
import { hasPlan } from "../utils/plans";
import { fetchJohnWebPaper, JOHNWEB_BASE, type JohnWebPaperDetail } from "../data/johnwebApi";
import StarRating from "../components/StarRating";
import SocialShare from "../components/SocialShare";
import SuggestedPapers from "../components/SuggestedPapers";
import Spinner from "../components/Spinner";
import { ratingSummary } from "../utils/filters";

export default function PaperViewPage() {
  const { id } = useParams<{ id: string }>();
  const { papers, loading, error, retry } = usePapers();
  const { planId } = useAuth();
  const [bookmarks, setBookmarks] = useLocalStorage<string[]>("cooperweb:bookmarks", []);
  const [ratings, setRatings] = useLocalStorage<Record<string, number>>("cooperweb:ratings", {});
  const [, setViewed] = useLocalStorage<string[]>("cooperweb:viewed", []);
  const [detail, setDetail] = useState<JohnWebPaperDetail | null | undefined>(undefined);

  const paper = papers.find((p) => p.id === id);

  useEffect(() => {
    let cancelled = false;
    setDetail(undefined);
    if (id?.startsWith("paper-")) {
      fetchJohnWebPaper(id).then((d) => {
        if (!cancelled) setDetail(d);
      });
    } else {
      setDetail(null);
    }
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (paper) {
      setViewed((prev) => (prev.includes(paper.id) ? prev : [...prev, paper.id]));
    }
  }, [paper, setViewed]);

  if (loading) return <Spinner label="Loading paper…" />;
  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="font-semibold text-red-600 dark:text-red-400">Failed to load: {error}</p>
        <button onClick={retry} className="btn-secondary mt-4">Retry</button>
      </div>
    );
  }
  if (!paper) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Paper not found</h1>
        <Link to="/papers" className="mt-4 inline-block font-semibold text-emerald-600 hover:text-emerald-700">
          ← Back to past papers
        </Link>
      </div>
    );
  }

  const bookmarked = bookmarks.includes(paper.id);
  const userRating = ratings[paper.id];
  const rating = ratingSummary(paper, userRating);
  const shareUrl = `${window.location.origin}/paper/${paper.id}`;

  const toggleBookmark = () =>
    setBookmarks((prev) =>
      prev.includes(paper.id) ? prev.filter((b) => b !== paper.id) : [...prev, paper.id]
    );

  const rate = (value: number) =>
    setRatings((prev) => ({ ...prev, [paper.id]: prev[paper.id] === value ? 0 : value }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/papers" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
        <ArrowLeft className="h-4 w-4" /> Back to past papers
      </Link>

      <div className="card mt-4 overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-700 to-teal-900 px-5 py-8 text-white sm:px-8 sm:py-10">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/20 px-3 py-1">Grade {paper.grade}</span>
            <span className="rounded-full bg-white/20 px-3 py-1">{paper.year}</span>
            <span className="rounded-full bg-white/20 px-3 py-1">{paper.paperType}</span>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">{paper.title}</h1>
          <p className="mt-2 text-emerald-100">Examination Council of Zambia · {paper.subject}</p>
        </div>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">About this paper</h2>
              <p className="mt-2 max-w-xl leading-relaxed text-slate-600 dark:text-slate-400">
                {paper.description}
              </p>
            </div>
            <button
              onClick={toggleBookmark}
              aria-pressed={bookmarked}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                bookmarked
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              <BookMarked className={`h-4 w-4 ${bookmarked ? "fill-white" : ""}`} />
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </button>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Subject</dt>
              <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{paper.subject}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Year & type</dt>
              <dd className="mt-1 font-semibold text-slate-900 dark:text-white">
                {paper.year} · {paper.paperType}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Rate this paper</h3>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StarRating interactive value={rating.average} userValue={userRating} onRate={rate} />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {rating.count > 0 ? (
                  <>
                    Average <span className="font-semibold">{rating.average.toFixed(1)}</span> ·{" "}
                    {rating.count} {rating.count === 1 ? "rating" : "ratings"}
                  </>
                ) : (
                  "No ratings yet — be the first!"
                )}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {paper.pdfUrl ? (
              <a
                href={paper.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                <Download className="h-4 w-4" /> Open PDF
              </a>
            ) : (
              <a
                href={`${JOHNWEB_BASE}/paper/${paper.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                <ExternalLink className="h-4 w-4" /> Open on John Web
              </a>
            )}
            {paper.markingUrl &&
              (hasPlan(planId, "teacher_full") ? (
                <a
                  href={paper.markingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  <CheckCircle2 className="h-4 w-4" /> Marking scheme
                </a>
              ) : (
                <span
                  title="Marking schemes require the Teacher Full plan"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                >
                  <Lock className="h-4 w-4" /> Marking scheme (Teacher Full)
                </span>
              ))}
          </div>

          {id?.startsWith("paper-") && (
            <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <HelpCircle className="h-5 w-5 text-emerald-600" /> Questions & answers
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Live from the John Web library — every question with its model answer.
              </p>
              {detail === undefined ? (
                <Spinner label="Loading questions…" />
              ) : detail === null ? (
                <p className="card mt-4 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Could not load questions for this paper right now — try again later.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {detail.questions.map((q) => (
                    <div key={q.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {q.questionNumber}. {q.text}
                        </p>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {q.marks} {q.marks === 1 ? "mark" : "marks"}
                        </span>
                      </div>
                      {q.options?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {q.options.map((option, oi) => (
                            <p
                              key={oi}
                              className={`rounded px-2 py-1 text-sm ${
                                q.modelAnswer && option.trim().toLowerCase() === q.modelAnswer.trim().toLowerCase()
                                  ? "bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                                  : "text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {String.fromCharCode(65 + oi)}. {option}
                              {q.modelAnswer && option.trim().toLowerCase() === q.modelAnswer.trim().toLowerCase() && " ✓"}
                            </p>
                          ))}
                        </div>
                      )}
                      {q.modelAnswer && (
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Model answer: </span>
                          {q.modelAnswer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
            <SocialShare title={paper.title} url={shareUrl} />
          </div>
        </div>
      </div>

      <SuggestedPapers current={paper} papers={papers} />
    </div>
  );
}
