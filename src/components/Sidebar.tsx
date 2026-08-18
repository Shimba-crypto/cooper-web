import { Link, NavLink } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Bot,
  Coins,
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
  Rocket,
  Search,
  ShieldCheck,
  Smartphone,
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
import { hasInteractiveAccess, hasMarketAccess } from "../utils/plans";
import PlanBadge from "./PlanBadge";
import Avatar from "./Avatar";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  gated?: boolean;
  premium?: boolean;
}

interface NavGroup {
  /** Section heading. Null for the lead group, which needs no label. */
  title: string | null;
  items: NavItem[];
}

// Grouped so the nav reads as a few short lists rather than one long wall.
const navGroups: NavGroup[] = [
  {
    title: null,
    items: [
      { to: "/", label: "Home", icon: Home, end: true },
      { to: "/search", label: "Search", icon: Search },
    ],
  },
  {
    title: "Study",
    items: [
      { to: "/papers", label: "Past Papers", icon: BookOpen },
      { to: "/quizzes", label: "Quizzes", icon: FileQuestion },
      { to: "/notes", label: "Study Notes", icon: FileText },
      { to: "/generate", label: "Random Paper", icon: Dices },
      { to: "/ai-chat", label: "AI Chat", icon: Bot, gated: true },
      { to: "/create-quiz", label: "Create Quiz", icon: Plus },
    ],
  },
  {
    title: "Progress",
    items: [
      { to: "/progress", label: "My Progress", icon: LayoutDashboard, gated: true },
      { to: "/progress-report", label: "Progress Report", icon: FileText, gated: true },
      { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { to: "/challenge", label: "Challenges", icon: Swords, gated: true },
    ],
  },
  {
    title: "Community",
    items: [
      { to: "/groups", label: "School Groups", icon: Users },
      { to: "/people", label: "People", icon: Contact },
      { to: "/referrals", label: "Refer & Earn", icon: Gift },
    ],
  },
  {
    title: "Coins & Card",
    items: [
      { to: "/market", label: "Market", icon: Store, gated: true, premium: true },
      { to: "/card", label: "My Card", icon: CreditCard, gated: true, premium: true },
      { to: "/trading", label: "Trading Post", icon: Handshake, gated: true },
      { to: "/wallet", label: "Nexa Wallet", icon: Coins },
      { to: "/payments", label: "Payments", icon: Wallet },
    ],
  },
  {
    title: "More",
    items: [
      { to: "/install", label: "Get the App", icon: Smartphone },
      { to: "/apps", label: "Apps", icon: Rocket },
      { to: "/john-web", label: "John Web", icon: ExternalLink },
      { to: "/api-docs", label: "API Docs", icon: FileText },
    ],
  },
];

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { user, appUser, isAdmin, planId, guestTrialEndsAt, logout } = useAuth();
  const isFree = !hasInteractiveAccess(planId);
  const isMarketLocked = !hasMarketAccess(planId);

  const visible = (item: NavItem) =>
    (!isFree || !item.gated) && (!isMarketLocked || !item.premium);

  // Drop hidden links, then drop any group left empty by the gating.
  const groups: NavGroup[] = [
    ...navGroups
      .map((group) => ({ ...group, items: group.items.filter(visible) }))
      .filter((group) => group.items.length > 0),
    ...(isAdmin
      ? [{ title: "Admin", items: [{ to: "/admin", label: "Admin", icon: ShieldCheck }, { to: "/analytics", label: "Analytics", icon: BarChart3 }] }]
      : []),
  ];

  const buildUpgrade = (mobile: boolean) => {
    if (!isFree && !guestTrialEndsAt) return null;
    const min = collapsed && !mobile;
    const trial = guestTrialEndsAt != null;
    const daysLeft = trial ? Math.max(1, Math.ceil((guestTrialEndsAt - Date.now()) / (24 * 60 * 60 * 1000))) : 0;
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
              {trial ? `Student trial — ${daysLeft}d left` : "Free plan"}
              <span className="block text-xs font-semibold text-amber-100">
                {trial ? "Upgrade to keep Student (K50)" : "Take quizzes free — upgrade for progress"}
              </span>
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
      `flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        min ? "justify-center px-2" : ""
      } ${
        isActive
          ? "bg-emerald-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      }`;

    return (
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-2" aria-label="Main navigation">
        {groups.map((group, i) => (
          <div key={group.title ?? "main"} className={i > 0 ? "mt-3" : ""}>
            {group.title &&
              (min ? (
                // Collapsed: a rule stands in for the heading.
                <div className="mx-auto mb-2 h-px w-6 bg-slate-200 dark:bg-slate-800" aria-hidden />
              ) : (
                <p className="px-3 pb-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.title}
                </p>
              ))}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
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
            </div>
          </div>
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
