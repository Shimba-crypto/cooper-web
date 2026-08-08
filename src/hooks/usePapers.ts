import { useEffect, useState } from "react";
import { fetchJohnWebPapers } from "../data/johnwebApi";
import { subscribePapers } from "../data/fetchPapers";
import type { Paper } from "../types";

export function usePapers() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let unsubscribeRtdb: (() => void) | undefined;
    setLoading(true);
    setError(null);

    fetchJohnWebPapers()
      .then((data) => {
        if (cancelled) return;
        setPapers(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        unsubscribeRtdb = subscribePapers(
          (data) => {
            if (cancelled) return;
            setPapers(data);
            setLoading(false);
          },
          (rtdbErr) => {
            if (cancelled) return;
            setError(rtdbErr.message || "Failed to load papers.");
            setLoading(false);
          }
        );
      });

    return () => {
      cancelled = true;
      unsubscribeRtdb?.();
    };
  }, [attempt]);

  return { papers, loading, error, retry: () => setAttempt((a) => a + 1) };
}
