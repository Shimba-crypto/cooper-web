import { useState } from "react";
import { Download, MessageCircle, Share2, X } from "lucide-react";
import type { Quiz } from "../types";
import { renderResultCard, waShareText } from "../utils/resultCard";

interface Props {
  quiz: Quiz;
  score: number;
  displayName: string;
  onClose: () => void;
}

export default function ResultShareModal({ quiz, score, displayName, onClose }: Props) {
  const [cardUrl] = useState<string | null>(() => {
    try {
      return renderResultCard(quiz, score, displayName);
    } catch {
      return null;
    }
  });
  const [shared, setShared] = useState(false);

  const download = () => {
    if (!cardUrl) return;
    const a = document.createElement("a");
    a.href = cardUrl;
    a.download = `${quiz.id}-result.png`;
    a.click();
  };

  const shareSystem = async () => {
    if (!cardUrl) return;
    try {
      const blob = await (await fetch(cardUrl)).blob();
      const file = new File([blob], `${quiz.id}-result.png`, { type: "image/png" });
      if (navigator.share) {
        await navigator.share({
          title: `${quiz.title} — CooperWeb`,
          text: `I scored ${score}/${quiz.questions.length} on ${quiz.title}!`,
          files: [file],
        });
        setShared(true);
      } else {
        download();
      }
    } catch {
      // user cancelled share — ignore
    }
  };

  const waHref = `https://wa.me/?text=${waShareText(quiz, score, displayName)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Share result">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="card relative w-full max-w-sm p-5 shadow-xl animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Share your result</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {cardUrl ? (
          <img src={cardUrl} alt="Result card" className="mt-4 w-full rounded-xl border border-slate-200 dark:border-slate-800" />
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Couldn't build the image on this device.</p>
        )}

        {shared && (
          <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            Shared!
          </p>
        )}

        <div className="mt-4 grid gap-2">
          <button onClick={shareSystem} className="btn-primary w-full">
            <Share2 className="h-4 w-4" /> Share
          </button>
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <button onClick={download} className="btn-secondary w-full">
            <Download className="h-4 w-4" /> Save image
          </button>
        </div>
      </div>
    </div>
  );
}
