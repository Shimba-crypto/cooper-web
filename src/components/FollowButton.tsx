import { useEffect, useState } from "react";
import { onValue, ref, remove, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function FollowButton({ targetUid }: { targetUid: string }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onValue(ref(db, `following/${user.uid}/${targetUid}`), (snapshot) =>
      setFollowing(snapshot.exists())
    );
    return unsubscribe;
  }, [user, targetUid]);

  if (!user || user.uid === targetUid) return null;

  const toggle = async () => {
    setBusy(true);
    const followerRef = ref(db, `following/${user.uid}/${targetUid}`);
    const targetRef = ref(db, `followers/${targetUid}/${user.uid}`);
    if (following) {
      await remove(followerRef);
      await remove(targetRef);
    } else {
      const timestamp = Date.now();
      await set(followerRef, { followedAt: timestamp });
      await set(targetRef, { followedAt: timestamp });
    }
    setBusy(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
      className={following ? "btn-secondary disabled:opacity-60" : "btn-primary disabled:opacity-60"}
    >
      {following ? "Following" : "Follow"}
      {busy && "…"}
    </button>
  );
}
