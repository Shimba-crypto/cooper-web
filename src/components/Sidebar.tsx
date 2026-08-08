import { Link, NavLink } from "react-router-dom";
import {
  BookOpen,
  Contact,
  CreditCard,
  Dices,
  ExternalLink,
  FileQuestion,
  FileText,
  Gift,
  Home,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Swords,
  Trophy,
  User,
  UserPlus,
  Users,
  Wallet,
  X,
  Handshake,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { hasInteractiveAccess } from "../utils/plans";
import PlanBadge from "./PlanBadge";
import Avatar from "./Avatar";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const linkItems: { to: string; label: string; icon: LucideIcon; end?: boolean; gated?: boolean }[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/papers", label: "Past Papers", icon: BookOpen },
  { to: "/quizzes", label: "Quizzes", icon: FileQuestion },
  { to: "/notes", label: "Study Notes", icon: FileText },
  { to: "/groups", label: "School Groups", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/people", label: "People", icon: Contact },
  { to: "/progress", label: "My Progress", icon: LayoutDashboard, gated: true },
  { to: "/generate", label: "Random Paper", icon: Dices },
  { to: "/challenge", label: "Challenges", icon: Swords, gated: true },
  { to: "/progress-report", label: "Progress Report", icon: FileText, gated: true },
  { to: "/referrals", label: "Refer & Earn", icon: Gift },
  { to: "/market", label: "Market", icon: Store, gated: true },
  { to: "/card", label: "My Card", icon: CreditCard, gated: true },
  { to: "/trading", label: "Trading Post", icon: Handshake, gated: true },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/john-web", label: "John Web", icon: ExternalLink },
  { to: "/create-quiz", label: "Create Quiz", icon: Plus },
  { to: "/search", label: "Search", icon: Search },
];

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { user, appUser, isAdmin, planId, logout } = useAuth();
  const isFree = !hasInteractiveAccess(planId);

  const items = [
    ...linkItems.filter((item) => !isFree || !item.gated),
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  const buildUpgrade = (mobile: boolean) => {
    if (!isFree) return null;
    const min = collapsed && !mobile;
    return (
      <div className={`px-3 pb-2 ${min ? "" : ""}`}>
        <Link
          to="/payments"
          onClick={onCloseMobile}
          className={`flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white shadow-sm transition hover:opacity-90 ${
            min ? "justify-center px-2 py-2" : "px-3 py-2.5"
          }`}
        >
          {!min && (
            <span className="flex-1">
              Free plan — read-only
              <span className="block text-xs font-semibold text-amber-100">Upgrade to Student (K50)</span>
            </span>
          )}
          <Wallet className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      </div>
    );
  };

  const buildLinks = (mobile: boolean) => {
    const min = collapsed && !mobile;
    const linkClass = ({ isActive }: { isActive: boolean }) =>
      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        min ? "justify-center px-2" : ""
      } ${
        isActive
          ? "bg-emerald-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      }`;

    return (
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2" aria-label="Main navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={min ? item.label : undefined}
            onClick={onCloseMobile}
            className={linkClass}
          >
            <item.icon className="h-5 w-5 shrink-0" aria-hidden />
            {!min && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    );
  };

  const buildAuth = (mobile: boolean) => {
    const min = collapsed && !mobile;

    if (user) {
      return (
        <div
          className={`flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-800 ${
            min ? "flex-col" : ""
          }`}
        >
          <Link
            to={`/profile/${user.uid}`}
            onClick={onCloseMobile}
            title={min ? "My profile" : undefined}
            className={min ? "shrink-0" : "flex shrink-0 items-center gap-2 rounded-lg transition hover:opacity-80"}
          >
            <Avatar
              src={appUser?.avatarUrl}
              name={appUser?.displayName ?? user.email ?? "U"}
              size={36}
              frame={appUser?.avatarFrame}
            />
          </Link>
          {!min && (
            <Link
              to={`/profile/${user.uid}`}
              onClick={onCloseMobile}
              className="min-w-0 flex-1 rounded-lg transition hover:opacity-80"
            >
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {appUser?.displayName ?? user.email?.split("@")[0]}
              </p>
              <p className="mt-0.5">
                <PlanBadge planId={planId} />
              </p>
            </Link>
          )}
          <button
            onClick={logout}
            title="Log out"
            aria-label="Log out"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <div
        className={`grid gap-2 border-t border-slate-200 p-3 dark:border-slate-800 ${
          min ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        <Link
          to="/login"
          onClick={onCloseMobile}
          title={min ? "Log in" : undefined}
          className={min ? "btn-secondary !justify-center !px-2" : "btn-secondary"}
        >
          {min ? <User className="h-4 w-4" /> : "Log in"}
        </Link>
        <Link
          to="/signup"
          onClick={onCloseMobile}
          title={min ? "Sign up" : undefined}
          className={min ? "btn-primary !justify-center !px-2" : "btn-primary"}
        >
          {min ? <UserPlus className="h-4 w-4" /> : "Sign up"}
        </Link>
      </div>
    );
  };

  return (
    <>
      <aside
        className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-950 lg:flex ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className={`flex items-center p-3 ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Menu</span>
          )}
          <button
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>
        {buildLinks(false)}
        {buildUpgrade(false)}
        <div className="mt-auto">{buildAuth(false)}</div>
      </aside>

      <div
        className={`fixed inset-0 z-40 lg:hidden ${mobileOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onCloseMobile}
          className={`absolute inset-0 bg-black/50 transition-opacity ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 dark:bg-slate-950 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              Cooper<span className="text-emerald-600">Web</span>
            </span>
            <button
              onClick={onCloseMobile}
              aria-label="Close menu"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {buildLinks(true)}
          {buildUpgrade(true)}
          <div className="mt-auto">{buildAuth(true)}</div>
        </aside>
      </div>
    </>
  );
}
