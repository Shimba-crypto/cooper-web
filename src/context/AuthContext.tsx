import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { onValue, ref, set } from "firebase/database";
import { auth, db } from "../firebase";
import { registerPushToken } from "../utils/push";
import { effectivePlan } from "../utils/plans";
import type { AppUser, PlanId } from "../types";

interface AuthContextValue {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  planId: PlanId;
  /** Ends of the 7-day Student trial guests get on this device, if running. */
  guestTrialEndsAt: number | null;
  login: (email: string, password: string) => Promise<void>;
  /** Sign in with a Firebase custom token minted by the API (Auther SSO). */
  loginWithToken: (token: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const GUEST_TRIAL_DAYS = 7;
const GUEST_TRIAL_KEY = "cooperweb:guest-trial";

interface GuestTrial {
  startedAt: number;
  expiresAt: number;
}

function readGuestTrial(): GuestTrial | null {
  try {
    const raw = localStorage.getItem(GUEST_TRIAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestTrial;
    return parsed && typeof parsed.expiresAt === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function startGuestTrial(): GuestTrial {
  const now = Date.now();
  const trial = { startedAt: now, expiresAt: now + GUEST_TRIAL_DAYS * 24 * 60 * 60 * 1000 };
  try {
    localStorage.setItem(GUEST_TRIAL_KEY, JSON.stringify(trial));
  } catch {}
  return trial;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [guestTrial, setGuestTrial] = useState<GuestTrial | null>(null);

  // Every visitor without an account gets a 7-day Student trial on this device.
  useEffect(() => {
    if (user) return;
    const existing = readGuestTrial();
    if (existing && existing.expiresAt > Date.now()) {
      setGuestTrial(existing);
      return;
    }
    if (existing && existing.expiresAt <= Date.now()) {
      try {
        localStorage.removeItem(GUEST_TRIAL_KEY);
      } catch {}
    }
    setGuestTrial(startGuestTrial());
  }, [user]);

  // A time-limited plan has to lapse on its own. Re-evaluate exactly when the
  // grant runs out so access drops without needing a reload.
  const expiresAt = appUser?.plan?.expiresAt ?? guestTrial?.expiresAt;
  useEffect(() => {
    if (!expiresAt) return;
    const msLeft = expiresAt - Date.now();
    if (msLeft <= 0) {
      setNowTick(Date.now());
      return;
    }
    // setTimeout caps out around 24.8 days; clamp and re-arm via the tick.
    const delay = Math.min(msLeft, 6 * 60 * 60 * 1000);
    const timer = setTimeout(() => setNowTick(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [expiresAt, nowTick]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setAppUser(null);
      return;
    }
    const unsubscribe = onValue(ref(db, `users/${user.uid}`), (snapshot) => {
      setAppUser(snapshot.val() ?? null);
    });
    registerPushToken(user.uid);
    return unsubscribe;
  }, [user]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithToken = async (token: string) => {
    await signInWithCustomToken(auth, token);
  };

  const signup = async (name: string, email: string, password: string) => {
    const credentials = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credentials.user, { displayName: name });
    const createdAt = Date.now();
    await set(ref(db, `users/${credentials.user.uid}`), {
      uid: credentials.user.uid,
      email,
      displayName: name,
      role: "user",
      createdAt,
    } satisfies AppUser);
    await set(ref(db, `profiles/${credentials.user.uid}`), {
      uid: credentials.user.uid,
      displayName: name,
      bio: "",
      createdAt,
    });
    sendEmailVerification(credentials.user).catch(() => {});
    return credentials.user.uid;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const trialActive = !user && guestTrial !== null && guestTrial.expiresAt > nowTick;
  const planId: PlanId = trialActive
    ? "student"
    : effectivePlan(appUser?.plan, appUser?.role, nowTick);

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        isAdmin: appUser?.role === "admin",
        planId,
        guestTrialEndsAt: trialActive ? guestTrial.expiresAt : null,
        login,
        loginWithToken,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
