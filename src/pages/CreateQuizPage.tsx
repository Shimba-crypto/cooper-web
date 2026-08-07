import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Eye, Plus, Save, Trash2 } from "lucide-react";
import { ref, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import type { Question } from "../types";

const SUBJECTS = [
  "English",
  "Mathematics",
  "Science",
  "Social Studies",
  "Civic Education",
  "Religious Education",
  "Creative & Technology Studies",
];

const emptyQuestion = (): Question => ({
  id: `q${Date.now()}`,
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
});

export default function CreateQuizPage() {
  const { user, appUser } = useAuth();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [duration, setDuration] = useState(10);
  const [isPublic, setIsPublic] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log in to create quizzes</h1>
        <Link to="/login?next=/create-quiz" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  const updateQuestion = (index: number, patch: Partial<Question>) => {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()]);
  const removeQuestion = (index: number) => setQuestions((qs) => qs.filter((_, i) => i !== index));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()))) {
      return;
    }
    setBusy(true);
    const id = `user-${user.uid}-${Date.now()}`;
    await set(ref(db, `userQuizzes/${id}`), {
      id,
      title: title.trim(),
      subject,
      year: new Date().getFullYear(),
      durationMinutes: duration,
      questions: questions.map((q, i) => ({ ...q, id: q.id || `q${i + 1}` })),
      createdBy: user.uid,
      creatorName: appUser?.displayName ?? user.email?.split("@")[0] ?? "Anonymous",
      createdAt: Date.now(),
      public: isPublic,
    });
    setSaved(id);
    setBusy(false);
  };

  const copyLink = async () => {
    if (!saved) return;
    await navigator.clipboard.writeText(`${window.location.origin}/quiz/${saved}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (saved) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Check className="mx-auto h-16 w-16 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Quiz saved!</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Your quiz is {isPublic ? "visible to everyone" : "private"}.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={`/quiz/${saved}`} className="btn-primary">
            <Eye className="h-4 w-4" /> Preview quiz
          </Link>
          <button onClick={copyLink} className="btn-secondary">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button onClick={() => { setSaved(null); setTitle(""); setQuestions([emptyQuestion()]); }} className="btn-secondary">
            Create another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Create Quiz</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">
        Build your own quiz and share it with others.
      </p>

      <form onSubmit={save} className="mt-6 space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Details</h2>
          <label className="block">
            <span className="label">Title</span>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. My Mathematics Quiz" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Subject</span>
              <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Duration (minutes)</span>
              <input className="input" type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
            Make this quiz public (visible to everyone)
          </label>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Questions ({questions.length})</h2>
            <button type="button" onClick={addQuestion} className="btn-secondary !py-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add question
            </button>
          </div>
          {questions.map((q, qi) => (
            <div key={qi} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Q{qi + 1}</span>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(qi)} className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input className="input mt-2" required placeholder="Question text" value={q.text} onChange={(e) => updateQuestion(qi, { text: e.target.value })} />
              <div className="mt-2 space-y-1.5">
                {q.options.map((option, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button type="button" aria-label={`Correct answer is option ${oi + 1}`} onClick={() => updateQuestion(qi, { correctIndex: oi })} className={`h-5 w-5 shrink-0 rounded-full border-2 ${q.correctIndex === oi ? "border-emerald-600 bg-emerald-600" : "border-slate-300 dark:border-slate-600"}`} />
                    <input className="input !py-1.5" required placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={option} onChange={(e) => updateQuestion(qi, { options: q.options.map((o, i) => (i === oi ? e.target.value : o)) })} />
                  </div>
                ))}
              </div>
              <input className="input mt-2 !py-1.5" placeholder="Explanation (optional)" value={q.explanation ?? ""} onChange={(e) => updateQuestion(qi, { explanation: e.target.value })} />
            </div>
          ))}
        </div>

        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
          <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save quiz"}
        </button>
      </form>
    </div>
  );
}
