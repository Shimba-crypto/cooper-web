import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import type { Quiz } from "../types";

export function subscribeQuizzes(
  onData: (quizzes: Quiz[]) => void,
  onError: (error: Error) => void
): () => void {
  return onValue(
    ref(db, "quizzes"),
    (snapshot) => {
      const value = snapshot.val();
      if (!value) {
        onData([]);
        return;
      }
      const list: Quiz[] = Object.entries(value).map(([id, data]) => ({
        id,
        ...(data as Omit<Quiz, "id">),
      }));
      onData(list.sort((a, b) => b.year - a.year || a.subject.localeCompare(b.subject)));
    },
    (error) => onError(error instanceof Error ? error : new Error(String(error)))
  );
}
