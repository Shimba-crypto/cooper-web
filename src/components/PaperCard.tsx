import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import type { Paper } from "../types";
import { ratingSummary } from "../utils/filters";

interface Props {
  paper: Paper;
  bookmarked: boolean;
  userRating?: number;
  onToggleBookmark: (id: string) => void;
}

export default function PaperCard({ paper, bookmarked, userRating, onToggleBookmark }: Props) {
  const rating = ratingSummary(paper, userRating);

  return (
    <div className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md animate-fade-in">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
          Grade {paper.grade} · {paper.paperType}
        </span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{paper.year}</span>
      </div>

      <Link to={`/paper/${paper.id}`} className="flex-1">
        <h3 className="font-semibold text-slate-900 transition group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
          {paper.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
          {paper.description}
        </p>
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
          <Star className={`h-4 w-4 ${rating.count > 0 ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}`} />
          {rating.count > 0 ? `${rating.average.toFixed(1)} (${rating.count})` : "Not rated"}
        </span>
        <button
          onClick={() => onToggleBookmark(paper.id)}
          aria-label={bookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
          aria-pressed={bookmarked}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
        >
          <Heart className={`h-5 w-5 ${bookmarked ? "fill-emerald-600 text-emerald-600" : ""}`} />
        </button>
      </div>
    </div>
  );
}
