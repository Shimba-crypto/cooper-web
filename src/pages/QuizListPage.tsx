import { useEffect, useState } from "react";
import { useQuizzes } from "../hooks/useQuizzes";
import QuizCard from "../components/QuizCard";
import Spinner from "../components/Spinner";
import { Download, Check } from "lucide-react";
import type { Quiz } from "../types";

const OFFLINE_KEY = (id: string) => `cooperweb:offline-quiz:${id}`;

export function saveQuizOffline(quiz: Quiz) {
  try {
    localStorage.setItem(OFFLINE_KEY(quiz.id), JSON.stringify(quiz));
  } catch {
    // storage full or unavailable — ignore
  }
}

export function getQuizOffline(id: string): Quiz | null {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY(id));
    return raw ? (JSON.parse(raw) as Quiz) : null;
  } catch {
    return null;
  }
}

export default function QuizListPage() {
  const { quizzes, loading, error, retry } = useQuizzes();
  const [downloaded, setDownloaded] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("cooperweb:offline-quiz:")) {
        set.add(key.slice("cooperweb:offline-quiz:".length));
      }
    }
    return set;
  });

  useEffect(() => {
    if (error) {
      const cached = quizzes.length === 0 ? loadAllOffline() : [];
      if (cached.length === 0) return;
    }
  }, [error]);

  function loadAllOffline(): Quiz[] {
    const list: Quiz[] = [];
    for (const id of downloaded) {
      const quiz = getQuizOffline(id);
      if (quiz) list.push(quiz);
    }
    return list;
  }

  const toggleDownload = (quiz: Quiz) => {
    if (downloaded.has(quiz.id)) {
      localStorage.removeItem(OFFLINE_KEY(quiz.id));
      setDownloaded((prev) => {
        const next = new Set(prev);
        next.delete(quiz.id);
        return next;
      });
    } else {
      saveQuizOffline(quiz);
      setDownloaded((prev) => new Set(prev).add(quiz.id));
    }
  };

  const offlineQuizzes = loadAllOffline();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Quizzes</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">
        Timed multiple-choice tests. Your scores count toward the leaderboard.
      </p>

      {error && (
        <div className="card mt-8 p-8 text-center">
          <p className="font-semibold text-red-600 dark:text-red-400">
            Failed to load quizzes: {error}
          </p>
          {offlineQuizzes.length > 0 && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              You have {offlineQuizzes.length} downloaded quiz{offlineQuizzes.length === 1 ? "" : "es"} available offline below.
            </p>
          )}
          <button onClick={retry} className="btn-secondary mt-4">Retry</button>
        </div>
      )}

      {error && offlineQuizzes.length > 0 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {offlineQuizzes.map((quiz) => (
            <div key={quiz.id} className="relative">
              <QuizCard key={`${quiz.id}-offline`} quiz={quiz} />
              <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                Offline copy
              </span>
            </div>
          ))}
        </div>
      )}

      {!error &&
        (loading ? (
          <Spinner label="Loading quizzes…" />
        ) : quizzes.length === 0 ? (
          <div className="card mt-8 p-12 text-center text-slate-500 dark:text-slate-400">
            No quizzes yet. If you're an admin, add quizzes from the Admin dashboard.
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="relative">
                <QuizCard quiz={quiz} />
                <button
                  onClick={() => toggleDownload(quiz)}
                  aria-label={downloaded.has(quiz.id) ? "Remove offline copy" : "Download for offline"}
                  className={`absolute right-3 top-3 rounded-lg p-1.5 shadow-sm transition ${
                    downloaded.has(quiz.id)
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-slate-500 hover:text-emerald-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {downloaded.has(quiz.id) ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
