import { useEffect, useState } from "react";
import { subscribeQuizzes } from "../data/fetchQuizzes";
import type { Quiz } from "../types";

export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeQuizzes(
      (data) => {
        setQuizzes(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Failed to load quizzes.");
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [attempt]);

  return { quizzes, loading, error, retry: () => setAttempt((a) => a + 1) };
}
