import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, FileText, Search } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import Spinner from "../components/Spinner";
import type { Note } from "../types";

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

export default function NotesListPage() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");

  useEffect(() => {
    const unsub = onValue(ref(db, "notes"), (snap) => {
      const val = snap.val() as Record<string, Note> | null;
      const list = val ? Object.values(val).sort((a, b) => b.createdAt - a.createdAt) : [];
      setNotes(list);
    });
    return unsub;
  }, []);

  const filtered = (notes ?? []).filter((n) => {
    const matchSubject = subject === "All" || n.subject === subject;
    const matchSearch =
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.subject.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  const subjects = Array.from(new Set((notes ?? []).map((n) => n.subject)));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white">Study Notes</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">
        Subject summaries and revision notes for ECZ Grade 7.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-56" value={subject} onChange={(e) => setSubject(e.target.value)}>
          {(subjects.length > 0 ? ["All", ...subjects] : SUBJECTS).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {!notes ? (
        <Spinner label="Loading notes…" />
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-xl border-2 border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
          <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No notes yet. Check back soon.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <Link
              key={note.id}
              to={`/notes/${note.id}`}
              className="group card flex flex-col p-5 transition hover:border-emerald-300 hover:shadow-md dark:hover:border-emerald-800"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                  {note.subject}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                {note.title}
              </h2>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600 dark:text-slate-400">
                {note.content}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <BookOpen className="h-3.5 w-3.5" />
                {new Date(note.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
