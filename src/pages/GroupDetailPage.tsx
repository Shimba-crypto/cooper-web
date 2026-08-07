import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import GroupChat from "../components/GroupChat";
import type { Group, GroupMember, QuizResult } from "../types";

interface MemberRow {
  uid: string;
  member: GroupMember;
  results: Record<string, QuizResult> | null;
}

export default function GroupDetailPage() {
  const { gid } = useParams<{ gid: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [myInfo, setMyInfo] = useState<GroupMember | null>(null);
  const [rows, setRows] = useState<MemberRow[] | null>(null);

  useEffect(() => {
    if (!gid) return;
    const unsubGroup = onValue(ref(db, `groups/${gid}`), (snapshot) =>
      setGroup(snapshot.val() ?? null)
    );
    return unsubGroup;
  }, [gid]);

  useEffect(() => {
    if (!gid || !user) return;
    const unsubMember = onValue(ref(db, `groupMembers/${gid}/${user.uid}`), (snapshot) =>
      setMyInfo(snapshot.val() ?? null)
    );
    return unsubMember;
  }, [gid, user]);

  useEffect(() => {
    if (!gid) return;
    const unsubMembers = onValue(ref(db, `groupMembers/${gid}`), (snapshot) => {
      const value = snapshot.val() as Record<string, GroupMember> | null;
      if (!value) {
        setRows([]);
        return;
      }
      const memberList = Object.entries(value).map(([uid, member]) => ({
        uid,
        member,
        results: null as unknown as Record<string, QuizResult>,
      }));
      const unsubs = memberList.map((row) =>
        onValue(ref(db, `results/${row.uid}`), (resSnapshot) => {
          const results = resSnapshot.val() as Record<string, QuizResult> | null;
          setRows((prev) =>
            (prev ?? []).map((r) =>
              r.uid === row.uid ? { ...r, results: results ?? {} } : r
            )
          );
        })
      );
      setRows(memberList);
      return () => unsubs.forEach((u) => u());
    });
    return unsubMembers;
  }, [gid]);

  const isTeacher = myInfo?.role === "teacher" || group?.createdBy === user?.uid;

  const sorted = useMemo(() => {
    if (!rows) return null;
    const withResults = rows.filter((r) => r.results !== null);
    return [...withResults].sort((a, b) => {
      const aAttempts = Object.keys(a.results ?? {}).length;
      const bAttempts = Object.keys(b.results ?? {}).length;
      return bAttempts - aAttempts;
    });
  }, [rows]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log in required</h1>
        <Link to={`/login?next=/group/${gid}`} className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  if (group === undefined || sorted === null) return <Spinner label="Loading group…" />;

  if (group === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Group not found</h1>
        <Link to="/groups" className="btn-primary mt-6">Back to groups</Link>
      </div>
    );
  }

  const memberRows = sorted;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/groups" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> All groups
      </Link>

      <div className="card mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{group.name}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Created {new Date(group.createdAt).toLocaleDateString()} · join code{" "}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {group.joinCode}
              </span>
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
            <Users className="h-3.5 w-3.5" /> {memberRows.length} member{memberRows.length === 1 ? "" : "s"}
          </span>
        </div>
        {isTeacher && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
            You're a teacher in this group. Below are each member's quiz attempts.
          </p>
        )}
      </div>

      {memberRows.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No members yet. Share the join code above.
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {memberRows.map(({ uid, member, results }) => {
            const attempts = Object.values(results ?? {});
            const totalAttempts = attempts.length;
            const avgPct = totalAttempts
              ? Math.round(
                  (attempts.reduce((sum, r) => sum + (r.total ? (r.score / r.total) * 100 : 0), 0) / totalAttempts)
                )
              : 0;
            const bestPct = totalAttempts
              ? Math.round(Math.max(...attempts.map((r) => (r.total ? (r.score / r.total) * 100 : 0))))
              : 0;
            const isMe = uid === user.uid;
            return (
              <li
                key={uid}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    <span className="truncate">{member.displayName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${member.role === "teacher" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {member.role === "teacher" ? "Teacher" : "Student"}
                    </span>
                    {isMe && <span className="text-xs text-slate-400">(you)</span>}
                  </p>
                  {isTeacher ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {totalAttempts} quiz attempt{totalAttempts === 1 ? "" : "s"} · avg{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{avgPct}%</span>{" "}
                      · best <span className="font-semibold text-emerald-700 dark:text-emerald-400">{bestPct}%</span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {member.email ?? "Joined"} · {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {isTeacher && totalAttempts > 0 && (
                  <Link
                    to={`/profile/${uid}`}
                    className="btn-secondary !py-1 text-xs"
                  >
                    View profile
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <GroupChat
        gid={gid ?? ""}
        myInfo={myInfo}
        isTeacher={isTeacher}
      />
    </div>
  );
}
