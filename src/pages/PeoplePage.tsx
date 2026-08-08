import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Handshake, Lock, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { hasInteractiveAccess } from "../utils/plans";
import Spinner from "../components/Spinner";
import Avatar from "../components/Avatar";
import { useToast } from "../components/Toast";
import { NAME_COLORS, STATUS_EMOJIS } from "../data/market";
import { API_URL } from "../config";
import type { PlanId } from "../types";

interface Person {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  role?: "user" | "admin";
  planId?: PlanId;
  bio?: string;
  coins?: number;
  avatarFrame?: string;
  avatarOverlay?: string;
  nameColor?: string;
  statusEmoji?: string;
}

export default function PeoplePage() {
  const { user, appUser, planId } = useAuth();
  const { showToast, toast } = useToast();
  const interactive = hasInteractiveAccess(planId);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [giftFor, setGiftFor] = useState<string | null>(null);
  const [giftAmount, setGiftAmount] = useState("5");
  const [gifting, setGifting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/people`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setPeople((data?.people ?? []) as Person[]);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the member directory.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sendGift = async (person: Person) => {
    if (!user) return;
    const amt = Number(giftAmount);
    if (!Number.isInteger(amt) || amt <= 0) {
      showToast("Enter a positive whole number of CC.");
      return;
    }
    setGifting(true);
    try {
      const res = await fetch(`${API_URL}/api/gift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, toUid: person.uid, amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error ?? `Gift failed (${res.status})`);
      } else {
        showToast(`Sent ${amt} CC to ${person.displayName}!`);
        setGiftFor(null);
      }
    } catch (err) {
      showToast(err instanceof Error ? `Gift failed: ${err.message}` : "Gift failed — try again.");
    } finally {
      setGifting(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="card mt-8 p-12 text-center text-slate-500 dark:text-slate-400">{error}</p>
      </div>
    );
  }

  if (!people) return <Spinner label="Loading members…" />;

  const filtered = query.trim()
    ? people.filter((p) => p.displayName.toLowerCase().includes(query.trim().toLowerCase()))
    : people;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {toast}
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-emerald-600" />
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">People</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {people.length} {people.length === 1 ? "member" : "members"} of the CooperWeb community.
            Gifts are capped at 50 CC per day.
          </p>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search members…"
        className="mt-6 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />

      {filtered.length === 0 ? (
        <div className="card mt-6 p-12 text-center text-slate-500 dark:text-slate-400">
          No members match “{query}”.
        </div>
      ) : (
        <div className="card mt-6 divide-y divide-slate-200 dark:divide-slate-800">
          {filtered.map((person) => {
            const isMe = user && person.uid === user.uid;
            const nameStyle = person.nameColor ? { color: NAME_COLORS[person.nameColor] } : undefined;
            const statusEmoji = person.statusEmoji ? STATUS_EMOJIS[person.statusEmoji] ?? "" : "";
            return (
              <div key={person.uid} className="flex items-center gap-4 px-5 py-4">
                <Link to={`/profile/${person.uid}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <Avatar
                    src={person.avatarUrl}
                    name={person.displayName}
                    size={44}
                    frame={person.avatarFrame}
                    overlay={person.avatarOverlay}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900 dark:text-white">
                      <span className="truncate" style={nameStyle}>
                        {person.displayName}
                      </span>
                      {statusEmoji && <span className="shrink-0">{statusEmoji}</span>}
                      {isMe && (
                        <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                          You
                        </span>
                      )}
                      {person.role === "admin" && (
                        <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          Admin
                        </span>
                      )}
                    </p>
                    {person.bio && (
                      <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                        {person.bio}
                      </p>
                    )}
                  </div>
                </Link>
                {!isMe && user && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {interactive ? (
                      <>
                        <Link
                          to={`/trading?offerTo=${person.uid}&tab=send`}
                          title={`Offer ${person.displayName} an item`}
                          className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                        >
                          <Handshake className="h-3.5 w-3.5" /> Offer
                        </Link>
                        {giftFor === person.uid ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={giftAmount}
                              onChange={(e) => setGiftAmount(e.target.value)}
                              className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            <button
                              onClick={() => sendGift(person)}
                              disabled={gifting}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              {gifting ? "…" : "Send"}
                            </button>
                            <button
                              onClick={() => setGiftFor(null)}
                              className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setGiftFor(person.uid)}
                            disabled={(appUser?.coins ?? 0) < 1}
                            title={person.coins !== undefined ? `Gift CooperCoins (they have ${person.coins} CC)` : "Gift CooperCoins"}
                            className="flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-950/50 dark:text-amber-400 dark:hover:bg-amber-950"
                          >
                            <Gift className="h-3.5 w-3.5" /> Gift
                          </button>
                        )}
                      </>
                    ) : (
                      <Link
                        to="/payments"
                        title="Student plan unlocks gifting and trading"
                        className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      >
                        <Lock className="h-3.5 w-3.5" /> Upgrade to gift & trade
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
