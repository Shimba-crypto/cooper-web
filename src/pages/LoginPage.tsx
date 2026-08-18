import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogIn, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

export default function LoginPage() {
  const { login, loginWithToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const ssoToken = searchParams.get("sso_token");
  const ssoError = searchParams.get("error");
  const [ssoBusy, setSsoBusy] = useState(!!ssoToken);
  // The token is single-use; a re-render must not spend it twice.
  const consumed = useRef(false);

  useEffect(() => {
    if (ssoError === "sso_failed") {
      setError("Auther login failed. Try again, or use your email and password.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [ssoError]);

  useEffect(() => {
    if (!ssoToken || consumed.current) return;
    consumed.current = true;
    // Strip the token from the URL before using it, so a refresh cannot replay it.
    window.history.replaceState({}, "", window.location.pathname);
    loginWithToken(ssoToken)
      .then(() => navigate(next, { replace: true }))
      .catch(() => {
        setError("That Auther sign-in link has expired. Please try again.");
        setSsoBusy(false);
      });
  }, [ssoToken, loginWithToken, navigate, next]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setBusy(false);
    }
  };

  if (ssoBusy) {
    return (
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <ShieldCheck className="h-8 w-8 animate-pulse text-emerald-600" />
          <p className="font-semibold text-slate-900 dark:text-white">Signing you in with Auther…</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">This only takes a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Log in</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Welcome back. Enter your details to continue.
        </p>

        <a
          href={`${API_URL}/api/auth/sso`}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Continue with Auther
        </a>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Get Student Plus free for 2 weeks
        </p>

        <div className="mt-6 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">or</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            <LogIn className="h-4 w-4" /> {busy ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate(next, { replace: true })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <UserRound className="h-4 w-4 text-emerald-600" />
            Continue as guest
          </button>
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            Get a 7-day Student trial free — no account needed.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No account?{" "}
          <Link to={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-emerald-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
