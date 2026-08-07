import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, Coins, CreditCard, Pencil, Star, Trophy, Users } from "lucide-react";
import { onValue, ref, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { subscribeProfile, getProfiles } from "../data/fetchProfiles";
import { BANNER_GRADIENTS, ICONS, NAME_COLORS, STATUS_EMOJIS, marketItemById } from "../data/market";
import Avatar from "../components/Avatar";
import FollowButton from "../components/FollowButton";
import Spinner from "../components/Spinner";
import { useToast } from "../components/Toast";
import { API_URL } from "../config";
import type { DigitalCard, LeaderboardEntry, Profile, WalletItem } from "../types";

interface Cosmetics {
  uid: string;
  avatarFrame?: string;
  avatarOverlay?: string;
  nameColor?: string;
  statusEmoji?: string;
  bannerColor?: string;
  showcasedBadges?: string[];
  showcasedCard?: boolean;
}

export default function ProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const { user, appUser } = useAuth();
  const { showToast, toast } = useToast();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [followerUids, setFollowerUids] = useState<string[]>([]);
  const [followingUids, setFollowingUids] = useState<string[]>([]);
  const [leaderboardEntry, setLeaderboardEntry] = useState<LeaderboardEntry | null>(null);
  const [list, setList] = useState<"followers" | "following" | null>(null);
  const [listProfiles, setListProfiles] = useState<Profile[] | null>(null);
  const [wallet, setWallet] = useState<Record<string, WalletItem> | null>(null);
  const [cosmetics, setCosmetics] = useState<Cosmetics | null>(null);
  const [showcaseCard, setShowcaseCard] = useState<DigitalCard | null | undefined>(undefined);
  const isMe = user?.uid === uid;

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/people`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const found = (data?.people ?? []).find((p: Cosmetics) => p.uid === uid);
        setCosmetics(found ?? null);
      })
      .catch(() => {
        if (!cancelled) setCosmetics(null);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

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

  const showcaseVisible = isMe ? Boolean(appUser?.showcasedCard) : Boolean(cosmetics?.showcasedCard);

  useEffect(() => {
    if (!uid || !showcaseVisible) {
      setShowcaseCard(undefined);
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/api/card?uid=${encodeURIComponent(uid)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.number) setShowcaseCard(data as DigitalCard);
        else if (!cancelled) setShowcaseCard(null);
      })
      .catch(() => {
        if (!cancelled) setShowcaseCard(null);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, showcaseVisible]);

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

  const frame = isMe ? appUser?.avatarFrame : cosmetics?.avatarFrame;
  const overlay = isMe ? appUser?.avatarOverlay : cosmetics?.avatarOverlay;
  const bannerColor = isMe ? appUser?.bannerColor : cosmetics?.bannerColor;
  const nameColor = isMe ? appUser?.nameColor : cosmetics?.nameColor;
  const statusEmoji = isMe
    ? appUser?.statusEmoji
      ? STATUS_EMOJIS[appUser.statusEmoji] ?? ""
      : ""
    : cosmetics?.statusEmoji
      ? STATUS_EMOJIS[cosmetics.statusEmoji] ?? ""
      : "";

  const ownedBadges = wallet
    ? Object.values(wallet).filter((w) => marketItemById(w.itemId)?.kind === "badge")
    : [];
  const showcased = isMe ? (appUser?.showcasedBadges ?? []) : (cosmetics?.showcasedBadges ?? []);

  const toggleShowcase = async (itemId: string) => {
    if (!user || !isMe) return;
    const current = appUser?.showcasedBadges ?? [];
    const next = current.includes(itemId) ? current.filter((b) => b !== itemId) : [...current, itemId];
    try {
      await set(ref(db, `users/${user.uid}/showcasedBadges`), next);
    } catch {
      showToast("Could not update showcase.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {toast}
      <div className="card overflow-hidden">
        <div
          className={`h-24 bg-gradient-to-br ${BANNER_GRADIENTS[bannerColor ?? ""] ?? "from-emerald-700 to-teal-900"}`}
        />
        <div className="px-5 pb-8 sm:px-8">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-3">
            <Avatar
              src={profile.avatarUrl}
              name={profile.displayName}
              size={88}
              frame={frame}
              overlay={overlay}
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

          <h1 className="mt-4 flex flex-wrap items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            <span style={nameColor ? { color: NAME_COLORS[nameColor] } : undefined}>{profile.displayName}</span>
            {statusEmoji && <span>{statusEmoji}</span>}
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

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
            {isMe && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Coins className="h-4 w-4 text-amber-500" />
                <strong className="text-amber-700 dark:text-amber-400">{appUser?.coins ?? 0}</strong> CooperCoins
              </span>
            )}
            {isMe && (
              <Link to="/card" className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline">
                <CreditCard className="h-4 w-4" /> My card
              </Link>
            )}
            {ownedBadges.length > 0 && (
              <span className="flex flex-wrap items-center gap-2">
                {ownedBadges.map((b) => {
                  const item = marketItemById(b.itemId);
                  if (!item) return null;
                  const Icon = ICONS[item.icon] ?? Star;
                  const isShown = showcased.includes(b.itemId);
                  return (
                    <button
                      key={b.itemId}
                      onClick={() => toggleShowcase(b.itemId)}
                      disabled={!isMe}
                      title={`${item.name}${isMe ? (isShown ? " — click to remove from showcase" : " — click to showcase") : ""}`}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        isShown
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                          : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                      } ${isMe ? "hover:opacity-80" : "cursor-default"}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.name}
                      {isMe && <Star className={`h-3 w-3 ${isShown ? "fill-amber-400 text-amber-400" : ""}`} />}
                    </button>
                  );
                })}
              </span>
            )}
          </div>

          {showcaseVisible && showcaseCard && (
            <div className="mt-4 rounded-xl bg-gradient-to-br from-emerald-800 via-emerald-600 to-teal-500 p-4 text-white shadow-lg">
              <div className="flex items-start justify-between">
                <span className="text-lg font-extrabold tracking-wide">
                  Cooper<span className="text-white/80">Web</span>
                </span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">CooperCard</span>
              </div>
              <p className="mt-4 font-mono text-sm tracking-[0.2em] sm:text-lg">{showcaseCard.number}</p>
              <p className="mt-2 text-xs font-semibold text-white/90">
                {showcaseCard.holderName}
              </p>
              <Link to={`/card`} className="mt-3 inline-block text-xs font-semibold text-white underline">
                {isMe ? "Manage my card" : "See my card"}
              </Link>
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
