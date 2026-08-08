import type { Paper, PaperType } from "../types";

export const JOHNWEB_BASE = "https://johnweb-qncu.onrender.com";

export interface JohnWebSubject {
  id: string;
  name: string;
  papers: JohnWebPaperSummary[];
}

export interface JohnWebPaperSummary {
  id: string;
  title: string;
  grade: string | number;
  year: number;
  questionsCount?: number;
}

export interface JohnWebQuestion {
  id: string;
  questionNumber: number;
  text: string;
  marks: number;
  options: string[];
  modelAnswer?: string;
}

export interface JohnWebPaperDetail {
  id: string;
  subjectId: string;
  title: string;
  year: number;
  grade: string | number;
  examType?: string;
  description?: string;
  questions: JohnWebQuestion[];
}

export interface JohnWebSearchResult {
  papers: JohnWebPaperSummary[];
  questions: Array<JohnWebQuestion & { paperId: string; paperTitle: string }>;
}

const CACHE_TTL = 15 * 60 * 1000;

interface CacheEntry<T> {
  at: number;
  data: T;
}

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.at > CACHE_TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function cacheSet<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data } satisfies CacheEntry<T>));
  } catch {
    // storage full or unavailable — ignore
  }
}

async function getJson<T>(path: string, cacheKey: string, staleWhileRevalidate = true): Promise<T> {
  const cached = cacheGet<T>(cacheKey);
  if (cached != null) return cached;
  const res = await fetch(`${JOHNWEB_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`John Web API ${res.status} for ${path}`);
  }
  const data = (await res.json()) as T;
  cacheSet(cacheKey, data);
  if (cached == null && staleWhileRevalidate) {
    // no-op: keeps signature simple
  }
  return data;
}

/** Full live paper library (all subjects merged), cached for 15 minutes. */
export async function fetchJohnWebPapers(): Promise<Paper[]> {
  const subjects = await getJson<JohnWebSubject[]>("/api/public/subjects", "cooperweb:jw:subjects");
  return subjects.flatMap((subject) =>
    subject.papers.map((p) => toPaper(p, subject.name))
  );
}

/** One paper with its questions, cached for 15 minutes. */
export async function fetchJohnWebPaper(id: string): Promise<JohnWebPaperDetail | null> {
  try {
    return await getJson<JohnWebPaperDetail>(
      `/api/public/papers/${id}`,
      `cooperweb:jw:paper:${id}`
    );
  } catch {
    return null;
  }
}

/** Full-text search across John Web papers and questions, cached for 15 minutes. */
export async function searchJohnWeb(q: string): Promise<JohnWebSearchResult | null> {
  if (q.trim().length < 2) return null;
  try {
    return await getJson<JohnWebSearchResult>(
      `/api/public/search?q=${encodeURIComponent(q.trim())}`,
      `cooperweb:jw:search:${q.trim().toLowerCase()}`
    );
  } catch {
    return null;
  }
}

function toPaper(p: JohnWebPaperSummary, subjectName: string): Paper {
  const lower = p.title.toLowerCase();
  let paperType: PaperType = "Paper 1";
  if (lower.includes("practical")) paperType = "Practical";
  else if (lower.includes("p2") || lower.includes("paper 2")) paperType = "Paper 2";
  return {
    id: p.id,
    title: p.title,
    subject: subjectName,
    grade: Number(p.grade) || 7,
    year: p.year,
    paperType,
    pdfUrl: "",
    description: `ECZ Grade ${p.grade} ${subjectName} ${p.year} — live from the John Web library.`,
  };
}
