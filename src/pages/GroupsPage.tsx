import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Plus, Users } from "lucide-react";
import { onValue, ref, remove, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import { useConfirmDialog } from "../components/ConfirmDialog";
import type { Group } from "../types";

function makeJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function GroupsPage() {
  const { user, appUser } = useAuth();
  const [groups, setGroups] = useState<Record<string, Group> | null>(null);
  const [myGroupIds, setMyGroupIds] = useState<Record<string, { role: string }> | null>(null);
  const [members, setMembers] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { askConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    if (!user) return;
    const unsubGroups = onValue(ref(db, "groups"), (snapshot) =>
      setGroups(snapshot.val() ?? {})
    );
    const unsubMine = onValue(ref(db, `myGroups/${user.uid}`), (snapshot) =>
      setMyGroupIds(snapshot.val() ?? {})
    );
    return () => {
      unsubGroups();
      unsubMine();
    };
  }, [user]);

  useEffect(() => {
    if (!groups || !myGroupIds) return;
    const ids = Object.keys(myGroupIds);
    if (ids.length === 0) {
      setMembers({});
      return;
    }
    const unsubs = ids.map((gid) =>
      onValue(ref(db, `groupMembers/${gid}`), (snapshot) => {
        const value = snapshot.val();
        setMembers((prev) => ({ ...prev, [gid]: value ? Object.keys(value).length : 0 }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [groups, myGroupIds]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <GraduationCap className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Log in required</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Log in to create or join school groups.
        </p>
        <Link to="/login?next=/groups" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  const createGroup = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const gid = `g-${Date.now()}`;
      const group: Group = {
        id: gid,
        name: name.trim(),
        createdBy: user.uid,
        joinCode: makeJoinCode(),
        createdAt: Date.now(),
      };
      await set(ref(db, `groups/${gid}`), group);
      await set(ref(db, `myGroups/${user.uid}/${gid}`), { role: "teacher", joinedAt: Date.now() });
      await set(ref(db, `groupMembers/${gid}/${user.uid}`), {
        displayName: appUser?.displayName ?? user.email?.split("@")[0] ?? "Teacher",
        email: user.email,
        role: "teacher",
        joinedAt: Date.now(),
      });
      setMessage(`Group created! Share the join code: ${group.joinCode}`);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group.");
    }
    setBusy(false);
  };

  const joinGroup = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!groups) throw new Error("Groups still loading.");
      const code = joinCode.trim().toUpperCase();
      const match = Object.values(groups).find((g) => g.joinCode === code);
      if (!match) throw new Error("No group found with that code. Check with your teacher.");
      const gid = match.id;
      const uid = user.uid;
      if (match.createdBy === uid || (myGroupIds?.[gid])) {
        throw new Error("You're already in this group.");
      }
      await set(ref(db, `groupMembers/${gid}/${uid}`), {
        displayName: appUser?.displayName ?? user.email?.split("@")[0] ?? "Student",
        email: user.email,
        role: "student",
        joinedAt: Date.now(),
      });
      await set(ref(db, `myGroups/${uid}/${gid}`), { role: "student", joinedAt: Date.now() });
      setMessage(`You joined "${match.name}"!`);
      setJoinCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join group.");
    }
    setBusy(false);
  };

  const leaveGroup = async (g: Group) => {
    const confirmed = await askConfirm({
      title: "Leave group?",
      message: `Leave "${g.name}"? You can rejoin later with the code.`,
      confirmLabel: "Leave",
      danger: true,
    });
    if (!confirmed || !user) return;
    await remove(ref(db, `myGroups/${user.uid}/${g.id}`));
    await remove(ref(db, `groupMembers/${g.id}/${user.uid}`));
  };

  if (!groups || !myGroupIds) return <Spinner label="Loading groups…" />;

  const myGroups = Object.entries(myGroupIds)
    .map(([gid, info]) => ({ group: groups[gid], role: info.role }))
    .filter((x) => x.group);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {confirmDialog}
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-emerald-600" />
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">School Groups</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create a class group or join one with a code. Teachers see their students' quiz scores.
          </p>
        </div>
      </div>

      {message && (
        <p role="status" className="mt-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <form onSubmit={createGroup} className="card h-fit p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Plus className="h-5 w-5 text-emerald-600" /> Create a group
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            For teachers or study groups. You'll get a join code to share.
          </p>
          <label className="mt-4 block">
            <span className="label">Group name</span>
            <input
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grade 7A — Mathematics"
            />
          </label>
          <button type="submit" disabled={busy} className="btn-primary mt-4 disabled:opacity-60">
            Create group
          </button>
        </form>

        <form onSubmit={joinGroup} className="card h-fit p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <GraduationCap className="h-5 w-5 text-emerald-600" /> Join with a code
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Ask your teacher for the 6-letter group code.
          </p>
          <label className="mt-4 block">
            <span className="label">Group code</span>
            <input
              className="input font-mono uppercase"
              required
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
            />
          </label>
          <button type="submit" disabled={busy} className="btn-primary mt-4 disabled:opacity-60">
            Join group
          </button>
        </form>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          My groups ({myGroups.length})
        </h2>
        {myGroups.length === 0 ? (
          <div className="card mt-4 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            You're not in any group yet.
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {myGroups.map(({ group, role }) => (
              <li
                key={group.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
              >
                <Link to={`/group/${group.id}`} className="min-w-0">
                  <p className="truncate font-semibold text-slate-800 dark:text-slate-200">
                    {group.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {role === "teacher" ? "Teacher" : "Member"} · {members[group.id] ?? 0} members
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Link to={`/group/${group.id}`} className="btn-secondary !py-1 text-xs">
                    Open
                  </Link>
                  <button
                    onClick={() => leaveGroup(group)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-100 dark:hover:bg-red-950"
                  >
                    Leave
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
