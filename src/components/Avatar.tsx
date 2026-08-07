import { useState } from "react";

interface Props {
  src?: string;
  name: string;
  size?: number;
  className?: string;
}

export default function Avatar({ src, name, size = 40, className = "" }: Props) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white ${className}`}
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
      className={`shrink-0 rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
