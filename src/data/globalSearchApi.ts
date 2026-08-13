import { API_URL } from "../config";

export interface GlobalPeopleResult {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  planId?: string;
  role?: string;
}

export interface GlobalJohnWebResult {
  papers: Array<{ id: string; title: string; grade: string | number; year: number }>;
  questions: Array<{ id: string; questionNumber: number; text: string; paperId: string; paperTitle?: string }>;
}

export interface GlobalSearchResult {
  query: string;
  papers: Array<{ id: string; title: string; subject: string; year: number }>;
  quizzes: Array<{ id: string; title: string; subject: string }>;
  notes: Array<{ id: string; title: string; subject: string }>;
  people: GlobalPeopleResult[];
  johnweb: GlobalJohnWebResult | null;
}

export async function globalSearch(q: string): Promise<GlobalSearchResult | null> {
  if (q.trim().length < 2) return null;
  try {
    const res = await fetch(`${API_URL}/api/globalsearch?q=${encodeURIComponent(q.trim())}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
