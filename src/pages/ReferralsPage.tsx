import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Gift, Share2 } from "lucide-react";
import { onValue, ref, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import type { Referral } from "../types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export default function ReferralsPage() {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [myReferrals, setMyReferrals] = useState<Record<string, Referral> | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `users/${user.uid}/referralCode`), (snap) => {
      if (snap.exists()) {
        setCode(snap.val() as string);
      } else {
        const newCode = Array.from({ length: 8 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
        set(ref(db, `users/${user.uid}/referralCode`), newCode);
        set(ref(db, `referralCodes/${newCode}`), { uid: user.uid, code: newCode, createdAt: Date.now() });
        setCode(newCode);
      }
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `referrals/${user.uid}`), (snap) => {
      const val = snap.val() as Record<string, Referral> | null;
      setMyReferrals(val ?? {});
    });
    return unsub;
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log in required</h1>
        <Link to="/login?next=/referrals" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  if (!code) return <Spinner label="Preparing your referral code…" />;

  const link = `${window.location.origin}/signup?ref=${code}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const entries = myReferrals ? Object.values(myReferrals).sort((a, b) => b.createdAt - a.createdAt) : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-950">
          <Gift className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Referral program</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Invite friends to CooperWeb and grow the community.
          </p>
        </div>
      </div>

      <div className="mt-6 card p-6">
        <span className="label">Your referral code</span>
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-emerald-50 px-4 py-2 font-mono text-2xl font-black tracking-widest text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            {code}
          </span>
          <button onClick={copyLink} className="btn-primary">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Share your link — when friends sign up through it, they're tracked to you.
        </p>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Join me on CooperWeb — ECZ Grade 7 past papers, quizzes & notes! ${link}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary mt-4"
        >
          <Share2 className="h-4 w-4" /> Share on WhatsApp
        </a>
      </div>

      <div className="mt-6 card p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Friends referred ({entries.length})
        </h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No referrals yet. Share your code to get started.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {entries.map((r) => (
              <li key={r.childUid} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 dark:bg-slate-800/50">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.childName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Joined {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                  Referred
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
