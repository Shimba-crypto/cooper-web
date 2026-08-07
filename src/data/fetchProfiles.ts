import { get, onValue, ref } from "firebase/database";
import { db } from "../firebase";
import type { Profile } from "../types";

export function subscribeProfile(
  uid: string,
  onData: (profile: Profile | null) => void
): () => void {
  return onValue(ref(db, `profiles/${uid}`), (snapshot) => {
    const value = snapshot.val();
    onData(value ? ({ uid, ...value } as Profile) : null);
  });
}

export async function getProfiles(uids: string[]): Promise<Profile[]> {
  const results = await Promise.all(
    uids.map((uid) =>
      get(ref(db, `profiles/${uid}`))
        .then((snapshot) => snapshot.val() as Omit<Profile, "uid"> | null)
        .then((value) => (value ? { uid, ...value } : null))
    )
  );
  return results.filter((p): p is Profile => p !== null);
}
