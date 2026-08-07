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
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { onValue, ref, set } from "firebase/database";
import { auth, db } from "../firebase";
import { registerPushToken } from "../utils/push";
import type { AppUser, PlanId } from "../types";

interface AuthContextValue {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  planId: PlanId;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        isAdmin: appUser?.role === "admin",
        planId:
          appUser?.role === "admin"
            ? "admin"
            : (appUser?.plan?.id ?? "free"),
        login,
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
