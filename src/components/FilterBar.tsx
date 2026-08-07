import { Heart, Search, X } from "lucide-react";
import type { PaperFilters } from "../utils/filters";

interface Props {
  filters: PaperFilters;
  onChange: (filters: PaperFilters) => void;
  subjects: string[];
  years: number[];
  paperTypes: string[];
  favoritesOnly: boolean;
  onToggleFavorites: () => void;
  hasFilters: boolean;
  onClear: () => void;
}

export default function FilterBar({
  filters,
  onChange,
  subjects,
  years,
  paperTypes,
  favoritesOnly,
  onToggleFavorites,
  hasFilters,
  onClear,
}: Props) {
  const update = (patch: Partial<PaperFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative">
          <span className="sr-only">Search papers</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search title, subject, description…"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            className="input !pl-9"
            aria-label="Search papers"
          />
        </label>
        <label>
          <span className="sr-only">Filter by subject</span>
          <select
            value={filters.subject}
            onChange={(e) => update({ subject: e.target.value })}
            className="input"
            aria-label="Filter by subject"
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by year</span>
          <select
            value={filters.year}
            onChange={(e) => update({ year: e.target.value })}
            className="input"
            aria-label="Filter by year"
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by paper type</span>
          <select
            value={filters.paperType}
            onChange={(e) => update({ paperType: e.target.value })}
            className="input"
            aria-label="Filter by paper type"
          >
            <option value="">All paper types</option>
            {paperTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={onToggleFavorites}
          aria-pressed={favoritesOnly}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            favoritesOnly
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Heart className={`h-4 w-4 ${favoritesOnly ? "fill-white" : ""}`} />
          Favorites only
        </button>
        {hasFilters && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <X className="h-4 w-4" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
