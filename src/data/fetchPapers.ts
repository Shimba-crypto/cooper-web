import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import type { Paper } from "../types";

export function subscribePapers(
  onData: (papers: Paper[]) => void,
  onError: (error: Error) => void
): () => void {
  return onValue(
    ref(db, "papers"),
    (snapshot) => {
      const value = snapshot.val();
      if (!value) {
        onData([]);
        return;
      }
      const list: Paper[] = Object.entries(value).map(([id, data]) => ({
        id,
        grade: 7,
        ...(data as Omit<Paper, "id" | "grade">),
      }));
      onData(list.sort((a, b) => b.year - a.year || a.subject.localeCompare(b.subject)));
    },
    (error) => onError(error instanceof Error ? error : new Error(String(error)))
  );
}
