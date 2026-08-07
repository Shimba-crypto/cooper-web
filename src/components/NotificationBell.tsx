import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Info, Megaphone, Pencil, Trophy } from "lucide-react";
import { onValue, ref as dbRef, set, update } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import type { Notification } from "../types";

const ICONS: Record<Notification["type"], typeof Info> = {
  info: Info,
  new_quiz: Pencil,
  announcement: Megaphone,
  assignment: Pencil,
  achievement: Trophy,
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(dbRef(db, `notifications/${user.uid}`), (snap) => {
      const val = snap.val() ?? {};
      const list: Notification[] = Object.values(val);
      setNotifications(list.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    const updates: Record<string, boolean> = {};
    notifications.filter((n) => !n.read).forEach((n) => {
      updates[`notifications/${user.uid}/${n.id}/read`] = true;
    });
    if (Object.keys(updates).length > 0) await update(dbRef(db), updates);
  };

  const markRead = async (id: string) => {
    if (!user) return;
    await set(dbRef(db, `notifications/${user.uid}/${id}/read`), true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No notifications yet.
              </p>
            ) : (
              notifications.slice(0, 20).map((n) => {
                const Icon = ICONS[n.type] ?? Info;
                return (
                  <Link
                    key={n.id}
                    to={n.link ?? "/"}
                    onClick={() => { setOpen(false); if (!n.read) markRead(n.id); }}
                    className={`flex gap-3 border-b border-slate-100 px-4 py-3 transition last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${!n.read ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}
                  >
                    <div className="mt-0.5 rounded-full bg-slate-100 p-1.5 dark:bg-slate-800">
                      <Icon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
