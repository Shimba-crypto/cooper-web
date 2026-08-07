import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Users } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import Avatar from "../components/Avatar";
import { getProfiles } from "../data/fetchProfiles";
import { NAME_COLORS, STATUS_EMOJIS } from "../data/market";
import { API_URL } from "../config";
import type { LeaderboardEntry, Profile } from "../types";

interface Cosmetics {
  uid: string;
  nameColor?: string;
  statusEmoji?: string;
  lbGlow?: boolean;
  avatarFrame?: string;
  avatarOverlay?: string;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Record<string, LeaderboardEntry> | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [cosmetics, setCosmetics] = useState<Record<string, Cosmetics>>({});
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [friendUids, setFriendUids] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "leaderboard"), (snapshot) => {
      setEntries(snapshot.val() ?? {});
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!entries) return;
    let cancelled = false;
    getProfiles(Object.keys(entries)).then((list) => {
      if (!cancelled) {
        setProfiles(Object.fromEntries(list.map((p) => [p.uid, p])));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [entries]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/people`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCosmetics(
          Object.fromEntries(
            ((data?.people ?? []) as Cosmetics[]).map((p) => [p.uid, p])
          )
        );
      })
      .catch(() => {
        if (!cancelled) setCosmetics({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setFriendUids([]);
      return;
    }
    const unsubscribe = onValue(ref(db, `following/${user.uid}`), (snapshot) => {
      setFriendUids(snapshot.val() ? Object.keys(snapshot.val()) : []);
    });
    return unsubscribe;
  }, [user]);

  if (loading) return <Spinner label="Loading leaderboard…" />;

  const ranked = Object.entries(entries ?? {})
    .map(([uid, entry]) => ({ uid, ...entry }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 20);

  const visible = friendsOnly
    ? ranked.filter((e) => e.uid === user?.uid || friendUids.includes(e.uid))
    : ranked;

  const medal = (index: number) =>
    index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-amber-500" />
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Leaderboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Top students by total quiz score.
          </p>
        </div>
        {user && (
          <button
            onClick={() => setFriendsOnly((f) => !f)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
              friendsOnly
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            <Users className="h-4 w-4" /> Friends only
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card mt-8 p-12 text-center text-slate-500 dark:text-slate-400">
          {friendsOnly ? (
            <>
              You're not following anyone with a score yet —{" "}
              <Link to="/people" className="font-semibold text-emerald-600 hover:underline">
                follow some classmates
              </Link>
              .
            </>
          ) : (
            <>
              No scores yet.{" "}
              <Link to="/quizzes" className="font-semibold text-emerald-600 hover:underline">
                Take a quiz
              </Link>{" "}
              to be the first on the board!
            </>
          )}
        </div>
      ) : (
        <ol className="card mt-8 divide-y divide-slate-200 dark:divide-slate-800">
          {visible.map((entry, index) => {
            const isMe = user && entry.uid === user.uid;
            const cos = cosmetics[entry.uid];
            const nameStyle = cos?.nameColor ? { color: NAME_COLORS[cos.nameColor] } : undefined;
            const statusEmoji = cos?.statusEmoji ? STATUS_EMOJIS[cos.statusEmoji] ?? "" : "";
            return (
              <li
                key={entry.uid}
                className={`flex items-center gap-4 px-5 py-4 ${
                  isMe ? "bg-emerald-50 dark:bg-emerald-950/50" : ""
                }`}
              >
                <span className="w-8 text-center text-xl">{medal(index)}</span>
                <Link
                  to={`/profile/${entry.uid}`}
                  className="shrink-0 rounded-full transition hover:opacity-80"
                  title="View profile"
                >
                  <Avatar
                    src={profiles[entry.uid]?.avatarUrl}
                    name={entry.displayName}
                    size={40}
                    frame={cos?.avatarFrame}
                    overlay={cos?.avatarOverlay}
                  />
                </Link>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    <Link
                      to={`/profile/${entry.uid}`}
                      className="transition hover:text-emerald-600"
                      style={nameStyle}
                    >
                      {entry.displayName}
                    </Link>
                    {statusEmoji && <span className="ml-1">{statusEmoji}</span>}
                    {cos?.lbGlow && <span className="ml-1" title="Leaderboard glow">✨</span>}
                    {isMe && (
                      <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {entry.quizzesTaken} {entry.quizzesTaken === 1 ? "quiz" : "quizzes"} taken
                  </p>
                </div>
                <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                  {entry.totalScore}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
