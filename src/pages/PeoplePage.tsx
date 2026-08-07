import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import Avatar from "../components/Avatar";
import { API_URL } from "../config";
import type { PlanId } from "../types";

interface Person {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  role?: "user" | "admin";
  planId?: PlanId;
  bio?: string;
}

export default function PeoplePage() {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-emerald-600" />
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">People</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {people.length} {people.length === 1 ? "member" : "members"} of the CooperWeb community.
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
            return (
              <Link
                key={person.uid}
                to={`/profile/${person.uid}`}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <Avatar src={person.avatarUrl} name={person.displayName} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                    <span className="truncate">{person.displayName}</span>
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
            );
          })}
        </div>
      )}
    </div>
  );
}