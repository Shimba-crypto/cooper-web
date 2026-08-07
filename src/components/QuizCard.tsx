import { Link } from "react-router-dom";
import { Clock, ListChecks } from "lucide-react";
import type { Quiz } from "../types";

export default function QuizCard({ quiz }: { quiz: Quiz }) {
  return (
    <Link
      to={`/quiz/${quiz.id}`}
      className="card flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md animate-fade-in"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
          {quiz.subject} · {quiz.year}
        </span>
      </div>
      <h3 className="font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-400">
        {quiz.title}
      </h3>
      <div className="mt-3 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <ListChecks className="h-4 w-4" /> {quiz.questions.length} questions
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> {quiz.durationMinutes} min
        </span>
      </div>
    </Link>
  );
}
