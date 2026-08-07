import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Award, Printer } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useQuizzes } from "../hooks/useQuizzes";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import type { QuizResult } from "../types";

export default function CertificatePage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user, appUser } = useAuth();
  const { quizzes, loading: quizzesLoading } = useQuizzes();
  const [result, setResult] = useState<QuizResult | null | undefined>(undefined);

  useEffect(() => {
    if (!user || !quizId) return;
    const unsubscribe = onValue(ref(db, `results/${user.uid}/${quizId}`), (snapshot) => {
      setResult(snapshot.val() ?? null);
    });
    return unsubscribe;
  }, [user, quizId]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Award className="mx-auto h-12 w-12 text-amber-500" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Log in required</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Log in to view your certificates.
        </p>
        <Link to={`/login?next=/certificate/${quizId}`} className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  if (quizzesLoading || result === undefined) return <Spinner label="Loading certificate…" />;

  const quiz = quizzes.find((q) => q.id === quizId);
  const percentage = result && quiz ? Math.round((result.score / result.total) * 100) : 0;
  const eligible = !!result && !!quiz && percentage >= 75;

  if (!quiz || !result || !eligible) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Award className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">No certificate yet</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Certificates are awarded for scoring at least 75% on a past paper quiz.
        </p>
        <Link to="/quizzes" className="btn-primary mt-6">Take a quiz</Link>
      </div>
    );
  }

  const name = appUser?.displayName ?? user.displayName ?? user.email?.split("@")[0] ?? "Student";
  const date = new Date(result.completedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Certificate</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Score at least 75% on a past paper quiz to earn one.
          </p>
        </div>
        <button onClick={() => window.print()} className="btn-primary">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      <div className="certificate-print mt-6 bg-white p-2 shadow-sm">
        <div className="rounded-lg border-4 border-double border-amber-600 px-6 py-10 text-center sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">
            CooperWeb · ECZ Grade 7
          </p>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Certificate of Achievement
          </h2>
          <div className="mx-auto mt-6 h-0.5 w-24 bg-amber-600" />
          <p className="mt-6 text-sm uppercase tracking-widest text-slate-500">This certifies that</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{name}</p>
          <p className="mx-auto mt-4 max-w-md text-sm text-slate-600">
            has scored{" "}
            <strong>
              {result.score}/{result.total}
            </strong>{" "}
            ({percentage}%) on the past paper quiz{" "}
            <strong className="text-emerald-700">{quiz.title}</strong>
          </p>
          <p className="mt-6 text-sm text-slate-500">
            Awarded on {date} · chikondi-dot.web.app
          </p>
          <div className="mx-auto mt-8 h-14 w-40 border-t border-slate-400 pt-1">
            <p className="text-xs italic text-slate-500">CooperWeb</p>
          </div>
        </div>
      </div>
    </div>
  );
}
