import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Award, CheckCircle2, ListChecks, Lock, Play, Share2, XCircle } from "lucide-react";
import { ref, runTransaction, set } from "firebase/database";
import { db } from "../firebase";
import { useQuizzes } from "../hooks/useQuizzes";
import { getQuizOffline } from "./QuizListPage";
import { useAuth } from "../context/AuthContext";
import { TIMER_CLASSES } from "../data/market";
import { API_URL } from "../config";
import type { Quiz } from "../types";
import { canAccessPremiumQuiz } from "../utils/redeem";
import { hasInteractiveAccess } from "../utils/plans";
import RedeemCard from "../components/RedeemCard";
import Spinner from "../components/Spinner";
import { useConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import ResultShareModal from "../components/ResultShareModal";

type Phase = "start" | "taking" | "results";

function format(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function QuizTakePage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { quizzes, loading, error, retry } = useQuizzes();
  const { user, appUser, planId } = useAuth();
  const navigate = useNavigate();

  const stateQuiz = (location.state as { quiz?: Quiz } | null)?.quiz;
  const isGenerated = stateQuiz != null;
  const offlineQuiz = isGenerated ? undefined : getQuizOffline(id ?? "");
  const quiz = stateQuiz ?? quizzes.find((q) => q.id === id) ?? offlineQuiz;
  const isOffline = offlineQuiz != null && !quizzes.some((q) => q.id === id);
  const interactive = hasInteractiveAccess(planId) || (user != null && isOffline);

  const { askConfirm, dialog: confirmDialog } = useConfirmDialog();
  const { showToast, toast } = useToast();

  const [phase, setPhase] = useState<Phase>("start");
  const [answers, setAnswers] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [earnedCC, setEarnedCC] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    if (quiz) {
      setAnswers(new Array(quiz.questions.length).fill(-1));
      setSecondsLeft(quiz.durationMinutes * 60);
    }
  }, [quiz]);

  useEffect(() => {
    if (phase !== "taking") return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          if (!autoSubmitted.current) {
            autoSubmitted.current = true;
            showToast("Time is up! Your quiz will be submitted automatically.");
            submitAnswers();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, quiz]);

  const submitAnswers = async () => {
    if (!quiz) return;
    autoSubmitted.current = true;
    setSaving(true);
    const correct = answers.reduce(
      (acc, answer, index) => acc + (answer === quiz.questions[index].correctIndex ? 1 : 0),
      0
    );
    setScore(correct);
    setPhase("results");
    setSaving(false);

    if (user && interactive && !isOffline) {
      try {
        await set(ref(db, `results/${user.uid}/${quiz.id}`), {
          score: correct,
          total: quiz.questions.length,
          completedAt: Date.now(),
        });
        if (!isGenerated) {
          await runTransaction(ref(db, `leaderboard/${user.uid}`), (current) => {
            const entry = current ?? { totalScore: 0, quizzesTaken: 0 };
            return {
              displayName: appUser?.displayName ?? user.email?.split("@")[0] ?? "Student",
              totalScore: entry.totalScore + correct,
              quizzesTaken: (entry.quizzesTaken ?? 0) + 1,
              lastUpdated: Date.now(),
            };
          });
        }
        const submissionId = `${quiz.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        fetch(`${API_URL}/api/earn`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, quizId: quiz.id, submissionId, score: correct, total: quiz.questions.length }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.earned > 0) setEarnedCC(data.earned);
          })
          .catch(() => {});
      } catch {
        // offline — results stay local
      }
    }
  };

  const manualSubmit = async () => {
    if (!quiz) return;
    if (answers.some((a) => a === -1)) {
      const confirmed = await askConfirm({
        title: "Submit quiz?",
        message: "You still have unanswered questions. Submit anyway?",
        confirmLabel: "Submit anyway",
        cancelLabel: "Keep going",
        danger: false,
      });
      if (!confirmed) return;
    }
    submitAnswers();
  };

  const results = useMemo(() => {
    if (!quiz || score === null) return null;
    return quiz.questions.map((q, i) => ({
      question: q,
      chosen: answers[i],
      correct: answers[i] === q.correctIndex,
    }));
  }, [quiz, answers, score]);

  if (loading) return <Spinner label="Loading quiz…" />;
  if (error && !offlineQuiz) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="font-semibold text-red-600 dark:text-red-400">Failed to load: {error}</p>
        <button onClick={retry} className="btn-secondary mt-4">Retry</button>
      </div>
    );
  }
  if (!quiz) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quiz not found</h1>
        <Link to="/quizzes" className="mt-4 inline-block font-semibold text-emerald-600 hover:underline">
          ← Back to quizzes
        </Link>
      </div>
    );
  }

  if (quiz.premium && !canAccessPremiumQuiz(planId, appUser?.unlockedQuizIds, quiz)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Link to="/quizzes" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> All quizzes
        </Link>
        <div className="card mt-4 p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{quiz.title}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This premium quiz needs the Teacher Full plan or a quiz pack code.
          </p>
          <div className="mx-auto mt-6 max-w-sm">
            <RedeemCard />
            <Link to="/payments" className="btn-secondary mt-3 w-full">
              Get Teacher Full (K200)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "start") {
    return (
      <>
        {toast}
        {confirmDialog}
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Link to="/quizzes" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> All quizzes
        </Link>
        <div className="card mt-4 p-5 text-center sm:p-8">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">{quiz.title}</h1>
          {isOffline && (
            <span className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              Offline copy — results won't be saved
            </span>
          )}
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {quiz.subject} · {quiz.year} · Grade 7
          </p>
          <div className="mt-6 flex justify-center gap-8 text-sm">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <ListChecks className="h-5 w-5 text-emerald-600" /> {quiz.questions.length} questions
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              ⏱ {quiz.durationMinutes} minutes
            </span>
          </div>
          {interactive ? (
            <>
              <p className="mx-auto mt-6 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {user
                  ? "Your score will be saved and added to the leaderboard."
                  : "Log in to save your score and earn leaderboard points."}
              </p>
              <button onClick={() => setPhase("taking")} className="btn-primary mt-6 !px-8 !py-3">
                <Play className="h-5 w-5" /> Start quiz
              </button>
              {!user && (
                <p className="mt-4 text-sm">
                  <Link to={`/login?next=/quiz/${quiz.id}`} className="font-semibold text-emerald-600 hover:underline">
                    Log in to save your score
                  </Link>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mx-auto mt-6 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Take this quiz free as a guest — your score won't be saved. Log in & upgrade to Student (K50) to save results and earn CooperCoins.
              </p>
              <button onClick={() => setPhase("taking")} className="btn-primary mt-6 !px-8 !py-3">
                <Play className="h-5 w-5" /> Start quiz
              </button>
              {!user && (
                <p className="mt-4 text-sm">
                  <Link to={`/login?next=/quiz/${quiz.id}`} className="font-semibold text-emerald-600 hover:underline">
                    Log in to save your score
                  </Link>{" "}
                  ·{" "}
                  <Link to="/payments" className="font-semibold text-emerald-600 hover:underline">
                    Upgrade to Student (K50)
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
      </>
    );
  }

  if (phase === "results" && results) {
    const percentage = Math.round((score! / quiz.questions.length) * 100);
    const confetti =
      appUser?.confettiOwned &&
      Array.from({ length: 50 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.4 + Math.random() * 2,
        color: ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa"][i % 5],
      }));
    return (
      <>
        {toast}
        {confirmDialog}
        {shareOpen && (
          <ResultShareModal
            quiz={quiz}
            score={score!}
            displayName={appUser?.displayName ?? user?.email?.split("@")[0] ?? "Student"}
            onClose={() => setShareOpen(false)}
          />
        )}
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="card overflow-hidden">
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 to-teal-900 px-5 py-8 text-center text-white sm:px-8 sm:py-10">
            {confetti &&
              confetti.map((piece, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="confetti-piece"
                  style={{
                    left: `${piece.left}%`,
                    backgroundColor: piece.color,
                    animationDelay: `${piece.delay}s`,
                    animationDuration: `${piece.duration}s`,
                  }}
                />
              ))}
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Result</p>
              <p className="mt-2 text-4xl font-extrabold sm:text-5xl">{score!}/{quiz.questions.length}</p>
              <p className="mt-2 text-lg font-semibold text-emerald-100">
                {percentage}% — {percentage >= 75 ? "Excellent!" : percentage >= 50 ? "Good job!" : "Keep practicing!"}
              </p>
              {earnedCC !== null && earnedCC > 0 && (
                <p className="mt-3 inline-block rounded-full bg-amber-400/90 px-4 py-1.5 text-sm font-extrabold text-amber-950 shadow">
                  +{earnedCC} CooperCoins earned!
                </p>
              )}
            </div>
          </div>
          <div className="space-y-6 p-5 sm:p-8">
            {results.map(({ question, chosen, correct }, i) => (
              <div key={question.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start gap-2">
                  {correct ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {i + 1}. {question.text}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      {question.options.map((option, oi) => (
                        <p
                          key={oi}
                          className={`rounded px-2 py-1 ${
                            oi === question.correctIndex
                              ? "bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                              : oi === chosen
                                ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                                : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}. {option}
                          {oi === question.correctIndex && " ✓"}
                        </p>
                      ))}
                      {question.explanation && (
                        <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">
                          {question.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!interactive && (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                This result wasn't saved —{" "}
                {user ? (
                  <Link to="/payments" className="font-semibold text-emerald-600 hover:underline">
                    upgrade to Student (K50)
                  </Link>
                ) : (
                  <Link to={`/login?next=/quiz/${quiz.id}`} className="font-semibold text-emerald-600 hover:underline">
                    log in & upgrade to Student (K50)
                  </Link>
                )}{" "}
                to save scores and earn CooperCoins.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate(0)} className="btn-primary">
                <Play className="h-4 w-4" /> Retake quiz
              </button>
              <button onClick={() => setShareOpen(true)} className="btn-secondary">
                <Share2 className="h-4 w-4" /> Share result
              </button>
              {percentage >= 75 && (
                <Link to={`/certificate/${quiz.id}`} className="btn-secondary">
                  <Award className="h-4 w-4" /> Certificate
                </Link>
              )}
              <Link to="/leaderboard" className="btn-secondary">View leaderboard</Link>
              <Link to="/quizzes" className="btn-secondary">More quizzes</Link>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {toast}
      {confirmDialog}
      <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/quizzes" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Quit quiz
        </Link>
        <span
          aria-live="polite"
          className={`rounded-lg px-3 py-1 font-mono text-lg font-bold tabular-nums ${
            secondsLeft <= 300
              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
              : appUser?.timerSkin
                ? `${TIMER_CLASSES[appUser.timerSkin] ?? "text-emerald-700 dark:text-emerald-400"} bg-slate-100 dark:bg-slate-900`
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
          }`}
        >
          ⏱ {format(secondsLeft)}
        </span>
      </div>

      <div className="card p-4 sm:p-6">
        <h1 className="text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">{quiz.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Question {answers.filter((a) => a !== -1).length + 1} of {quiz.questions.length}
        </p>
      </div>

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          manualSubmit();
        }}
      >
        {quiz.questions.map((question, qi) => (
          <fieldset key={question.id} className="card p-5">
            <legend className="sr-only">Question {qi + 1}</legend>
            <p className="font-semibold text-slate-900 dark:text-white">
              {qi + 1}. {question.text}
            </p>
            <div className="mt-3 space-y-2">
              {question.options.map((option, oi) => (
                <label
                  key={oi}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition cursor-pointer ${
                    answers[qi] === oi
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                      : "border-slate-200 hover:border-emerald-300 dark:border-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${qi}`}
                    checked={answers[qi] === oi}
                    onChange={() =>
                      setAnswers((prev) => {
                        const next = [...prev];
                        next[qi] = oi;
                        return next;
                      })
                    }
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="text-slate-700 dark:text-slate-200">
                    {String.fromCharCode(65 + oi)}. {option}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <button type="submit" disabled={saving} className="btn-primary w-full !py-3 disabled:opacity-60">
          {saving ? "Saving…" : "Submit quiz"}
        </button>
      </form>
      </div>
    </>
  );
}
