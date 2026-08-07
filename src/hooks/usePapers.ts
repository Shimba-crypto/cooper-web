import { useEffect, useState } from "react";
import { subscribePapers } from "../data/fetchPapers";
import type { Paper } from "../types";

export function usePapers() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribePapers(
      (data) => {
        setPapers(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Failed to load papers.");
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [attempt]);

  return { papers, loading, error, retry: () => setAttempt((a) => a + 1) };
}
