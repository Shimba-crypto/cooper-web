import { useState } from "react";

const FRAME_RINGS: Record<string, string> = {
  "frame-emerald": "ring-4 ring-emerald-500/80",
  "frame-sunset": "ring-4 ring-orange-500/80",
  "frame-gold": "ring-4 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]",
};

interface Props {
  src?: string;
  name: string;
  size?: number;
  frame?: string;
  className?: string;
}

export default function Avatar({ src, name, size = 40, frame, className = "" }: Props) {
  const [broken, setBroken] = useState(false);

  const ring = frame ? FRAME_RINGS[frame] ?? "" : "";
  const outer = ring ? "rounded-full" : "";

  if (!src || broken) {
    return (
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white ${ring} ${outer} ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {(name || "U").slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={`${name}'s avatar`}
      onError={() => setBroken(true)}
      className={`shrink-0 rounded-full object-cover ${ring} ${outer} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
