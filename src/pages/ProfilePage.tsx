import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, Coins, CreditCard, Pencil, Trophy, Users } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { subscribeProfile, getProfiles } from "../data/fetchProfiles";
import { marketItemById } from "../data/market";
import Avatar from "../components/Avatar";
import FollowButton from "../components/FollowButton";
import Spinner from "../components/Spinner";
import type { LeaderboardEntry, Profile, WalletItem } from "../types";

export default function ProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { user, appUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [followerUids, setFollowerUids] = useState<string[]>([]);
  const [followingUids, setFollowingUids] = useState<string[]>([]);
  const [leaderboardEntry, setLeaderboardEntry] = useState<LeaderboardEntry | null>(null);
  const [list, setList] = useState<"followers" | "following" | null>(null);
  const [listProfiles, setListProfiles] = useState<Profile[] | null>(null);
  const [wallet, setWallet] = useState<Record<string, WalletItem> | null>(null);
  const isMe = user?.uid === uid;

  useEffect(() => {
    if (!uid) return;
    const unsubscribeProfile = subscribeProfile(uid, setProfile);
    const unsubscribeFollowers = onValue(ref(db, `followers/${uid}`), (snapshot) =>
      setFollowerUids(snapshot.val() ? Object.keys(snapshot.val()) : [])
    );
    const unsubscribeFollowing = onValue(ref(db, `following/${uid}`), (snapshot) =>
      setFollowingUids(snapshot.val() ? Object.keys(snapshot.val()) : [])
    );
    const unsubscribeLeaderboard = onValue(ref(db, `leaderboard/${uid}`), (snapshot) =>
      setLeaderboardEntry(snapshot.val() ?? null)
    );
    const unsubscribeWallet = isMe
      ? onValue(ref(db, `walletItems/${uid}`), (snapshot) => setWallet(snapshot.val() ?? {}))
      : (() => {
          setWallet(null);
          return () => {};
        })();
    return () => {
      unsubscribeProfile();
      unsubscribeFollowers();
      unsubscribeFollowing();
      unsubscribeLeaderboard();
      unsubscribeWallet();
    };
  }, [uid, isMe]);

  useEffect(() => {
    if (!list) {
      setListProfiles(null);
      return;
    }
    let cancelled = false;
    const uids = list === "followers" ? followerUids : followingUids;
    getProfiles(uids).then((profiles) => {
      if (!cancelled) setListProfiles(profiles);
    });
    return () => {
      cancelled = true;
    };
  }, [list, followerUids, followingUids]);

  if (profile === undefined) return <Spinner label="Loading profile…" />;

  if (profile === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile not found</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          This user doesn't have a public profile yet.
        </p>
        <Link to="/" className="btn-primary mt-6">Go home</Link>
      </div>
    );
  }

  const badges = wallet ? Object.values(wallet).filter((w) => marketItemById(w.itemId)?.kind === "badge") : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-emerald-700 to-teal-900" />
        <div className="px-5 pb-8 sm:px-8">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-3">
            <Avatar
              src={profile.avatarUrl}
              name={profile.displayName}
              size={88}
              frame={isMe ? appUser?.avatarFrame : undefined}
              className="ring-4 ring-white dark:ring-slate-900"
            />
            <div className="flex flex-wrap items-center gap-2 pb-1">
              {isMe && (
                <Link to="/settings" className="btn-secondary">
                  <Pencil className="h-4 w-4" /> Edit profile
                </Link>
              )}
              <FollowButton targetUid={profile.uid} />
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
            {profile.displayName}
          </h1>
          {profile.bio && <p className="mt-1 text-slate-600 dark:text-slate-400">{profile.bio}</p>}

          <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <Calendar className="h-4 w-4" /> Member since {new Date(profile.createdAt).toLocaleDateString()}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <button
              onClick={() => setList(list === "followers" ? null : "followers")}
              aria-expanded={list === "followers"}
              className="rounded-lg bg-slate-50 p-4 text-left transition hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
            >
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{followerUids.length}</p>
              <p className="flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Users className="h-4 w-4" /> Followers
              </p>
            </button>
            <button
              onClick={() => setList(list === "following" ? null : "following")}
              aria-expanded={list === "following"}
              className="rounded-lg bg-slate-50 p-4 text-left transition hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
            >
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{followingUids.length}</p>
              <p className="flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Users className="h-4 w-4" /> Following
              </p>
            </button>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {leaderboardEntry?.totalScore ?? 0}
              </p>
              <p className="flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Trophy className="h-4 w-4" /> Quiz points
              </p>
            </div>
          </div>

          {isMe && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Coins className="h-4 w-4 text-amber-500" />
                <strong className="text-amber-700 dark:text-amber-400">{appUser?.coins ?? 0}</strong> CooperCoins
              </span>
              <Link to="/card" className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline">
                <CreditCard className="h-4 w-4" /> My card
              </Link>
              {badges.length > 0 && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {badges.map((b) => (
                    <span key={b.itemId} title={marketItemById(b.itemId)?.name}>
                      {marketItemById(b.itemId)?.icon}
                    </span>
                  ))}
                </span>
              )}
            </div>
          )}

          {list && (
            <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {list === "followers" ? "Followers" : "Following"}
              </h2>
              {listProfiles === null ? (
                <p className="mt-2 text-sm text-slate-400">Loading…</p>
              ) : listProfiles.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No one here yet.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {listProfiles.map((p) => (
                    <li key={p.uid}>
                      <Link
                        to={`/profile/${p.uid}`}
                        className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Avatar src={p.avatarUrl} name={p.displayName} size={32} />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {p.displayName}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
