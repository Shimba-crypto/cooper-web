import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { ref, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useLocalStorage } from "../hooks/useLocalStorage";

export default function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [pendingRef, setPendingRef] = useLocalStorage<string | null>("cooperweb:pending-ref", null);

  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (refParam) setPendingRef(refParam.toUpperCase());
  }, [searchParams, setPendingRef]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const uid = await signup(name, email, password);
      if (pendingRef) {
        const code = pendingRef.toUpperCase();
        const { get, ref: dbRef } = await import("firebase/database");
        const codeSnap = await get(dbRef(db, `referralCodes/${code}`));
        if (codeSnap.exists() && codeSnap.val().uid !== uid) {
          const referrerUid = codeSnap.val().uid as string;
          await set(ref(db, `referrals/${referrerUid}/${uid}`), {
            childUid: uid,
            childName: name,
            createdAt: Date.now(),
          });
          await set(ref(db, `users/${uid}/referredBy`), {
            referrerUid,
            code,
            createdAt: Date.now(),
          });
        }
        localStorage.removeItem("cooperweb:pending-ref");
      }
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Create account</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track progress, save bookmarks and take quizzes.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="label">Full name</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g. Chanda Mwamba"
            />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="At least 6 characters"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            <UserPlus className="h-4 w-4" /> {busy ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-emerald-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
