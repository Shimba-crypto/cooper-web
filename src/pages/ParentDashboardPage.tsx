import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onValue, ref, remove, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import type { ParentLink, QuizResult } from "../types";

interface ChildProgress {
  uid: string;
  name: string;
  results: Record<string, Record<string, QuizResult>>;
  totalAttempts: number;
  avgScore: number;
}

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<ParentLink[]>([]);
  const [children, setChildren] = useState<ChildProgress[]>([]);
  const [adding, setAdding] = useState(false);
  const [childUid, setChildUid] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `parentLinks/${user.uid}`), (snap) => {
      const val = snap.val() ?? {};
      setLinks(Object.values(val));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user || links.length === 0) {
      setChildren([]);
      return;
    }
    const unsubs: (() => void)[] = [];
    const progressMap: Record<string, ChildProgress> = {};
    links.forEach((link) => {
      const unsub = onValue(ref(db, `results/${link.childUid}`), (snap) => {
        const results = (snap.val() ?? {}) as Record<string, Record<string, QuizResult>>;
        const allAttempts = Object.values(results).flatMap((r) => Object.values(r));
        const totalAttempts = allAttempts.length;
        const avgScore = totalAttempts > 0
          ? Math.round(allAttempts.reduce((s, a) => s + (a.total > 0 ? (a.score / a.total) * 100 : 0), 0) / totalAttempts)
          : 0;
        progressMap[link.childUid] = {
          uid: link.childUid,
          name: link.childName,
          results,
          totalAttempts,
          avgScore,
        };
        setChildren(Object.values(progressMap));
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [user, links]);

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log in required</h1>
        <Link to="/login?next=/parent" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  const addChild = async () => {
    if (!childUid.trim()) return;
    setBusy(true);
    const linkId = childUid.trim();
    await set(ref(db, `parentLinks/${user.uid}/${linkId}`), {
      parentUid: user.uid,
      childUid: linkId,
      childName: linkId.slice(0, 6),
      createdAt: Date.now(),
    });
    setChildUid("");
    setAdding(false);
    setBusy(false);
  };

  const removeChild = async (uid: string) => {
    await remove(ref(db, `parentLinks/${user.uid}/${uid}`));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Parent Dashboard</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">Monitor your child's quiz progress.</p>

      <div className="mt-6 space-y-4">
        {children.length === 0 && links.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">No children linked yet.</p>
          </div>
        ) : (
          children.map((child) => (
            <div key={child.uid} className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{child.name}</h2>
                <button onClick={() => removeChild(child.uid)} className="text-xs text-red-500 hover:underline">
                  Remove
                </button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{child.totalAttempts}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total attempts</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {Object.keys(child.results).length}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Quizzes played</p>
                </div>
                <div>
                  <p className={`text-2xl font-extrabold ${child.avgScore >= 75 ? "text-emerald-700 dark:text-emerald-400" : child.avgScore >= 50 ? "text-amber-700 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                    {child.avgScore}%
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Average score</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {adding ? (
        <div className="mt-6 card p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Link a child</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enter your child's user ID to link their account. Ask them for their profile link.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              className="input"
              placeholder="Child's user ID"
              value={childUid}
              onChange={(e) => setChildUid(e.target.value)}
            />
            <button onClick={addChild} disabled={busy} className="btn-primary disabled:opacity-60">
              Link
            </button>
            <button onClick={() => setAdding(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="btn-primary mt-6">
          Link a child
        </button>
      )}
    </div>
  );
}
