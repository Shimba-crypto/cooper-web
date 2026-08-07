import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePapers } from "../hooks/usePapers";
import { useLocalStorage } from "../hooks/useLocalStorage";
import FilterBar from "../components/FilterBar";
import PaperCard from "../components/PaperCard";
import Spinner from "../components/Spinner";
import {
  emptyFilters,
  filterPapers,
  uniquePaperTypes,
  uniqueSubjects,
  uniqueYears,
  type PaperFilters,
} from "../utils/filters";

export default function PapersListPage() {
  const { papers, loading, error, retry } = usePapers();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookmarks, setBookmarks] = useLocalStorage<string[]>("cooperweb:bookmarks", []);
  const [ratings] = useLocalStorage<Record<string, number>>("cooperweb:ratings", {});
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [filters, setFilters] = useState<PaperFilters>(() => ({
    query: searchParams.get("q") ?? "",
    subject: searchParams.get("subject") ?? "",
    year: searchParams.get("year") ?? "",
    paperType: searchParams.get("paperType") ?? "",
  }));

  const toggleBookmark = (id: string) =>
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );

  const updateFilters = (next: PaperFilters) => {
    setFilters(next);
    const params = new URLSearchParams();
    if (next.query) params.set("q", next.query);
    if (next.subject) params.set("subject", next.subject);
    if (next.year) params.set("year", next.year);
    if (next.paperType) params.set("paperType", next.paperType);
    setSearchParams(params, { replace: true });
  };

  const filtered = useMemo(
    () => filterPapers(papers, filters, favoritesOnly, bookmarks),
    [papers, filters, favoritesOnly, bookmarks]
  );

  const hasFilters = JSON.stringify(filters) !== JSON.stringify(emptyFilters) || favoritesOnly;

  const clearAll = () => {
    setFilters(emptyFilters);
    setFavoritesOnly(false);
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Past Papers</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          ECZ Grade 7 papers — search by subject, year or paper type.
        </p>
      </div>

      {error ? (
        <div className="card p-8 text-center">
          <p className="font-semibold text-red-600 dark:text-red-400">
            Failed to load papers: {error}
          </p>
          <button onClick={retry} className="btn-secondary mt-4">Retry</button>
        </div>
      ) : loading ? (
        <Spinner label="Loading papers…" />
      ) : (
        <>
          <FilterBar
            filters={filters}
            onChange={updateFilters}
            subjects={uniqueSubjects(papers)}
            years={uniqueYears(papers)}
            paperTypes={uniquePaperTypes(papers)}
            favoritesOnly={favoritesOnly}
            onToggleFavorites={() => setFavoritesOnly((f) => !f)}
            hasFilters={hasFilters}
            onClear={clearAll}
          />

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {filtered.length}
              </span>{" "}
              {filtered.length === 1 ? "paper" : "papers"}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="card mt-6 p-12 text-center">
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                No papers found
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Try adjusting your search or clearing the filters.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  bookmarked={bookmarks.includes(paper.id)}
                  userRating={ratings[paper.id]}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
