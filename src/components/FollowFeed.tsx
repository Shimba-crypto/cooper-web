import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useQuizzes } from "../hooks/useQuizzes";
import { getProfiles } from "../data/fetchProfiles";
import Avatar from "./Avatar";
import type { QuizResult } from "../types";

interface FeedItem {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  quizId: string;
  result: QuizResult;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function FollowFeed() {
  const { user } = useAuth();
  const { quizzes } = useQuizzes();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setReady(true);
      return;
    }
    let innerUnsubs: Array<() => void> = [];
    const unsubscribe = onValue(ref(db, `following/${user.uid}`), (snapshot) => {
      innerUnsubs.forEach((u) => u());
      innerUnsubs = [];
      const following = snapshot.val() as Record<string, unknown> | null;
      if (!following) {
        setItems([]);
        setReady(true);
        return;
      }
      const uids = Object.keys(following);
      innerUnsubs = uids.map((uid) =>
        onValue(ref(db, `results/${uid}`), (resSnapshot) => {
          const results = resSnapshot.val() as Record<string, QuizResult> | null;
          if (!results) {
            setItems((prev) => prev.filter((i) => i.uid !== uid));
            return;
          }
          const latest = Object.entries(results)
            .map(([quizId, result]) => ({ quizId, result }))
            .sort((a, b) => b.result.completedAt - a.result.completedAt)
            .slice(0, 2);
          setItems((prev) => [
            ...prev.filter((i) => i.uid !== uid),
            ...latest.map(({ quizId, result }) => ({
              uid,
              displayName: "",
              quizId,
              result,
            })),
          ]);
        })
      );
      getProfiles(uids).then((profiles) => {
        const map = Object.fromEntries(profiles.map((p) => [p.uid, p]));
        setItems((prev) =>
          prev.map((i) => ({
            ...i,
            displayName: map[i.uid]?.displayName ?? i.uid.slice(0, 6),
            avatarUrl: map[i.uid]?.avatarUrl,
          }))
        );
      });
    });
    return () => {
      unsubscribe();
      innerUnsubs.forEach((u) => u());
    };
  }, [user]);

  useEffect(() => {
    if (!quizzes.length || !items.length) return;
    setItems((prev) =>
      prev.map((i) => {
        const quiz = quizzes.find((q) => q.id === i.quizId);
        return quiz ? { ...i } : i;
      })
    );
  }, [quizzes, items.length]);

  if (!user || !ready) return null;
  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => b.result.completedAt - a.result.completedAt).slice(0, 10);
  const quizTitle = (quizId: string) =>
    quizzes.find((q) => q.id === quizId)?.title ?? quizId.replace(/-/g, " ");

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6 flex items-center gap-2">
        <Users className="h-5 w-5 text-emerald-600" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          From people you follow
        </h2>
      </div>
      <ul className="card divide-y divide-slate-200 dark:divide-slate-800">
        {sorted.map((item) => (
          <li key={`${item.uid}-${item.quizId}`} className="flex items-center gap-3 px-4 py-3">
            <Link to={`/profile/${item.uid}`} className="shrink-0" title="View profile">
              <Avatar src={item.avatarUrl} name={item.displayName} size={36} />
            </Link>
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate text-slate-700 dark:text-slate-200">
                <Link to={`/profile/${item.uid}`} className="font-semibold hover:text-emerald-600">
                  {item.displayName}
                </Link>{" "}
                scored{" "}
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {item.result.score}/{item.result.total}
                </span>{" "}
                on{" "}
                <Link to={`/quiz/${item.quizId}`} className="font-medium text-slate-600 hover:text-emerald-600 dark:text-slate-300">
                  {quizTitle(item.quizId)}
                </Link>
              </p>
            </div>
            <span className="shrink-0 text-xs text-slate-400">
              {timeAgo(item.result.completedAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
