import type { Paper } from "../types";

export interface PaperFilters {
  query: string;
  subject: string;
  year: string;
  paperType: string;
}

export const emptyFilters: PaperFilters = {
  query: "",
  subject: "",
  year: "",
  paperType: "",
};

export function filterPapers(
  papers: Paper[],
  filters: PaperFilters,
  favoritesOnly: boolean,
  bookmarks: string[]
): Paper[] {
  const q = filters.query.trim().toLowerCase();
  return papers.filter((p) => {
    if (favoritesOnly && !bookmarks.includes(p.id)) return false;
    if (q && !`${p.title} ${p.subject} ${p.description}`.toLowerCase().includes(q)) return false;
    if (filters.subject && p.subject !== filters.subject) return false;
    if (filters.year && p.year !== Number(filters.year)) return false;
    if (filters.paperType && p.paperType !== filters.paperType) return false;
    return true;
  });
}

export function uniqueSubjects(papers: Paper[]): string[] {
  return [...new Set(papers.map((p) => p.subject))].sort();
}

export function uniqueYears(papers: Paper[]): number[] {
  return [...new Set(papers.map((p) => p.year))].sort((a, b) => b - a);
}

export function uniquePaperTypes(papers: Paper[]): string[] {
  return [...new Set(papers.map((p) => p.paperType))].sort();
}

export function ratingSummary(paper: Paper, userRating?: number) {
  const baseCount = paper.baseRatingCount ?? 0;
  const baseSum = (paper.baseRating ?? 0) * baseCount;
  const count = baseCount + (userRating ? 1 : 0);
  const sum = baseSum + (userRating ?? 0);
  return { average: count > 0 ? sum / count : 0, count };
}
