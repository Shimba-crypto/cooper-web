import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Copy, Swords, Trophy } from "lucide-react";
import { onValue, ref, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useQuizzes } from "../hooks/useQuizzes";
import Spinner from "../components/Spinner";
import type { Challenge, ChallengePlayer } from "../types";

export default function ChallengePage() {
  const { cid } = useParams<{ cid: string }>();
  const { user, appUser } = useAuth();
  const { quizzes, loading: quizzesLoading } = useQuizzes();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<Challenge | null | undefined>(undefined);
  const [chosenQuiz, setChosenQuiz] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cid || !user) return;
    const unsub = onValue(ref(db, `challenges/${cid}`), (snap) => setChallenge(snap.val() ?? null));
    return unsub;
  }, [cid, user]);

  const me = challenge?.players?.[user?.uid ?? ""];

  useEffect(() => {
    if (!user || !challenge || challenge.players?.[user.uid]) return;
    set(ref(db, `challenges/${challenge.id}/players/${user.uid}`), {
      uid: user.uid,
      displayName: appUser?.displayName ?? user.email?.split("@")[0] ?? "Player",
      answers: [],
      submitted: false,
      score: null,
      total: null,
      completedAt: null,
    } satisfies ChallengePlayer);
  }, [user, appUser, challenge]);

  const createChallenge = async () => {
    if (!user || !chosenQuiz) return;
    setBusy(true);
    const quiz = quizzes.find((q) => q.id === chosenQuiz);
    if (!quiz) return;
    const newId = `ch-${Date.now()}`;
    const player: ChallengePlayer = {
      uid: user.uid,
      displayName: appUser?.displayName ?? user.email?.split("@")[0] ?? "Player",
      answers: [],
      submitted: false,
      score: null,
      total: quiz.questions.length,
      completedAt: null,
    };
    await set(ref(db, `challenges/${newId}`), {
      id: newId,
      quizId: quiz.id,
      quizTitle: quiz.title,
      createdBy: user.uid,
      createdAt: Date.now(),
      players: { [user.uid]: player },
    } satisfies Challenge);
    navigate(`/challenge/${newId}`);
    setBusy(false);
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log in required</h1>
        <Link to={`/login?next=${cid ? `/challenge/${cid}` : "/challenge"}`} className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  if (challenge === undefined) return <Spinner label="Loading challenge…" />;

  if (challenge === null) {
    if (quizzesLoading) return <Spinner label="Loading quizzes…" />;
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-950">
            <Swords className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Challenge a friend</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pick a quiz, share the link, and race for the best score — live.
            </p>
          </div>
        </div>
        <div className="mt-6 card space-y-4 p-6">
          <label className="block">
            <span className="label">Quiz</span>
            <select className="input" value={chosenQuiz} onChange={(e) => setChosenQuiz(e.target.value)}>
              <option value="">Select a quiz…</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </label>
          <button onClick={createChallenge} disabled={busy || !chosenQuiz} className="btn-primary disabled:opacity-60">
            <Swords className="h-4 w-4" /> Create challenge room
          </button>
        </div>
      </div>
    );
  }

  const quiz = quizzes.find((q) => q.id === challenge.quizId);
  const players = Object.values(challenge.players ?? {}).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const allSubmitted = players.length >= 1 && players.every((p) => p.submitted);
  const link = `${window.location.origin}/challenge/${challenge.id}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{challenge.quizTitle}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {players.length} player{players.length === 1 ? "" : "s"} · {quiz?.questions.length ?? "?"} questions
            </p>
          </div>
          <button onClick={copyLink} className="btn-secondary">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Invite friend"}
          </button>
        </div>

        {!me && quiz && (
          <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
            You've joined as a challenger! Take the quiz, then come back to see live scores.
          </div>
        )}

        <div className="mt-5 space-y-2">
          {players.map((p, i) => (
            <div key={p.uid} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-400">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {p.displayName}
                    {p.uid === user.uid && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {p.submitted
                      ? `Scored ${p.score}/${p.total} · ${Math.round(((p.score ?? 0) / (p.total ?? p.score ?? 1)) * 100)}%`
                      : "Answering…"}
                  </p>
                </div>
              </div>
              {p.submitted && p.score !== null && (
                <Trophy className={`h-5 w-5 ${i === 0 ? "text-amber-500" : "text-slate-300 dark:text-slate-600"}`} />
              )}
            </div>
          ))}
        </div>

        {allSubmitted && (
          <p className="mt-4 rounded-lg bg-purple-50 px-4 py-3 text-center text-sm font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            All players finished!{" "}
            {players[0]?.uid === user.uid ? "You won this challenge!" : `${players[0]?.displayName} takes the win!`}
          </p>
        )}
      </div>

      {me && !me.submitted && quiz && (
        <ChallengeQuiz quiz={quiz} challengeId={challenge.id} playerUid={user.uid} displayName={me.displayName} />
      )}

      {me?.submitted && (
        <Link to={`/quiz/${challenge.quizId}`} className="btn-secondary mt-4">
          Retake this quiz
        </Link>
      )}
    </div>
  );
}

function ChallengeQuiz({
  quiz,
  challengeId,
  playerUid,
  displayName,
}: {
  quiz: NonNullable<ReturnType<typeof useQuizzes>["quizzes"][number]>;
  challengeId: string;
  playerUid: string;
  displayName: string;
}) {
  const [answers, setAnswers] = useState<number[]>(new Array(quiz.questions.length).fill(-1));
  const [submitting, setSubmitting] = useState(false);

  const setAnswer = (qi: number, oi: number) => {
    setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)));
  };

  const submit = async () => {
    setSubmitting(true);
    const score = quiz.questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0);
    await set(
      ref(db, `challenges/${challengeId}/players/${playerUid}`),
      {
        uid: playerUid,
        displayName,
        answers,
        submitted: true,
        score,
        total: quiz.questions.length,
        completedAt: Date.now(),
      } satisfies ChallengePlayer
    );
    setSubmitting(false);
  };

  const answered = answers.filter((a) => a !== -1).length;

  return (
    <div className="card mt-6 p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
        Answer the quiz ({answered}/{quiz.questions.length})
      </h2>
      <div className="mt-4 space-y-6">
        {quiz.questions.map((q, qi) => (
          <div key={q.id}>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {qi + 1}. {q.text}
            </p>
            <div className="mt-2 space-y-1.5">
              {q.options.map((option, oi) => (
                <button
                  key={oi}
                  onClick={() => setAnswer(qi, oi)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    answers[qi] === oi
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                      : "border-slate-200 text-slate-700 hover:border-emerald-300 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={submitting || answered < quiz.questions.length}
        className="btn-primary mt-6 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : `Submit (${answered}/${quiz.questions.length})`}
      </button>
    </div>
  );
}
