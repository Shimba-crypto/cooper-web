import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import Spinner from "../components/Spinner";
import ReadAloudButton from "../components/ReadAloudButton";
import type { Note } from "../types";

export default function NoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onValue(ref(db, `notes/${id}`), (snap) => {
      if (snap.exists()) {
        setNote(snap.val());
      } else {
        setNotFound(true);
      }
    });
    return unsub;
  }, [id]);

  if (!note && !notFound) return <Spinner label="Loading note…" />;

  if (notFound || !note) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Note not found</h1>
        <Link to="/notes" className="btn-primary mt-6">Back to notes</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/notes" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
        <ArrowLeft className="h-4 w-4" /> All notes
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
          {note.subject}
        </span>
        <ReadAloudButton text={`${note.title}. ${note.content}`} />
      </div>
      <h1 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">{note.title}</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
        <BookOpen className="h-4 w-4" />
        Published {new Date(note.createdAt).toLocaleDateString()}
      </p>
      <div className="prose prose-slate mt-8 max-w-none dark:prose-invert">
        {note.content.split("\n").map((line, i) => (
          <p key={i} className="whitespace-pre-wrap text-base leading-relaxed text-slate-700 dark:text-slate-300">
            {line || "\u00A0"}
          </p>
        ))}
      </div>
    </div>
  );
}
