import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileQuestion,
  FileText,
  Flag,
  Gift,
  Handshake,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Store,
  Trash2,
  Trophy,
  Upload,
  Users,
  Ticket,
  Wallet,
} from "lucide-react";
import { onValue, ref, remove, set, update } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { usePapers } from "../hooks/usePapers";
import { useQuizzes } from "../hooks/useQuizzes";
import Spinner from "../components/Spinner";
import PlanBadge from "../components/PlanBadge";
import { useConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { notifyAllUsers } from "../utils/notify";
import PlansOverview from "../components/PlansOverview";
import { JOHNWEB_INVITE_URL, JOHNWEB_URL, PAYMENT_MERCHANT_NUMBER, API_URL } from "../config";
import { PLANS, generateClaimToken, planName, type BuyablePlanId } from "../utils/plans";
import { generateCode } from "../utils/redeem";
import { MARKET_ITEMS, marketItemById } from "../data/market";
import type {
  Announcement,
  AppUser,
  ClaimCode,
  DailyQuestion,
  Note,
  Paper,
  PaperType,
  Question,
  Quiz,
  QuizResult,
  RedeemCode,
  RedeemCodeType,
  Report,
  PaymentRecord,
} from "../types";

type Tab = "overview" | "papers" | "quizzes" | "analytics" | "announcements" | "plans" | "codes" | "payments" | "users" | "leaderboard" | "groups" | "export" | "notes" | "reports" | "daily" | "broadcast" | "import" | "market" | "johnweb" | "trading";

const PAPER_TYPES: PaperType[] = ["Paper 1", "Paper 2", "Practical"];
const SUBJECTS = [
  "English",
  "Mathematics",
  "Science",
  "Social Studies",
  "Civic Education",
  "Religious Education",
  "Creative & Technology Studies",
  "Special Paper 1",
  "Special Paper 2",
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminDashboardPage() {
  const { user, appUser, loading: authLoading, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  if (authLoading) return <Spinner label="Checking access…" />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Admin only</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          You need to log in to access the admin dashboard.
        </p>
        <Link to="/login?next=/admin" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Access denied</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Your account ({appUser?.email}) doesn't have admin rights. Ask an admin to promote you.
        </p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "papers", label: "Papers", icon: BookOpen },
    { id: "quizzes", label: "Quizzes", icon: FileQuestion },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "plans", label: "Plans", icon: Gift },
    { id: "codes", label: "Redeem Codes", icon: Ticket },
    { id: "payments", label: "Payments", icon: Wallet },
    { id: "users", label: "Users", icon: Users },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
    { id: "groups", label: "Groups", icon: Database },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "reports", label: "Reports", icon: Flag },
    { id: "daily", label: "Daily Q", icon: CalendarDays },
    { id: "export", label: "Export", icon: Download },
    { id: "broadcast", label: "Broadcast", icon: Send },
    { id: "import", label: "Import", icon: Upload },
    { id: "market", label: "Market", icon: Store },
    { id: "trading", label: "Trading", icon: Handshake },
    { id: "johnweb", label: "John Web", icon: ExternalLink },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Admin Dashboard</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">
        Manage papers, quizzes and users. Logged in as {appUser?.email}.
      </p>

      <div className="mt-6 -mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex w-max gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === t.id
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-600 shadow-sm hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {tab === "overview" && <OverviewTab />}
        {tab === "papers" && <PapersTab />}
        {tab === "quizzes" && <QuizzesTab />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "announcements" && <AnnouncementsTab />}
        {tab === "plans" && <PlansTab />}
        {tab === "codes" && <RedeemCodesTab />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "leaderboard" && <LeaderboardTab />}
        {tab === "groups" && <GroupsManagerTab />}
        {tab === "notes" && <NotesTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "daily" && <DailyQuestionTab />}
        {tab === "export" && <ExportTab />}
        {tab === "broadcast" && <BroadcastTab />}
        {tab === "import" && <ImportTab />}
        {tab === "market" && <MarketTab />}
        {tab === "trading" && <TradingTab />}
        {tab === "johnweb" && <JohnWebTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const { papers } = usePapers();
  const { quizzes } = useQuizzes();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [resultCount, setResultCount] = useState<number | null>(null);

  useEffect(() => {
    const unsubUsers = onValue(ref(db, "users"), (snapshot) =>
      setUserCount(snapshot.exists() ? Object.keys(snapshot.val()).length : 0)
    );
    const unsubResults = onValue(ref(db, "results"), (snapshot) =>
      setResultCount(snapshot.exists() ? Object.keys(snapshot.val()).length : 0)
    );
    return () => {
      unsubUsers();
      unsubResults();
    };
  }, []);

  const stats = [
    { label: "Papers", value: papers.length },
    { label: "Quizzes", value: quizzes.length },
    { label: "Users", value: userCount ?? "…" },
    { label: "Students with results", value: resultCount ?? "…" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="card p-5">
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

const emptyPaperForm = {
  title: "",
  subject: SUBJECTS[0],
  year: new Date().getFullYear(),
  paperType: "Paper 1" as PaperType,
  pdfUrl: "",
  markingUrl: "",
  description: "",
};

function PapersTab() {
  const { papers, loading } = usePapers();
  const [form, setForm] = useState(emptyPaperForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { askConfirm, dialog: confirmDialog } = useConfirmDialog();

  const startEdit = (paper: Paper) => {
    setEditingId(paper.id);
    setForm({
      title: paper.title,
      subject: paper.subject,
      year: paper.year,
      paperType: paper.paperType,
      pdfUrl: paper.pdfUrl,
      markingUrl: paper.markingUrl ?? "",
      description: paper.description,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const id = editingId ?? slugify(`${form.subject}-${form.year}-${form.paperType}-${Date.now()}`);
      await set(ref(db, `papers/${id}`), {
        title: form.title,
        subject: form.subject,
        year: Number(form.year),
        paperType: form.paperType,
        pdfUrl: form.pdfUrl,
        markingUrl: form.markingUrl || undefined,
        description: form.description,
      });
      if (!editingId) {
        await notifyAllUsers(db, {
          type: "new_quiz",
          title: "New past paper added",
          message: `${form.title} is now available.`,
          link: `/paper/${id}`,
        });
      }
      setForm(emptyPaperForm);
      setEditingId(null);
      setMessage(editingId ? "Paper updated." : "Paper added.");
    } catch (err) {
      setMessage(err instanceof Error ? `Failed: ${err.message}` : "Failed to save paper.");
    }
    setBusy(false);
  };

  const removePaper = async (id: string) => {
    const confirmed = await askConfirm({
      title: "Delete paper?",
      message: "Delete this paper permanently?",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    await remove(ref(db, `papers/${id}`));
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {confirmDialog}
      <form onSubmit={save} className="card h-fit p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {editingId ? "Edit paper" : "Add paper"}
        </h2>
        {message && (
          <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            {message}
          </p>
        )}
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="label">Title</span>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. English Language — Grade 7 Examination" />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="label">Subject</span>
              <select className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                {SUBJECTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Year</span>
              <input className="input" type="number" min={2000} max={2100} required value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
            </label>
            <label className="block">
              <span className="label">Paper type</span>
              <select className="input" value={form.paperType} onChange={(e) => setForm({ ...form, paperType: e.target.value as PaperType })}>
                {PAPER_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="label">PDF URL</span>
            <input className="input" required type="url" value={form.pdfUrl} onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })} placeholder="https://…paper.pdf" />
          </label>
          <label className="block">
            <span className="label">Marking scheme URL (optional)</span>
            <input className="input" type="url" value={form.markingUrl} onChange={(e) => setForm({ ...form, markingUrl: e.target.value })} placeholder="https://…answers.pdf" />
          </label>
          <label className="block">
            <span className="label">Description</span>
            <textarea className="input" rows={3} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description of the paper…" />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
              <Plus className="h-4 w-4" /> {editingId ? "Save changes" : "Add paper"}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm(emptyPaperForm); }} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="card h-fit p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Papers ({papers.length})</h2>
        {loading ? (
          <Spinner label="Loading papers…" />
        ) : papers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            No papers in the database yet.
          </p>
        ) : (
          <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {papers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{p.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {p.subject} · {p.year} · {p.paperType}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => startEdit(p)} aria-label={`Edit ${p.title}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => removePaper(p.id)} aria-label={`Delete ${p.title}`} className="rounded p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-950">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const emptyQuestion: Question = {
  id: "",
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
};

const emptyQuizForm = {
  title: "",
  subject: SUBJECTS[0],
  year: new Date().getFullYear(),
  durationMinutes: 30,
  premium: false,
  questions: [structuredClone(emptyQuestion)],
};

function QuizzesTab() {
  const { quizzes, loading } = useQuizzes();
  const [form, setForm] = useState(() => structuredClone(emptyQuizForm));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { askConfirm, dialog: confirmDialog } = useConfirmDialog();

  const startEdit = (quiz: Quiz) => {
    setEditingId(quiz.id);
    setForm({
      title: quiz.title,
      subject: quiz.subject,
      year: quiz.year,
      durationMinutes: quiz.durationMinutes,
      premium: quiz.premium ?? false,
      questions: structuredClone(quiz.questions),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateQuestion = (index: number, patch: Partial<Question>) => {
    setForm((f) => {
      const questions = f.questions.map((q, i) => (i === index ? { ...q, ...patch } : q));
      return { ...f, questions };
    });
  };

  const addQuestion = () =>
    setForm((f) => ({ ...f, questions: [...f.questions, structuredClone(emptyQuestion)] }));

  const removeQuestion = (index: number) =>
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== index) }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const questions = form.questions.map((q, i) => ({
      ...q,
      id: q.id || `${slugify(form.title)}-q${i + 1}`,
    }));
    if (questions.some((q) => q.options.some((o) => !o.trim()) || !q.text.trim())) {
      setMessage("Every question needs text and all four options.");
      setBusy(false);
      return;
    }
    try {
      const id = editingId ?? slugify(`${form.subject}-${form.year}-${form.title}`);
      await set(ref(db, `quizzes/${id}`), {
        title: form.title,
        subject: form.subject,
        year: Number(form.year),
        durationMinutes: Number(form.durationMinutes),
        questions,
        ...(form.premium ? { premium: true } : {}),
      });
      if (!editingId) {
        await notifyAllUsers(db, {
          type: "new_quiz",
          title: "New quiz added",
          message: `${form.title} is ready to try.`,
          link: `/quiz/${id}`,
        });
      }
      setForm(structuredClone(emptyQuizForm));
      setEditingId(null);
      setMessage(editingId ? "Quiz updated." : "Quiz added.");
    } catch (err) {
      setMessage(err instanceof Error ? `Failed: ${err.message}` : "Failed to save quiz.");
    }
    setBusy(false);
  };

  const removeQuiz = async (id: string) => {
    const confirmed = await askConfirm({
      title: "Delete quiz?",
      message: "Delete this quiz permanently?",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    await remove(ref(db, `quizzes/${id}`));
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {confirmDialog}
      <form onSubmit={save} className="card h-fit p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {editingId ? "Edit quiz" : "Add quiz"}
        </h2>
        {message && (
          <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm ${message.includes("Failed") || message.startsWith("Every") ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"}`}>
            {message}
          </p>
        )}
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Title</span>
              <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mathematics Grade 7 Quiz" />
            </label>
            <label className="block">
              <span className="label">Duration (minutes)</span>
              <input className="input" type="number" min={1} required value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
            </label>
            <label className="flex items-end gap-2 pb-1">
              <input
                type="checkbox"
                checked={form.premium}
                onChange={(e) => setForm({ ...form, premium: e.target.checked })}
                className="h-4 w-4 accent-emerald-600"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Premium (requires Teacher Full or a pack code)
              </span>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Subject</span>
              <select className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                {SUBJECTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Year</span>
              <input className="input" type="number" min={2000} max={2100} required value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="label !mb-0">Questions ({form.questions.length})</span>
              <button type="button" onClick={addQuestion} className="btn-secondary !py-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add question
              </button>
            </div>
            {form.questions.map((q, qi) => (
              <div key={qi} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Q{qi + 1}</span>
                  {form.questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qi)} aria-label={`Remove question ${qi + 1}`} className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input className="input mt-2" required placeholder="Question text" value={q.text} onChange={(e) => updateQuestion(qi, { text: e.target.value })} />
                <div className="mt-2 space-y-1.5">
                  {q.options.map((option, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Correct answer is option ${oi + 1}`}
                        aria-pressed={q.correctIndex === oi}
                        onClick={() => updateQuestion(qi, { correctIndex: oi })}
                        className={`h-5 w-5 shrink-0 rounded-full border-2 ${q.correctIndex === oi ? "border-emerald-600 bg-emerald-600" : "border-slate-300 dark:border-slate-600"}`}
                      />
                      <input
                        className="input !py-1.5"
                        required
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        value={option}
                        onChange={(e) =>
                          updateQuestion(qi, { options: q.options.map((o, i) => (i === oi ? e.target.value : o)) })
                        }
                      />
                    </div>
                  ))}
                </div>
                <input
                  className="input mt-2 !py-1.5"
                  placeholder="Explanation (optional)"
                  value={q.explanation ?? ""}
                  onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
              <Plus className="h-4 w-4" /> {editingId ? "Save changes" : "Add quiz"}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm(structuredClone(emptyQuizForm)); }} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="card h-fit p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quizzes ({quizzes.length})</h2>
        {loading ? (
          <Spinner label="Loading quizzes…" />
        ) : quizzes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No quizzes yet.</p>
        ) : (
          <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {quizzes.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{q.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {q.subject} · {q.year} · {q.questions.length} questions
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => startEdit(q)} aria-label={`Edit ${q.title}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => removeQuiz(q.id)} aria-label={`Delete ${q.title}`} className="rounded p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-950">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [results, setResults] = useState<Record<string, Record<string, QuizResult>> | null>(null);
  const [search, setSearch] = useState("");
  const { askConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    const unsubUsers = onValue(ref(db, "users"), (snapshot) => {
      const value = snapshot.val();
      setUsers(value ? Object.values(value as Record<string, AppUser>) : []);
    });
    const unsubResults = onValue(ref(db, "results"), (snapshot) => {
      setResults(snapshot.val() ?? {});
    });
    return () => {
      unsubUsers();
      unsubResults();
    };
  }, []);

  const setRole = async (uid: string, role: "user" | "admin") => {
    const confirmed = await askConfirm({
      title: `Change role to ${role}?`,
      message:
        role === "admin"
          ? "This user will get full admin access to this dashboard."
          : "This user will lose admin access to this dashboard.",
      confirmLabel: role === "admin" ? "Make admin" : "Demote",
      danger: role !== "admin",
    });
    if (!confirmed) return;
    await update(ref(db, `users/${uid}`), { role });
  };

  const deleteUser = async (u: AppUser) => {
    const confirmed = await askConfirm({
      title: "Delete user?",
      message: `Delete ${u.email}? This removes their profile, results, leaderboard entry and followers. This cannot be undone.`,
      confirmLabel: "Delete user",
      danger: true,
    });
    if (!confirmed) return;
    await Promise.all([
      remove(ref(db, `users/${u.uid}`)),
      remove(ref(db, `profiles/${u.uid}`)),
      remove(ref(db, `results/${u.uid}`)),
      remove(ref(db, `leaderboard/${u.uid}`)),
      remove(ref(db, `following/${u.uid}`)),
      remove(ref(db, `followers/${u.uid}`)),
    ]);
  };

  if (!users) return <Spinner label="Loading users…" />;

  const query = search.trim().toLowerCase();
  const filtered = query
    ? users.filter(
        (u) =>
          u.email?.toLowerCase().includes(query) ||
          u.displayName.toLowerCase().includes(query)
      )
    : users;

  const quizCount = (uid: string) => {
    const byUser = results?.[uid];
    return byUser ? Object.keys(byUser).length : 0;
  };

  return (
    <div className="card h-fit p-6">
      {confirmDialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Users ({users.length})</h2>
        <label className="relative w-full sm:w-auto">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input !py-2 pl-9 sm:w-64"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {query ? "No users match your search." : "No users yet."}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {filtered.map((u) => (
            <li
              key={u.uid}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                  <span className="truncate">{u.displayName}</span>
                  <PlanBadge planId={u.role === "admin" ? "admin" : (u.plan?.id ?? "free")} />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {u.email} · joined {new Date(u.createdAt).toLocaleDateString()} ·{" "}
                  {quizCount(u.uid)} quiz{quizCount(u.uid) === 1 ? "" : "zes"} taken
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {u.role === "admin" ? (
                  <button onClick={() => setRole(u.uid, "user")} className="btn-secondary !py-1 text-xs">
                    Demote
                  </button>
                ) : (
                  <button onClick={() => setRole(u.uid, "admin")} className="btn-primary !py-1 text-xs">
                    Make admin
                  </button>
                )}
                <button
                  onClick={() => deleteUser(u)}
                  aria-label={`Delete ${u.email}`}
                  className="rounded-lg p-2 text-red-500 transition hover:bg-red-100 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PaymentsTab() {
  const [payments, setPayments] = useState<Record<string, Record<string, PaymentRecord>> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { showToast, toast } = useToast();
  const apiKey = localStorage.getItem("cooperweb:admin-api-key") ?? "";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!apiKey) return;
      try {
        const res = await fetch(`${API_URL}/api/payments`, { headers: { "x-api-key": apiKey } });
        const data = await res.json();
        if (!cancelled && res.ok) setPayments(data ?? {});
      } catch {
        /* server bridge: ignore transient errors */
      }
    };
    load();
    const interval = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiKey]);

  const confirmPayment = async (p: PaymentRecord, status: "confirmed" | "rejected") => {
    if (!apiKey) {
      setMessage("Set your API key in the Broadcast tab first (it is stored on this device).");
      return;
    }
    setBusyId(p.id);
    try {
      const res = await fetch(`${API_URL}/api/payments/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ uid: p.uid, paymentId: p.id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `API ${res.status}`);
      showToast(status === "confirmed" ? "Plan activated" : "Payment rejected");
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const rows = payments
    ? Object.values(payments)
        .flatMap((byUser) => Object.values(byUser))
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  const pendingCount = rows.filter((p) => p.status === "pending" || p.status === "requested").length;

  return (
    <div className="card h-fit p-6">
      {toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Payments ({rows.length}{pendingCount > 0 ? `, ${pendingCount} awaiting action` : ""})
        </h2>
        <p className="text-xs text-slate-400">
          Use the Broadcast tab's API key to confirm/reject. MTN MoMo "requested" payments confirm themselves via webhook.
        </p>
      </div>
      {message && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{message}</p>
      )}
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No payments yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {(p.displayName ?? p.email) || p.uid.slice(0, 8)} — {planName(p.planId)} — K{p.amount}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(p.createdAt).toLocaleString()} · {p.method.toUpperCase()} · {p.phone}
                  {p.momoTransactionId ? ` · TXN ${p.momoTransactionId}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    p.status === "confirmed"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                      : p.status === "requested"
                        ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400"
                        : p.status === "rejected"
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                  }`}
                >
                  {p.status}
                </span>
                {(p.status === "pending" || p.status === "requested") && (
                  <>
                    <button
                      disabled={busyId === p.id}
                      onClick={() => confirmPayment(p, "confirmed")}
                      className="btn-primary !py-1 text-xs disabled:opacity-60"
                    >
                      {busyId === p.id ? "…" : "Confirm"}
                    </button>
                    <button
                      disabled={busyId === p.id}
                      onClick={() => confirmPayment(p, "rejected")}
                      className="btn-secondary !py-1 text-xs disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlansTab() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<Record<string, ClaimCode> | null>(null);
  const [planId, setPlanId] = useState<BuyablePlanId>("teacher_full");
  const [usageLimit, setUsageLimit] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const { askConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "claimCodes"), (snapshot) => {
      setCodes(snapshot.val() ?? {});
    });
    return unsubscribe;
  }, []);

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const tokens: string[] = [];
    try {
      for (let i = 0; i < quantity; i++) {
        const token = generateClaimToken();
        await set(ref(db, `claimCodes/${token}`), {
          planId,
          createdAt: Date.now(),
          createdBy: user?.uid ?? "admin",
          usageLimit: Number(usageLimit),
          usedCount: 0,
        } satisfies Omit<ClaimCode, "claimedBy" | "claimedByEmail" | "claimedAt">);
        tokens.push(token);
      }
      setMessage(
        `Created ${tokens.length} ${planName(planId)} claim link${tokens.length > 1 ? "s" : ""}. Links copied to clipboard.`
      );
      const links = tokens.map((t) => `${window.location.origin}/claim/${t}`).join("\n");
      await navigator.clipboard.writeText(links);
    } catch (err) {
      setMessage(err instanceof Error ? `Failed: ${err.message}` : "Failed to create links.");
    }
  };

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/claim/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  const codeById = (token: string) => codes?.[token]?.planId;

  const whatsAppLink = (token: string) =>
    `https://wa.me/?text=${encodeURIComponent(
      `Claim your ${planName(codeById(token) ?? "teacher_full")} plan on CooperWeb: ${window.location.origin}/claim/${token}`
    )}`;

  const removeCode = async (token: string) => {
    const confirmed = await askConfirm({
      title: "Delete claim link?",
      message: "Users who already claimed it keep their plan.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    await remove(ref(db, `claimCodes/${token}`));
  };

  const entries = codes
    ? Object.entries(codes).sort((a, b) => b[1].createdAt - a[1].createdAt)
    : [];

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="card h-fit p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Generate claim links
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Share these links with students or teachers. Each link can be claimed once per
          person (or more, depending on the usage limit).
        </p>
        {message && (
          <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm ${message.startsWith("Failed") ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"}`}>
            {message}
          </p>
        )}
        <form onSubmit={generate} className="mt-4 grid gap-4 sm:grid-cols-4">
          <label className="block">
            <span className="label">Plan</span>
            <select
              className="input"
              value={planId}
              onChange={(e) => setPlanId(e.target.value as BuyablePlanId)}
            >
              {Object.values(PLANS).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (K{p.price})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Uses per link</span>
            <input
              className="input"
              type="number"
              min={1}
              max={999}
              value={usageLimit}
              onChange={(e) => setUsageLimit(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="label">Quantity</span>
            <input
              className="input"
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full">
              <Gift className="h-4 w-4" /> Generate
            </button>
          </div>
        </form>
      </div>

      <div className="card h-fit p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Claim links ({entries.length})
        </h2>
        {!codes ? (
          <Spinner label="Loading claim links…" />
        ) : entries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            No claim links generated yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {entries.map(([token, code]) => {
              const claimed = code.claimedBy ? 1 : 0;
              const remaining = Math.max(0, code.usageLimit - code.usedCount);
              return (
                <li
                  key={token}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {token}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {planName(code.planId)} · created{" "}
                      {new Date(code.createdAt).toLocaleDateString()} ·{" "}
                      {claimed ? `claimed by ${code.claimedByEmail ?? code.claimedBy}` : `${remaining} use${remaining === 1 ? "" : "s"} left`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${claimed ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"}`}>
                      {claimed ? "Used" : "Available"}
                    </span>
                    <button
                      onClick={() => copyLink(token)}
                      aria-label={`Copy link for ${token}`}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                      {copiedToken === token ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <a
                      href={whatsAppLink(token)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Share link for ${token} on WhatsApp`}
                      className="rounded-lg p-2 text-green-600 transition hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-950"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => removeCode(token)}
                      aria-label={`Delete link ${token}`}
                      className="rounded-lg p-2 text-red-500 transition hover:bg-red-100 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const { quizzes, loading: quizzesLoading } = useQuizzes();
  const [results, setResults] = useState<Record<string, Record<string, QuizResult>> | null>(null);
  const [users, setUsers] = useState<Record<string, AppUser> | null>(null);
  const [pages, setPages] = useState<Record<string, { views?: number; uniqueUsers?: Record<string, boolean> }> | null>(null);

  useEffect(() => {
    const unsubResults = onValue(ref(db, "results"), (snapshot) => {
      setResults(snapshot.val() ?? {});
    });
    const unsubUsers = onValue(ref(db, "users"), (snapshot) => {
      setUsers(snapshot.val() ?? {});
    });
    const unsubPages = onValue(ref(db, "analytics/pages"), (snapshot) => {
      setPages(snapshot.val() ?? {});
    });
    return () => {
      unsubResults();
      unsubUsers();
      unsubPages();
    };
  }, []);

  const pageRows = useMemo(() => {
    if (!pages) return [];
    return Object.entries(pages)
      .map(([path, data]) => ({
        path,
        views: data?.views ?? 0,
        unique: data?.uniqueUsers ? Object.keys(data.uniqueUsers).length : 0,
      }))
      .sort((a, b) => b.views - a.views);
  }, [pages]);

  const rows = useMemo(() => {
    if (!results || !users) return null;
    const byQuiz = new Map<
      string,
      {
        attempts: number;
        totalCorrect: number;
        totalQuestions: number;
        bestScore: number;
        bestUser: string;
        bestName: string;
      }
    >();
    for (const [uid, userResults] of Object.entries(results)) {
      const displayName = users[uid]?.displayName ?? uid.slice(0, 6);
      for (const [quizId, result] of Object.entries(userResults)) {
        const row = byQuiz.get(quizId) ?? {
          attempts: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          bestScore: 0,
          bestUser: uid,
          bestName: displayName,
        };
        row.attempts += 1;
        row.totalCorrect += result.score;
        row.totalQuestions += result.total;
        const pct = result.total > 0 ? (result.score / result.total) * 100 : 0;
        if (pct > row.bestScore) {
          row.bestScore = pct;
          row.bestUser = uid;
          row.bestName = displayName;
        }
        byQuiz.set(quizId, row);
      }
    }
    return [...byQuiz.entries()]
      .map(([quizId, row]) => ({
        quizId,
        quizTitle: quizzes.find((q) => q.id === quizId)?.title ?? quizId,
        ...row,
        avgPct:
          row.attempts > 0
            ? Math.round((row.totalCorrect / row.totalQuestions) * 100)
            : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts);
  }, [results, users, quizzes]);

  if (quizzesLoading || !results || !users || !rows) {
    return <Spinner label="Crunching analytics…" />;
  }

  const totalAttempts = rows.reduce((sum, r) => sum + r.attempts, 0);
  const activeStudents = Object.keys(results).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalAttempts}</p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Quiz attempts</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{activeStudents}</p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Students with results</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{quizzes.length}</p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Available quizzes</p>
        </div>
      </div>

      <div className="card h-fit p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quiz performance</h2>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            No attempts yet. When students finish quizzes, stats appear here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Quiz</th>
                  <th className="py-2 pr-4 font-semibold">Attempts</th>
                  <th className="py-2 pr-4 font-semibold">Average score</th>
                  <th className="py-2 pr-4 font-semibold">Best score</th>
                  <th className="py-2 font-semibold">Top student</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.quizId}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                  >
                    <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200">
                      {r.quizTitle}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{r.attempts}</td>
                    <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{r.avgPct}%</td>
                    <td className="py-2.5 pr-4 font-semibold text-emerald-700 dark:text-emerald-400">
                      {Math.round(r.bestScore)}%
                    </td>
                    <td className="py-2.5">
                      <Link
                        to={`/profile/${r.bestUser}`}
                        className="font-medium text-emerald-600 hover:underline"
                      >
                        {r.bestName}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card h-fit p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Page views</h2>
        {pageRows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            No page data yet. Views start counting once logged-in students browse the site.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[24rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Page</th>
                  <th className="py-2 pr-4 font-semibold">Views</th>
                  <th className="py-2 font-semibold">Unique students</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p) => (
                  <tr key={p.path} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200">/{p.path}</td>
                    <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{p.views}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">{p.unique}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AnnouncementsTab() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Record<string, Announcement> | null>(null);
  const [text, setText] = useState("");
  const [dismissible, setDismissible] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { askConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "announcements"), (snapshot) => {
      setAnnouncements(snapshot.val() ?? {});
    });
    return unsubscribe;
  }, []);

  const publish = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const id = `ann-${Date.now()}`;
      await set(ref(db, `announcements/${id}`), {
        id,
        text: text.trim(),
        createdAt: Date.now(),
        createdBy: user?.uid ?? "admin",
        dismissible,
        active: true,
      } satisfies Announcement);
      await notifyAllUsers(db, {
        type: "announcement",
        title: "New announcement",
        message: text.trim(),
        link: "/",
      });
      setText("");
      setMessage("Announcement published. It appears in a banner on the homepage.");
    } catch (err) {
      setMessage(err instanceof Error ? `Failed: ${err.message}` : "Failed to publish.");
    }
    setBusy(false);
  };

  const toggleActive = async (a: Announcement) => {
    await update(ref(db, `announcements/${a.id}`), { active: !a.active });
  };

  const removeAnnouncement = async (a: Announcement) => {
    const confirmed = await askConfirm({
      title: "Delete announcement?",
      message: "Delete this announcement permanently?",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    await remove(ref(db, `announcements/${a.id}`));
  };

  const entries = announcements
    ? Object.entries(announcements).sort((a, b) => b[1].createdAt - a[1].createdAt)
    : [];

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="card h-fit p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">New announcement</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Shows as a banner on the homepage for all visitors.
        </p>
        {message && (
          <p
            role="status"
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              message.startsWith("Failed")
                ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
            }`}
          >
            {message}
          </p>
        )}
        <form onSubmit={publish} className="mt-4 space-y-3">
          <label className="block">
            <span className="label">Message</span>
            <textarea
              className="input"
              rows={3}
              maxLength={300}
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. New quizzes added! Try the Mathematics fractions quiz today."
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={dismissible}
              onChange={(e) => setDismissible(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            Users can dismiss this banner
          </label>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            <Megaphone className="h-4 w-4" /> {busy ? "Publishing…" : "Publish"}
          </button>
        </form>
      </div>

      <div className="card h-fit p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Announcements ({entries.length})
        </h2>
        {!announcements ? (
          <Spinner label="Loading announcements…" />
        ) : entries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            No announcements yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {entries.map(([id, a]) => (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{a.text}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(a.createdAt).toLocaleDateString()} ·{" "}
                    {a.dismissible ? "dismissible" : "permanent"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      a.active
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {a.active ? "Live" : "Hidden"}
                  </span>
                  <button onClick={() => toggleActive(a)} className="btn-secondary !py-1 text-xs">
                    {a.active ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => removeAnnouncement(a)}
                    aria-label="Delete announcement"
                    className="rounded-lg p-2 text-red-500 transition hover:bg-red-100 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LeaderboardTab() {
  const [entries, setEntries] = useState<Record<string, { displayName: string; score: number; quizId: string; quizTitle: string; date: number }> | null>(null);
  const [busy, setBusy] = useState(false);
  const { askConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    const unsub = onValue(ref(db, "leaderboard"), (snap) => setEntries(snap.val() ?? {}));
    return unsub;
  }, []);

  const clearEntry = async (uid: string, name: string) => {
    const confirmed = await askConfirm({
      title: `Remove ${name} from leaderboard?`,
      message: "This removes their leaderboard entry. Their quiz results stay intact.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!confirmed) return;
    await remove(ref(db, `leaderboard/${uid}`));
  };

  const resetAll = async () => {
    const count = entries ? Object.keys(entries).length : 0;
    const confirmed = await askConfirm({
      title: "Reset entire leaderboard?",
      message: `Delete all ${count} leaderboard entries? Quiz results are not affected.`,
      confirmLabel: "Reset leaderboard",
      danger: true,
    });
    if (!confirmed) return;
    setBusy(true);
    await remove(ref(db, "leaderboard"));
    setBusy(false);
  };

  const rows = entries
    ? Object.entries(entries)
        .map(([uid, v]) => ({ uid, ...v }))
        .sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Leaderboard ({rows.length} {rows.length === 1 ? "entry" : "entries"})
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Remove spam or test entries. Reset clears the board without touching quiz results.
            </p>
          </div>
          {rows.length > 0 && (
            <button
              onClick={resetAll}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" /> Reset all
            </button>
          )}
        </div>
        {!entries ? (
          <Spinner label="Loading leaderboard…" />
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Leaderboard is empty.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-4 font-semibold">#</th>
                  <th className="py-2 pr-4 font-semibold">Student</th>
                  <th className="py-2 pr-4 font-semibold">Quiz</th>
                  <th className="py-2 pr-4 font-semibold">Score</th>
                  <th className="py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.uid}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                  >
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{i + 1}</td>
                    <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200">
                      {r.displayName || r.uid.slice(0, 6)}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">
                      {r.quizTitle}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-emerald-700 dark:text-emerald-400">
                      {r.score}
                    </td>
                    <td className="py-2.5">
                      <button
                        onClick={() => clearEntry(r.uid, r.displayName || r.uid.slice(0, 6))}
                        aria-label={`Remove ${r.displayName} from leaderboard`}
                        className="rounded p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupsManagerTab() {
  const [groups, setGroups] = useState<Record<string, { name: string; createdBy: string; createdAt: number; joinCode: string }> | null>(null);
  const [members, setMembers] = useState<Record<string, Record<string, { displayName: string; role: string }>>>({});
  const [expandedGid, setExpandedGid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { askConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    const unsubGroups = onValue(ref(db, "groups"), (snap) => setGroups(snap.val() ?? {}));
    const unsubMembers = onValue(ref(db, "groupMembers"), (snap) => setMembers(snap.val() ?? {}));
    return () => { unsubGroups(); unsubMembers(); };
  }, []);

  const deleteGroup = async (gid: string, name: string) => {
    const confirmed = await askConfirm({
      title: `Delete "${name}"?`,
      message: "This removes the group, all member records, and each student's group link. Cannot be undone.",
      confirmLabel: "Delete group",
      danger: true,
    });
    if (!confirmed) return;
    setBusy(true);
    const groupMembers = members[gid] ?? {};
    const updates: Record<string, null> = {};
    updates[`groups/${gid}`] = null;
    updates[`groupMembers/${gid}`] = null;
    for (const uid of Object.keys(groupMembers)) {
      updates[`myGroups/${uid}/${gid}`] = null;
    }
    await set(ref(db), updates);
    setBusy(false);
  };

  const removeMember = async (gid: string, uid: string, name: string) => {
    const confirmed = await askConfirm({
      title: `Remove ${name}?`,
      message: "Remove this member from the group. They can rejoin with the join code.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!confirmed) return;
    await set(ref(db), {
      [`groupMembers/${gid}/${uid}`]: null,
      [`myGroups/${uid}/${gid}`]: null,
    });
  };

  const rows = groups
    ? Object.entries(groups).map(([gid, g]) => ({
        gid,
        ...g,
        memberCount: Object.keys(members[gid] ?? {}).length,
        memberList: Object.entries(members[gid] ?? {}).map(([uid, m]) => ({ uid, ...m })),
      }))
    : [];

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          School groups ({rows.length})
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          View and manage groups. Deleting a group removes all member links.
        </p>
        {!groups ? (
          <Spinner label="Loading groups…" />
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No groups yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {rows.map((r) => (
              <li key={r.gid} className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{r.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Code: <span className="font-mono font-bold">{r.joinCode}</span> · {r.memberCount} member{r.memberCount === 1 ? "" : "s"} · Created {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setExpandedGid(expandedGid === r.gid ? null : r.gid)}
                      className="btn-secondary !py-1 text-xs"
                    >
                      {expandedGid === r.gid ? "Hide members" : "View members"}
                    </button>
                    <button
                      onClick={() => deleteGroup(r.gid, r.name)}
                      disabled={busy}
                      aria-label={`Delete ${r.name}`}
                      className="rounded p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-950 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {expandedGid === r.gid && (
                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                    {r.memberList.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">No members.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {r.memberList.map((m) => (
                          <li key={m.uid} className="flex items-center justify-between gap-2 text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {m.displayName}
                              {m.role === "teacher" && (
                                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                                  Teacher
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => removeMember(r.gid, m.uid, m.displayName)}
                              className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ExportTab() {
  const [busy, setBusy] = useState<string | null>(null);

  const downloadJson = async (path: string, filename: string) => {
    setBusy(filename);
    try {
      const snap = await new Promise<unknown>((resolve, reject) => {
        const unsub = onValue(ref(db, path), (s) => { unsub(); resolve(s.val() ?? {}); }, reject);
      });
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
    setBusy(null);
  };

  const exportAll = async () => {
    setBusy("all-data.json");
    try {
      const snap = await new Promise<unknown>((resolve, reject) => {
        const unsub = onValue(ref(db, "/"), (s) => { unsub(); resolve(s.val() ?? {}); }, reject);
      });
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cooperweb-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Full export failed:", err);
    }
    setBusy(null);
  };

  const items = [
    { path: "users", label: "Users", filename: "users.json", desc: "All user accounts" },
    { path: "papers", label: "Papers", filename: "papers.json", desc: "All study papers" },
    { path: "quizzes", label: "Quizzes", filename: "quizzes.json", desc: "All quizzes and questions" },
    { path: "results", label: "Quiz results", filename: "results.json", desc: "All student quiz scores" },
    { path: "leaderboard", label: "Leaderboard", filename: "leaderboard.json", desc: "Leaderboard entries" },
    { path: "announcements", label: "Announcements", filename: "announcements.json", desc: "All announcements" },
    { path: "groups", label: "Groups", filename: "groups.json", desc: "School groups" },
    { path: "groupMembers", label: "Group members", filename: "group-members.json", desc: "All group memberships" },
    { path: "profiles", label: "Profiles", filename: "profiles.json", desc: "User profiles (avatars, bios)" },
    { path: "following", label: "Following", filename: "following.json", desc: "All follow relationships" },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Export database</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Download JSON backups of any data node. Useful for backups, migrations, or auditing.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <button
              key={item.filename}
              onClick={() => downloadJson(item.path, item.filename)}
              disabled={busy !== null}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800 dark:hover:bg-emerald-950"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
              {busy === item.filename ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">Exporting…</span>
              ) : (
                <Download className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
              )}
            </button>
          ))}
        </div>
        <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
          <button
            onClick={exportAll}
            disabled={busy !== null}
            className="btn-primary disabled:opacity-60"
          >
            <Database className="h-4 w-4" /> {busy === "all-data.json" ? "Exporting…" : "Export entire database"}
          </button>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Downloads all nodes in a single file. May be large for production databases.
          </p>
        </div>
      </div>
    </div>
  );
}

function NotesTab() {
  const [notes, setNotes] = useState<Record<string, Note> | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("English");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { askConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    const unsub = onValue(ref(db, "notes"), (snap) => setNotes(snap.val() ?? {}));
    return unsub;
  }, []);

  const subjects = ["English", "Mathematics", "Science", "Social Studies", "Civic Education", "Religious Education", "Creative & Technology Studies"];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setBusy(true);
    const id = `note-${slugify(title)}-${Date.now()}`;
    await set(ref(db, `notes/${id}`), { id, title: title.trim(), subject, content: content.trim(), createdAt: Date.now(), createdBy: "admin" });
    setTitle(""); setContent(""); setMessage("Note published.");
    setBusy(false);
  };

  const removeNote = async (id: string, noteTitle: string) => {
    const confirmed = await askConfirm({ title: `Delete "${noteTitle}"?`, message: "Delete this note permanently?", confirmLabel: "Delete", danger: true });
    if (!confirmed) return;
    await remove(ref(db, `notes/${id}`));
  };

  const rows = notes ? Object.entries(notes).sort((a, b) => b[1].createdAt - a[1].createdAt) : [];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {confirmDialog}
      <form onSubmit={save} className="card h-fit p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add note</h2>
        {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">{message}</p>}
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="label">Title</span>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fractions summary" />
          </label>
          <label className="block">
            <span className="label">Subject</span>
            <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {subjects.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Content</span>
            <textarea className="input" rows={8} required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the note content…" />
          </label>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">{busy ? "Saving…" : "Publish note"}</button>
        </div>
      </form>
      <div className="card h-fit p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Notes ({rows.length})</h2>
        {!notes ? <Spinner label="Loading…" /> : rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No notes yet.</p>
        ) : (
          <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {rows.map(([id, n]) => (
              <li key={id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{n.subject} · {new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => removeNote(id, n.title)} aria-label={`Delete ${n.title}`} className="rounded p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-950">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<Record<string, Report> | null>(null);

  useEffect(() => {
    const unsub = onValue(ref(db, "reports"), (snap) => setReports(snap.val() ?? {}));
    return unsub;
  }, []);

  const setStatus = async (id: string, status: Report["status"]) => {
    await update(ref(db, `reports/${id}`), { status });
  };

  const rows = reports ? Object.entries(reports).sort((a, b) => b[1].createdAt - a[1].createdAt) : [];
  const openCount = rows.filter(([, r]) => r.status === "open").length;

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
        Reports {openCount > 0 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-400">{openCount} open</span>}
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">User-submitted problem reports.</p>
      {!reports ? <Spinner label="Loading…" /> : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No reports yet.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map(([id, r]) => (
            <div key={id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.message}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {r.type} · {r.userEmail || r.userId.slice(0, 6)} · {r.quizId ?? "general"} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === "open" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400" : r.status === "resolved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {r.status}
                </span>
                {r.status === "open" && (
                  <button onClick={() => setStatus(id, "resolved")} aria-label="Mark resolved" className="rounded p-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950">
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DailyQuestionTab() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [current, setCurrent] = useState<DailyQuestion | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u1 = onValue(ref(db, "quizzes"), (s) => setQuizzes(Object.values(s.val() ?? {})));
    const u2 = onValue(ref(db, "dailyQuestion"), (s) => setCurrent(s.val() ?? null));
    return () => { u1(); u2(); };
  }, []);

  const setDaily = async () => {
    if (!selected) return;
    setBusy(true);
    await set(ref(db, "dailyQuestion"), { quizId: selected, date: new Date().toISOString().slice(0, 10), updatedAt: Date.now() });
    setBusy(false);
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Question of the Day</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Highlight a quiz on the homepage.</p>
      {current && (
        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          Current: <span className="font-semibold">{current.quizId}</span> · Set {current.date}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <select className="input flex-1" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select a quiz…</option>
          {quizzes?.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
        </select>
        <button onClick={setDaily} disabled={busy || !selected} className="btn-primary disabled:opacity-60">Set</button>
      </div>
    </div>
  );
}

function BroadcastTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("cooperweb:admin-api-key") ?? "");
  const [busy, setBusy] = useState(false);
  const { showToast, toast } = useToast();

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      if (apiKey.trim()) {
        const res = await fetch(`${API_URL}/api/broadcast`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey.trim() },
          body: JSON.stringify({
            title: title.trim(),
            message: body.trim(),
            link: url.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        localStorage.setItem("cooperweb:admin-api-key", apiKey.trim());
        showToast("Broadcast sent (in-app + push)");
      } else {
        await notifyAllUsers(db, {
          type: "announcement",
          title: title.trim(),
          message: body.trim(),
          link: url.trim() || undefined,
        });
        showToast("Broadcast sent to all users (in-app only)");
      }
      setTitle("");
      setBody("");
      setUrl("");
    } catch {
      showToast("Failed to send broadcast — check the API key");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card max-w-2xl p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Bulk message</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Sends an in-app notification (and web push) to every registered student via the API.
      </p>
      <form onSubmit={send} className="mt-4 space-y-3">
        <input
          className="input"
          placeholder="API key (from Render env, stored only on this device)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
        />
        <input
          className="input"
          placeholder="Title (e.g. New mock exams released)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="input min-h-24"
          placeholder="Message body…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <input
          className="input"
          placeholder="Link (optional, e.g. /quizzes)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" disabled={busy || !title.trim() || !body.trim()} className="btn-primary disabled:opacity-60">
          {busy ? "Sending…" : "Send to all users"}
        </button>
      </form>
      {toast}
    </div>
  );
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function ImportTab() {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast, toast } = useToast();

  const importFile = async (e: FormEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const text = await file.text();
      const isCsv = file.name.toLowerCase().endsWith(".csv");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const questions: Question[] = [];
      const subject = isCsv
        ? (lines[0]?.split(/[,;]/).find((c) => /^[A-Za-z ]+$/i.test(c.trim()) && c.trim().toLowerCase() !== "subject")?.trim() ?? "General")
        : "General";
      for (const line of lines) {
        const cells = isCsv ? parseCsvLine(line) : [];
        if (isCsv) {
          if (cells.length < 6) continue;
          const [q, a, b, c, d, correct, explanation = ""] = cells;
          const idx = String(correct).trim().toUpperCase();
          const correctIndex = idx === "A" ? 0 : idx === "B" ? 1 : idx === "C" ? 2 : idx === "D" ? 3 : -1;
          if (!q || correctIndex < 0) continue;
          questions.push({ id: `q-${questions.length}`, text: q, options: [a, b, c, d], correctIndex, explanation: explanation || undefined });
        } else {
          const parsed = JSON.parse(line);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            const opts = Array.isArray(item.options) ? item.options : [item.a, item.b, item.c, item.d].filter(Boolean);
            const correctIndex =
              typeof item.correctIndex === "number"
                ? item.correctIndex
                : typeof item.correct === "number"
                  ? item.correct
                  : String(item.correct ?? "").toUpperCase() === "A"
                    ? 0
                    : String(item.correct ?? "").toUpperCase() === "B"
                      ? 1
                      : String(item.correct ?? "").toUpperCase() === "C"
                        ? 2
                        : 3;
            if (!item.text && !item.question) continue;
            questions.push({
              id: `q-${questions.length}`,
              text: item.text ?? item.question,
              options: opts,
              correctIndex,
              explanation: item.explanation ?? undefined,
            });
          }
        }
      }
      if (questions.length === 0) {
        throw new Error("No valid questions found in the file");
      }
      const year = new Date().getFullYear();
      const id = slugify(`import-${subject}-${year}-${Date.now()}`);
      const quiz: Quiz = {
        id,
        title: `Imported ${subject} Quiz (${new Date().toLocaleDateString()})`,
        subject,
        year,
        durationMinutes: 30,
        questions,
      };
      await set(ref(db, `quizzes/${id}`), quiz);
      setMessage(`Imported ${questions.length} question${questions.length === 1 ? "" : "s"} as "${quiz.title}".`);
      showToast(`Imported ${questions.length} questions`);
    } catch (err) {
      setMessage(`Import failed: ${err instanceof Error ? err.message : "invalid file"}`);
      showToast("Import failed");
    } finally {
      setBusy(false);
      e.currentTarget.value = "";
    }
  };

  return (
    <div className="card max-w-2xl p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Import quiz questions</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Upload a CSV with columns <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">question, optionA, optionB, optionC, optionD, correct (A-D), explanation</code>{" "}
        or a JSON file with an array of questions <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{"{text, options[], correctIndex, explanation}"}</code>.
      </p>
      <label className="btn-primary mt-4 inline-flex cursor-pointer">
        <Upload className="h-4 w-4" /> {busy ? "Importing…" : "Choose .csv or .json file"}
        <input type="file" accept=".csv,.json,text/csv,application/json" className="hidden" onChange={importFile} disabled={busy} />
      </label>
      {message && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{message}</p>}
      {toast}
    </div>
  );
}

function JohnWebTab() {
  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">John Web</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Companion ECZ resource site. Link and payment plans shown below.
          </p>
        </div>
        <a href={JOHNWEB_INVITE_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
          <ExternalLink className="h-4 w-4" /> Open John Web
        </a>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payment plans</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Shown on the public John Web page — students choose a plan and pay to {PAYMENT_MERCHANT_NUMBER}.
        </p>
        <div className="mt-5">
          <PlansOverview />
        </div>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Site URL: {JOHNWEB_URL} · Merchant: +260 {PAYMENT_MERCHANT_NUMBER.slice(1, 3)} {PAYMENT_MERCHANT_NUMBER.slice(3, 6)} {PAYMENT_MERCHANT_NUMBER.slice(6)}
        </p>
      </div>
    </div>
  );
}

interface AdminListing {
  listingId: string;
  sellerUid: string;
  itemId: string;
  price: number;
  fee?: number;
  reason?: string;
  createdAt?: number;
  expiresAt?: number;
  status?: string;
  buyerUid?: string;
  confirmedAt?: number;
  cancelledAt?: number;
}

interface AdminTradeOffer {
  tradeId: string;
  fromUid: string;
  toUid: string;
  itemId: string;
  priceCC: number;
  reason?: string;
  status: string;
  createdAt?: number;
}

function TradingTab() {
  const { showToast, toast } = useToast();
  const apiKey = localStorage.getItem("cooperweb:admin-api-key") ?? "";
  const [data, setData] = useState<{ listings: AdminListing[]; offers: AdminTradeOffer[] } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!apiKey) return;
      try {
        const res = await fetch(`${API_URL}/api/trade/admin/listings`, {
          headers: { "x-api-key": apiKey },
        });
        const json = await res.json();
        if (!cancelled && res.ok) setData(json ?? { listings: [], offers: [] });
        else if (!cancelled) setMessage(json?.error ?? "Failed to load trades");
      } catch {
        /* transient */
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiKey]);

  useEffect(() => {
    const unsub = onValue(ref(db, "users"), (snapshot) => {
      const users = snapshot.val() ?? {};
      const names: Record<string, string> = {};
      for (const [uid, u] of Object.entries(users)) {
        names[uid] = (u as { displayName?: string }).displayName ?? uid.slice(0, 8);
      }
      setUserNames(names);
    });
    return unsub;
  }, []);

  const cancelListing = async (listingId: string) => {
    if (!apiKey) {
      setMessage("Set your API key in the Broadcast tab first.");
      return;
    }
    setBusyId(listingId);
    try {
      const res = await fetch(`${API_URL}/api/trade/admin/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ listingId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `API ${res.status}`);
      showToast("Listing cancelled, fee refunded.");
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const listings = data?.listings ?? [];
  const offers = data?.offers ?? [];

  return (
    <div className="space-y-6">
      {toast}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Marketplace listings</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Active, sold and cancelled listings. Cancelling refunds the listing fee to the seller.
        </p>
        {message && (
          <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-400">{message}</p>
        )}
        {!apiKey && (
          <p className="mt-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
            Enter your admin API key in the Broadcast tab to view and cancel trades.
          </p>
        )}
        {listings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No listings yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Seller</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => {
                  const expired = (l.expiresAt ?? 0) < Date.now() && l.status !== "confirmed";
                  return (
                    <tr key={l.listingId} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                        {marketItemById(l.itemId)?.name ?? l.itemId}
                        {l.reason && <span className="block text-xs text-slate-400">{l.reason}</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                        {userNames[l.sellerUid] ?? l.sellerUid.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 font-semibold text-amber-600 dark:text-amber-400">
                        {l.price} CC
                        {l.fee ? <span className="block text-xs text-slate-400">fee {l.fee}</span> : null}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            expired
                              ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              : l.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : l.status === "cancelled"
                              ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                          }`}
                        >
                          {expired ? "expired" : (l.status ?? "active")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                        {l.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!l.status || l.status === "active" ? (
                          <button
                            onClick={() => cancelListing(l.listingId)}
                            disabled={busyId === l.listingId}
                            className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-200 disabled:opacity-60 dark:bg-rose-950/50 dark:text-rose-400"
                          >
                            {busyId === l.listingId ? "…" : "Cancel"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Direct trade offers</h2>
        {offers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No trade offers yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Seller</th>
                  <th className="px-3 py-2">Buyer</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.tradeId} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                      {marketItemById(o.itemId)?.name ?? o.itemId}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {userNames[o.fromUid] ?? o.fromUid.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {userNames[o.toUid] ?? o.toUid.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2 font-semibold text-amber-600 dark:text-amber-400">{o.priceCC} CC</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          o.status === "accepted"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : o.status === "declined"
                            ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const CODE_TYPE_INFO: Record<RedeemCodeType, string> = {
  gift: "One code grants Teacher Full — sell scratch cards or WhatsApp codes.",
  promo: "Public code with many uses and an optional expiry — e.g. FREEDAY2026.",
  discount: "Gives users a % off Teacher Full when they pay by mobile money.",
  pack: "Unlocks specific premium quizzes for the redeemer.",
  market: "Unlocks the CooperCoins Market for the redeemer — entry ticket to the shop.",
  coins: "Adds CooperCoins to the redeemer's wallet — each use grants the CC value.",
};

function RedeemCodesTab() {
  const { user } = useAuth();
  const { quizzes } = useQuizzes();
  const [codes, setCodes] = useState<Record<string, RedeemCode> | null>(null);
  const [type, setType] = useState<RedeemCodeType>("gift");
  const planId: BuyablePlanId = "teacher_full";
  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [coinValue, setCoinValue] = useState(50);
  const [customCode, setCustomCode] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedQuizzes, setSelectedQuizzes] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { askConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "codes"), (snapshot) => {
      setCodes(snapshot.val() ?? {});
    });
    return unsubscribe;
  }, []);

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (type === "pack" && selectedQuizzes.size === 0) {
      setMessage("Select at least one quiz for a pack code.");
      return;
    }
    if (type === "discount" && (discountPercent < 1 || discountPercent > 90)) {
      setMessage("Discount must be between 1 and 90 percent.");
      return;
    }
    setBusy(true);
    const toCreate: RedeemCode[] = [];
    const expiresAt = expiryDate ? new Date(`${expiryDate}T23:59:59`).getTime() : undefined;
    const base: Omit<RedeemCode, "code" | "createdAt"> = {
      type,
      amount: type === "gift" ? 1 : Math.max(1, Number(amount)),
      usedCount: 0,
      ...(type !== "discount" && type !== "pack" && type !== "market" && type !== "coins" ? { planId } : {}),
      ...(type === "discount" ? { discountPercent: Number(discountPercent) } : {}),
      ...(type === "pack" ? { quizIds: Array.from(selectedQuizzes) } : {}),
      ...(type === "coins" ? { coinValue: Math.max(1, Number(coinValue)) } : {}),
      ...(expiresAt ? { expiresAt } : {}),
      createdBy: user?.uid ?? "admin",
    };
    try {
      if (type === "gift") {
        for (let i = 0; i < Math.max(1, Number(quantity)); i++) {
          toCreate.push({ ...base, code: generateCode(), createdAt: Date.now() });
        }
      } else {
        toCreate.push({ ...base, code: customCode.trim().toUpperCase() || generateCode(), createdAt: Date.now() });
      }
      for (const code of toCreate) {
        await set(ref(db, `codes/${code.code}`), code);
      }
      const codesList = toCreate.map((c) => c.code).join(", ");
      await navigator.clipboard.writeText(codesList);
      setMessage(`Created ${toCreate.length} code(s): ${codesList} — copied to clipboard.`);
      setCustomCode("");
      setSelectedQuizzes(new Set());
    } catch (err) {
      setMessage(err instanceof Error ? `Failed: ${err.message}` : "Failed to create codes.");
    }
    setBusy(false);
  };

  const removeCode = async (code: string) => {
    const confirmed = await askConfirm({
      title: "Delete code?",
      message: "Codes already redeemed keep their effect.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    await remove(ref(db, `codes/${code}`));
  };

  const entries = codes ? Object.values(codes).sort((a, b) => b.createdAt - a.createdAt) : [];

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create redeem codes</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Users redeem codes on the Payments and Dashboard pages.
        </p>
        {message && (
          <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm ${message.startsWith("Failed") || message.startsWith("Select") || message.startsWith("Discount") ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"}`}>
            {message}
          </p>
        )}
        <form onSubmit={generate} className="mt-4 space-y-4">
          <label className="block">
            <span className="label">Code type</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as RedeemCodeType)}>
              <option value="gift">Gift code — grants Teacher Full (1 use)</option>
              <option value="promo">Promo code — Teacher Full, many uses</option>
              <option value="discount">Discount code — % off Teacher Full</option>
              <option value="pack">Quiz pack code — unlocks premium quizzes</option>
              <option value="market">Market code — unlocks the CooperCoins Market</option>
              <option value="coins">Coins code — adds CooperCoins to the wallet</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">{CODE_TYPE_INFO[type]}</p>
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            {type === "gift" ? (
              <label className="block">
                <span className="label">Quantity</span>
                <input className="input" type="number" min={1} max={100} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="label">Max uses</span>
                  <input className="input" type="number" min={1} max={10000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="label">Custom code (optional — leave blank to generate)</span>
                  <input className="input uppercase" placeholder="e.g. FREEDAY2026" value={customCode} onChange={(e) => setCustomCode(e.target.value)} />
                </label>
              </>
            )}
            {type === "discount" && (
              <label className="block">
                <span className="label">Discount %</span>
                <input className="input" type="number" min={1} max={90} value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} />
              </label>
            )}
            {type === "coins" && (
              <label className="block">
                <span className="label">CC per redemption</span>
                <input className="input" type="number" min={1} max={100000} value={coinValue} onChange={(e) => setCoinValue(Number(e.target.value))} />
              </label>
            )}
            <label className="block">
              <span className="label">Expiry date (optional)</span>
              <input className="input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </label>
          </div>

          {type === "pack" && (
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quizzes to unlock</p>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {quizzes.filter((q) => q.premium).map((q) => (
                  <label key={q.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedQuizzes.has(q.id)}
                      onChange={(e) =>
                        setSelectedQuizzes((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(q.id);
                          else next.delete(q.id);
                          return next;
                        })
                      }
                      className="h-4 w-4 accent-emerald-600"
                    />
                    {q.title}
                  </label>
                ))}
              </div>
              {quizzes.filter((q) => q.premium).length === 0 && (
                <p className="mt-2 text-xs text-slate-400">
                  No premium quizzes yet — tick "Premium" when adding or editing a quiz.
                </p>
              )}
            </div>
          )}

          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            {busy ? "Creating…" : "Generate codes"}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active codes ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No codes yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {entries.map((c) => (
              <li key={c.code} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm dark:bg-slate-800/50">
                <div>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{c.code}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {c.type === "gift" ? "Gift" : c.type === "promo" ? "Promo" : c.type === "discount" ? `Discount ${c.discountPercent}%` : c.type === "market" ? "Market access" : c.type === "coins" ? `${c.coinValue ?? 0} CC each` : `Pack (${c.quizIds?.length ?? 0} quizzes)`} · used {c.usedCount}/{c.amount}
                    {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <button onClick={() => removeCode(c.code)} className="text-xs font-semibold text-red-500 hover:underline">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MarketTab() {
  const { showToast, toast } = useToast();
  const [users, setUsers] = useState<Record<string, AppUser> | null>(null);
  const [coinTarget, setCoinTarget] = useState("");
  const [coinAmount, setCoinAmount] = useState("");
  const [coinReason, setCoinReason] = useState("");
  const [coinBusy, setCoinBusy] = useState(false);

  const [salePercent, setSalePercent] = useState("");
  const [saleHours, setSaleHours] = useState("");
  const [saleBusy, setSaleBusy] = useState(false);

  const [limitedItem, setLimitedItem] = useState("");
  const [limitedHours, setLimitedHours] = useState("");
  const [limitedBusy, setLimitedBusy] = useState(false);
  const [limited, setLimited] = useState<Record<string, { expiresAt: number }> | null>(null);

  useEffect(() => {
    const unsub = onValue(ref(db, "users"), (snapshot) => setUsers(snapshot.val() ?? {}));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, "marketConfig/items"), (snapshot) => setLimited(snapshot.val() ?? {}));
    return unsub;
  }, []);

  const adjustCoins = async (e: FormEvent) => {
    e.preventDefault();
    if (!coinTarget) return;
    const apiKey = localStorage.getItem("cooperweb:admin-api-key") ?? "";
    if (!apiKey) {
      showToast("Set your API key in the Broadcast tab first.");
      return;
    }
    setCoinBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/coins`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ uid: coinTarget, amount: Number(coinAmount), reason: coinReason }),
      });
      const data = await res.json();
      if (!res.ok) showToast(data?.error ?? "Adjustment failed");
      else {
        showToast(`Adjusted by ${data.adjusted} CC — new balance ${data.balance}.`);
        setCoinAmount("");
        setCoinReason("");
      }
    } catch (err) {
      showToast(err instanceof Error ? `Adjustment failed: ${err.message}` : "Adjustment failed");
    } finally {
      setCoinBusy(false);
    }
  };

  const setFlashSale = async (e: FormEvent) => {
    e.preventDefault();
    const percent = Number(salePercent);
    const hours = Number(saleHours);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 90) {
      showToast("Sale percent must be between 1 and 90.");
      return;
    }
    setSaleBusy(true);
    try {
      if (hours > 0) {
        await set(ref(db, "marketConfig"), {
          salePercent: percent,
          saleUntil: Date.now() + hours * 3600000,
        });
        showToast(`Flash sale started: ${percent}% off for ${hours}h.`);
      } else {
        await set(ref(db, "marketConfig/salePercent"), null);
        await set(ref(db, "marketConfig/saleUntil"), null);
        showToast("Flash sale cleared.");
      }
      setSalePercent("");
      setSaleHours("");
    } catch (err) {
      showToast(err instanceof Error ? `Sale failed: ${err.message}` : "Sale failed");
    } finally {
      setSaleBusy(false);
    }
  };

  const makeLimited = async (e: FormEvent) => {
    e.preventDefault();
    if (!limitedItem || !limitedHours) return;
    const hours = Number(limitedHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      showToast("Enter a number of hours.");
      return;
    }
    setLimitedBusy(true);
    try {
      await set(ref(db, `marketConfig/items/${limitedItem}/expiresAt`), Date.now() + hours * 3600000);
      showToast(`${limitedItem} is now limited (${hours}h).`);
      setLimitedHours("");
    } catch (err) {
      showToast(err instanceof Error ? `Failed: ${err.message}` : "Failed");
    } finally {
      setLimitedBusy(false);
    }
  };

  const clearLimited = async (itemId: string) => {
    await remove(ref(db, `marketConfig/items/${itemId}`));
    showToast("Limited status removed.");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {toast}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Adjust CooperCoins</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Add or remove CC from any account (positive adds, negative removes).
        </p>
        <form onSubmit={adjustCoins} className="mt-4 space-y-3">
          <div>
            <label className="label">Student</label>
            {users === null ? (
              <Spinner label="Loading users…" />
            ) : (
              <select
                value={coinTarget}
                onChange={(e) => setCoinTarget(e.target.value)}
                className="input"
              >
                <option value="">Select a student…</option>
                {Object.entries(users)
                  .sort((a, b) => (a[1].displayName ?? "").localeCompare(b[1].displayName ?? ""))
                  .map(([uid, u]) => (
                    <option key={uid} value={uid}>
                      {u.displayName || u.email} — {u.coins ?? 0} CC
                    </option>
                  ))}
              </select>
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Amount (CC)</label>
              <input
                type="number"
                value={coinAmount}
                onChange={(e) => setCoinAmount(e.target.value)}
                placeholder="e.g. 50 or -20"
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="label">Reason (optional)</label>
              <input
                value={coinReason}
                onChange={(e) => setCoinReason(e.target.value)}
                placeholder="e.g. weekly prize"
                className="input"
              />
            </div>
          </div>
          <button type="submit" disabled={coinBusy || !coinTarget} className="btn-primary disabled:opacity-60">
            {coinBusy ? "Adjusting…" : "Adjust coins"}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Flash sale</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Put the whole Market on sale for a limited time.
        </p>
        <form onSubmit={setFlashSale} className="mt-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Percent off</label>
              <input
                type="number"
                min={1}
                max={90}
                value={salePercent}
                onChange={(e) => setSalePercent(e.target.value)}
                placeholder="e.g. 25"
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="label">Duration (hours, 0 = clear)</label>
              <input
                type="number"
                min={0}
                value={saleHours}
                onChange={(e) => setSaleHours(e.target.value)}
                placeholder="e.g. 24"
                className="input"
              />
            </div>
          </div>
          <button type="submit" disabled={saleBusy} className="btn-primary disabled:opacity-60">
            {saleBusy ? "Saving…" : saleHours && Number(saleHours) > 0 ? "Start flash sale" : "Clear flash sale"}
          </button>
        </form>
      </div>

      <div className="card p-6 lg:col-span-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Limited items</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Make an item limited-time: it shows a countdown and disappears when it expires.
        </p>
        <form onSubmit={makeLimited} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="label">Item</label>
            <select value={limitedItem} onChange={(e) => setLimitedItem(e.target.value)} className="input">
              <option value="">Select an item…</option>
              {MARKET_ITEMS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.id})
                </option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="label">Duration (hours)</label>
            <input
              type="number"
              min={1}
              value={limitedHours}
              onChange={(e) => setLimitedHours(e.target.value)}
              placeholder="e.g. 72"
              className="input"
            />
          </div>
          <button type="submit" disabled={limitedBusy || !limitedItem} className="btn-primary disabled:opacity-60">
            {limitedBusy ? "Saving…" : "Make limited"}
          </button>
        </form>
        {limited && Object.keys(limited).length > 0 && (
          <ul className="mt-4 space-y-2">
            {Object.entries(limited).map(([itemId, info]) => (
              <li key={itemId} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm dark:bg-slate-800/50">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {marketItemById(itemId)?.name ?? itemId}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Expires {new Date(info.expiresAt).toLocaleString()}
                    {info.expiresAt < Date.now() ? " — already expired" : ""}
                  </p>
                </div>
                <button onClick={() => clearLimited(itemId)} className="text-xs font-semibold text-red-500 hover:underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
