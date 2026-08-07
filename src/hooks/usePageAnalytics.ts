import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { increment, ref, update } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const TRACKED_ROUTES = new Set([
  "/",
  "/papers",
  "/quizzes",
  "/search",
  "/groups",
  "/notes",
  "/progress",
  "/report",
  "/leaderboard",
  "/parent",
  "/generate",
  "/referrals",
  "/challenge",
  "/payments",
]);

export function usePageAnalytics() {
  const location = useLocation();
  const { user } = useAuth();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !TRACKED_ROUTES.has(location.pathname) || lastPath.current === location.pathname) {
      return;
    }
    lastPath.current = location.pathname;
    const path = location.pathname === "/" ? "home" : location.pathname.slice(1);
    const updates: Record<string, unknown> = {
      [`analytics/pages/${path}/views`]: increment(1),
      [`analytics/pages/${path}/uniqueUsers/${user.uid}`]: true,
      [`analytics/lastVisit/${user.uid}`]: Date.now(),
    };
    update(ref(db), updates).catch(() => {});
  }, [location.pathname, user]);
}
