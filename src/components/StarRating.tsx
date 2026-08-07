import { Star } from "lucide-react";

interface Props {
  value: number;
  count?: number;
  interactive?: boolean;
  userValue?: number;
  onRate?: (value: number) => void;
}

export default function StarRating({ value, count, interactive, userValue, onRate }: Props) {
  const shown = interactive ? (userValue ?? 0) : value;

  return (
    <div className="flex items-center gap-1" role={interactive ? "radiogroup" : undefined}>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(shown);
          if (interactive) {
            return (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={userValue === star}
                aria-label={`Rate ${star} out of 5 stars`}
                onClick={() => onRate?.(star)}
                className="rounded p-0.5 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <Star
                  className={`h-5 w-5 ${
                    filled ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
                  }`}
                />
              </button>
            );
          }
          return (
            <Star
              key={star}
              className={`h-4 w-4 ${
                filled ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
              }`}
            />
          );
        })}
      </div>
      {!interactive && count !== undefined && (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {count > 0 ? `${value.toFixed(1)} (${count})` : "No ratings yet"}
        </span>
      )}
    </div>
  );
}
