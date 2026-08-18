import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MailCheck, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import Spinner from "../components/Spinner";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // The link is single-use; a re-render must not spend it twice.
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current) return;
    consumed.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/invite/redeem`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "This invite link could not be used.");
        }
        await loginWithToken(data.customToken);
        if (cancelled) return;
        navigate("/dashboard", { replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "This invite link could not be used.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col px-4 py-20">
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <ShieldAlert className="h-10 w-10 text-red-500" />
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Invite unavailable</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <div className="mt-4 flex gap-3">
            <Link to="/" className="btn-secondary">
              Go to home
            </Link>
            <Link to="/login" className="btn-primary">
              Log in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20">
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <MailCheck className="h-10 w-10 animate-pulse text-emerald-600" />
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Signing you in…</h1>
        <Spinner label="Verifying your invite" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You were invited to CooperWeb — no account needed.
        </p>
      </div>
    </div>
  );
}