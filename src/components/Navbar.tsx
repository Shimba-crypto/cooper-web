import { Link } from "react-router-dom";
import { Menu, Moon, Sun } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Navbar({
  theme,
  toggleTheme,
  onMenuClick,
}: {
  theme: "light" | "dark";
  toggleTheme: () => void;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <nav className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-black text-white">
              C
            </span>
            <span className="text-slate-900 dark:text-white">
              Cooper<span className="text-emerald-600">Web</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </nav>
    </header>
  );
}
