import { Pause, Play, Square } from "lucide-react";
import { useTextToSpeech } from "../hooks/useTextToSpeech";

interface Props {
  text: string;
}

export default function ReadAloudButton({ text }: Props) {
  const { supported, speaking, paused, play, pause, resume, stop } = useTextToSpeech();

  if (!supported) return null;

  const toggle = () => {
    if (speaking && paused) resume();
    else if (speaking) pause();
    else play(text);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        aria-label={speaking ? (paused ? "Resume reading" : "Pause reading") : "Read aloud"}
        className={`btn-secondary ${speaking ? "!border-emerald-600 !text-emerald-700 dark:!text-emerald-400" : ""}`}
      >
        {speaking ? (
          paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {speaking ? (paused ? "Resume" : "Pause") : "Read aloud"}
      </button>
      {speaking && (
        <button
          onClick={stop}
          aria-label="Stop reading"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Square className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
