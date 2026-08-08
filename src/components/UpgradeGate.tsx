import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface UpgradeGateProps {
  title: string;
  message?: string;
}

export default function UpgradeGate({ title, message }: UpgradeGateProps) {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="card p-8 text-center">
        <Lock className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {message ??
            "This feature is part of the Student plan. You're currently on the Free (read-only) plan — browse freely, but interactive features need an upgrade."}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {user ? (
            <Link to="/payments" className="btn-primary">
              Upgrade to Student (K50)
            </Link>
          ) : (
            <>
              <Link to="/signup" className="btn-primary">
                Create an account
              </Link>
              <Link to="/login" className="btn-secondary">
                Log in
              </Link>
            </>
          )}
        </div>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Student (K50) unlocks quizzes, progress, Market, Card and Trading. Teacher Full (K200) adds premium quizzes and marking schemes.
        </p>
      </div>
    </div>
  );
}
