import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { ref as dbRef, set, update } from "firebase/database";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { subscribeProfile } from "../data/fetchProfiles";
import AvatarUploader from "../components/AvatarUploader";
import Spinner from "../components/Spinner";

export default function EditProfilePage() {
  const { user, appUser } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeProfile(user.uid, (profile) => {
      if (profile) {
        setDisplayName(profile.displayName ?? appUser?.displayName ?? "");
        setBio(profile.bio ?? "");
        setAvatarUrl(profile.avatarUrl ?? "");
      } else {
        setDisplayName(appUser?.displayName ?? "");
      }
      setLoaded(true);
    });
    return unsubscribe;
  }, [user, appUser]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log in required</h1>
        <Link to="/login?next=/settings" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  if (!loaded) return <Spinner label="Loading your profile…" />;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateAuthProfile(auth.currentUser!, { displayName: displayName.trim() });
      await set(dbRef(db, `profiles/${user.uid}`), {
        uid: user.uid,
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl,
        createdAt: appUser?.createdAt ?? Date.now(),
      });
      await update(dbRef(db, `users/${user.uid}`), {
        displayName: displayName.trim(),
        avatarUrl,
      });
      await update(dbRef(db, `leaderboard/${user.uid}`), {
        displayName: displayName.trim(),
      });
      setSaved(true);
      setTimeout(() => navigate(`/profile/${user.uid}`), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link
        to={`/profile/${user.uid}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to my profile
      </Link>

      <form onSubmit={save} className="card mt-4 p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Edit profile</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your profile is public — other users can see it and follow you.
        </p>

        <div className="mt-6">
          <AvatarUploader currentUrl={avatarUrl} name={displayName || "U"} onUploaded={setAvatarUrl} />
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="label">Display name</span>
            <input
              className="input"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </label>
          <label className="block">
            <span className="label">Bio</span>
            <textarea
              className="input"
              rows={4}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others a bit about yourself…"
            />
            <span className="mt-1 block text-right text-xs text-slate-400">{bio.length}/300</span>
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            Profile saved!
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary mt-6 w-full disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
