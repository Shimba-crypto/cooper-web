import { Link } from "react-router-dom";
import type { Paper } from "../types";

export default function SuggestedPapers({ current, papers }: { current: Paper; papers: Paper[] }) {
  const suggestions = papers
    .filter((p) => p.id !== current.id)
    .sort((a, b) => {
      const sameSubjectA = a.subject === current.subject ? 1 : 0;
      const sameSubjectB = b.subject === current.subject ? 1 : 0;
      if (sameSubjectA !== sameSubjectB) return sameSubjectB - sameSubjectA;
      return b.year - a.year;
    })
    .slice(0, 4);

  if (suggestions.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        You might also like…
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {suggestions.map((p) => (
          <Link
            key={p.id}
            to={`/paper/${p.id}`}
            className="card p-4 transition hover:shadow-md"
          >
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
              {p.subject}
            </span>
            <h3 className="mt-2 line-clamp-2 font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-400">
              {p.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {p.year} · {p.paperType}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
