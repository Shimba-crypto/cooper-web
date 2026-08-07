import { useState } from "react";
import { FRAME_CLASSES, OVERLAY_EMOJIS } from "../data/market";

interface Props {
  src?: string;
  name: string;
  size?: number;
  frame?: string;
  overlay?: string;
  className?: string;
}

export default function Avatar({ src, name, size = 40, frame, overlay, className = "" }: Props) {
  const [broken, setBroken] = useState(false);

  const ring = frame ? FRAME_CLASSES[frame] ?? "" : "";
  const overlayEmoji = overlay ? OVERLAY_EMOJIS[overlay] ?? "" : "";

  const avatar = !src || broken ? (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white ${ring} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(name || "U").slice(0, 1).toUpperCase()}
    </span>
  ) : (
    <img
      src={src}
      alt={`${name}'s avatar`}
      onError={() => setBroken(true)}
      className={`shrink-0 rounded-full object-cover ${ring} ${className}`}
      style={{ width: size, height: size }}
    />
  );

  if (!overlayEmoji) return avatar;

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {avatar}
      <span
        aria-hidden
        className="absolute -right-1 -top-1 select-none leading-none"
        style={{ fontSize: Math.max(12, size * 0.38) }}
      >
        {overlayEmoji}
      </span>
    </span>
  );
}
