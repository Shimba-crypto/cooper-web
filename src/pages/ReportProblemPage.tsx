import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Flag } from "lucide-react";
import { ref, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const REPORT_TYPES = [
  { value: "incorrect_answer", label: "Wrong answer" },
  { value: "typo", label: "Typo / grammar" },
  { value: "unclear", label: "Unclear question" },
  { value: "other", label: "Other" },
] as const;

export default function ReportProblemPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const quizId = params.get("quizId") ?? "";
  const questionId = params.get("questionId") ?? "";

  const [type, setType] = useState<string>("incorrect_answer");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log in to report</h1>
        <Link to="/login" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Report submitted</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Thanks for helping us improve! We'll review your report shortly.
        </p>
        <Link to="/quizzes" className="btn-primary mt-6">Back to quizzes</Link>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    const id = `report-${Date.now()}`;
    await set(ref(db, `reports/${id}`), {
      id,
      userId: user.uid,
      userEmail: user.email ?? "",
      quizId: quizId || undefined,
      questionId: questionId || undefined,
      type,
      message: message.trim(),
      status: "open",
      createdAt: Date.now(),
    });
    setBusy(false);
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/quizzes" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
        <ArrowLeft className="h-4 w-4" /> Back to quizzes
      </Link>
      <div className="mt-4 flex items-center gap-3">
        <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-950">
          <Flag className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Report a problem</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Found an error? Let us know and we'll fix it.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-6 card space-y-4 p-6">
        {quizId && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            Reporting about: <span className="font-semibold">{quizId}</span>
            {questionId && ` — question ${questionId}`}
          </p>
        )}
        <label className="block">
          <span className="label">Problem type</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Description</span>
          <textarea
            className="input"
            rows={4}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue in detail…"
          />
        </label>
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
          {busy ? "Submitting…" : "Submit report"}
        </button>
      </form>
    </div>
  );
}
