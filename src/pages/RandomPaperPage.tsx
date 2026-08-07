import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Dices, Shuffle } from "lucide-react";
import { useQuizzes } from "../hooks/useQuizzes";
import Spinner from "../components/Spinner";
import type { Quiz } from "../types";

const SUBJECTS = [
  "All",
  "English",
  "Mathematics",
  "Science",
  "Social Studies",
  "Civic Education",
  "Religious Education",
  "Creative & Technology Studies",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function RandomPaperPage() {
  const { quizzes, loading } = useQuizzes();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("All");
  const [count, setCount] = useState(10);
  const [duration, setDuration] = useState(15);

  const available = useMemo(
    () => quizzes.filter((q) => subject === "All" || q.subject === subject),
    [quizzes, subject]
  );

  const totalQuestions = available.reduce((s, q) => s + q.questions.length, 0);

  const generate = () => {
    const pool = shuffle(available.flatMap((q) => q.questions.map((question) => ({ ...question, options: [...question.options] }))));
    const picked = pool.slice(0, Math.min(count, pool.length));
    const quiz: Quiz = {
      id: `generated-${Date.now()}`,
      title: `Random ${subject === "All" ? "" : subject + " "}Practice Paper (${picked.length} questions)`,
      subject: subject === "All" ? "Mixed" : subject,
      year: new Date().getFullYear(),
      durationMinutes: duration,
      questions: picked,
    };
    navigate("/quiz/generated", { state: { quiz } });
  };

  if (loading) return <Spinner label="Loading questions…" />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/quizzes" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to quizzes
      </Link>
      <div className="mt-4 flex items-center gap-3">
        <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-950">
          <Dices className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Random Practice Paper</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mix questions from our quizzes into a fresh practice paper.
          </p>
        </div>
      </div>

      <div className="mt-6 card space-y-4 p-6">
        <label className="block">
          <span className="label">Subject</span>
          <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Number of questions (max {Math.min(count, totalQuestions)})</span>
          <input
            className="input"
            type="number"
            min={1}
            max={totalQuestions}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="label">Duration (minutes)</span>
          <input
            className="input"
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {available.length} quizzes · {totalQuestions} questions available in this subject.
        </p>
        <button onClick={generate} disabled={totalQuestions === 0} className="btn-primary disabled:opacity-60">
          <Shuffle className="h-4 w-4" /> Generate paper
        </button>
      </div>
    </div>
  );
}
