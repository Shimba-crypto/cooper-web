import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, FileQuestion, FileText, Search } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import Spinner from "../components/Spinner";
import type { Note, Paper, Quiz } from "../types";

interface Result {
  id: string;
  title: string;
  subject: string;
  type: "paper" | "quiz" | "note";
  link: string;
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);

  useEffect(() => {
    const u1 = onValue(ref(db, "papers"), (s) => setPapers(Object.values(s.val() ?? {})));
    const u2 = onValue(ref(db, "quizzes"), (s) => setQuizzes(Object.values(s.val() ?? {})));
    const u3 = onValue(ref(db, "notes"), (s) => setNotes(Object.values(s.val() ?? {})));
    return () => { u1(); u2(); u3(); };
  }, []);

  const setQuery = (q: string) => {
    const p = new URLSearchParams(params);
    if (q) p.set("q", q); else p.delete("q");
    setParams(p);
  };

  const loading = papers === null || quizzes === null || notes === null;

  const results: Result[] = [];
  const q = query.toLowerCase().trim();

  if (q && !loading) {
    (papers ?? []).forEach((p) => {
      if (p.title.toLowerCase().includes(q) || p.subject.toLowerCase().includes(q)) {
        results.push({ id: p.id, title: p.title, subject: p.subject, type: "paper", link: `/paper/${p.id}` });
      }
    });
    (quizzes ?? []).forEach((quiz) => {
      if (quiz.title.toLowerCase().includes(q) || quiz.subject.toLowerCase().includes(q)) {
        results.push({ id: quiz.id, title: quiz.title, subject: quiz.subject, type: "quiz", link: `/quiz/${quiz.id}` });
      }
    });
    (notes ?? []).forEach((n) => {
      if (n.title.toLowerCase().includes(q) || n.subject.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) {
        results.push({ id: n.id, title: n.title, subject: n.subject, type: "note", link: `/notes/${n.id}` });
      }
    });
  }

  const icon = (type: Result["type"]) => {
    if (type === "paper") return <BookOpen className="h-4 w-4" />;
    if (type === "quiz") return <FileQuestion className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const typeLabel = (type: Result["type"]) => {
    if (type === "paper") return "Paper";
    if (type === "quiz") return "Quiz";
    return "Note";
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Search</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">Find papers, quizzes, and notes.</p>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          autoFocus
          placeholder="Search by title, subject…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <Spinner label="Loading…" />
      ) : q ? (
        results.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No results for "<span className="font-semibold">{query}</span>".
          </p>
        ) : (
          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
            {results.map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                to={r.link}
                className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 transition hover:bg-emerald-50 dark:bg-slate-800/50 dark:hover:bg-emerald-950/30"
              >
                <div className="rounded-lg bg-white p-2 text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
                  {icon(r.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-200">{r.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.subject}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {typeLabel(r.type)}
                </span>
              </Link>
            ))}
          </div>
        )
      ) : (
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Type something to search.
        </p>
      )}
    </div>
  );
}
