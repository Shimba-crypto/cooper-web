import { API_URL } from "../config";
import { get, ref } from "firebase/database";
import { db } from "../firebase";

export interface NexasConfig {
  enabled: boolean;
  baseUrl: string;
  merchantId: string;
  merchantNumber: string;
  coinPrices: Record<string, number>;
  cc?: { ccPerNexa: number };
  plans: Record<string, number>;
  rate: number;
}

export interface NexasTx {
  id: string;
  type: string;
  coins: number;
  amountK?: number;
  rate?: number;
  memo?: string;
  at: string;
}

export interface NexasWallet {
  email: string;
  balance: number;
  coins?: number;
  history: NexasTx[];
  syncedAt?: number;
}

export interface NexasBuyResult {
  coins: number;
  received: number;
  rate: number;
  amountK: number;
  merchantNumber: string;
  merchantId: string;
  ref?: string;
  orderId?: string;
}

export interface NexasChargeResult {
  ok: boolean;
  balance?: number | null;
  charged?: number;
  planId?: string;
  needsTopUp?: boolean;
  error?: string;
}

export interface NexasProfile {
  username: string;
  email?: string;
  displayName?: string;
  error?: string;
}

const json = async <T>(res: Response): Promise<T> => {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
  return data as T;
};

export const nexasConfig = async (): Promise<NexasConfig | null> => {
  try {
    const r = await fetch(`${API_URL}/api/nexas/config`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
};

export const nexasFirebaseWallet = async (email: string): Promise<NexasWallet | null> => {
  try {
    const safeEmail = email.replace(/\./g, "_");
    const snap = await get(ref(db, `nexas/wallets/${safeEmail}`));
    const v = snap.val();
    if (!v) return null;
    return {
      email: v.email ?? email,
      balance: Number(v.balance) || 0,
      coins: Number(v.coins) || 0,
      history: Array.isArray(v.history) ? v.history : [],
      syncedAt: v.syncedAt,
    };
  } catch {
    return null;
  }
};

export const nexasFirebaseLedger = async (): Promise<any[] | null> => {
  try {
    const snap = await get(ref(db, "nexas/ledger"));
    const v = snap.val();
    if (!v) return null;
    return Object.values(v).filter((x: any) => x && typeof x === "object" && x.id);
  } catch {
    return null;
  }
};

export const nexasWallet = async (email: string): Promise<NexasWallet | null> => {
  try {
    const r = await fetch(`${API_URL}/api/nexas/wallet?email=${encodeURIComponent(email)}`);
    if (r.ok) return await r.json();
  } catch {
    /* fall through to the Firebase mirror */
  }
  return nexasFirebaseWallet(email);
};

export const nexasBuy = async (email: string, amountK: number): Promise<NexasBuyResult> => {
  const r = await fetch(`${API_URL}/api/nexas/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, amountK }),
  });
  return json<NexasBuyResult>(r);
};

export const nexasSell = async (email: string, coins: number): Promise<{ ok?: boolean; error?: string }> => {
  const r = await fetch(`${API_URL}/api/nexas/sell`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, coins }),
  });
  return json(r);
};

export const nexasCharge = async (uid: string, planId: string): Promise<NexasChargeResult> => {
  const r = await fetch(`${API_URL}/api/nexas/charge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, planId }),
  });
  const data = await json<any>(r).catch((e) => ({ error: e.message }));
  return {
    ok: Boolean(data?.ok),
    balance: data?.balance ?? null,
    charged: data?.charged,
    planId: data?.planId,
    needsTopUp: Boolean(data?.needsTopUp),
    error: data?.error,
  };
};

export const nexasTransfer = async (
  options: {
    uid: string;
    toEmail?: string;
    toUid?: string;
    coins: number;
    memo?: string;
  },
): Promise<{ ok?: boolean; error?: string; balance?: number }> => {
  const r = await fetch(`${API_URL}/api/nexas/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  return json(r);
};

export const nexasExchange = async (
  uid: string,
  direction: "in" | "out",
  amount: number,
): Promise<{ ok?: boolean; error?: string; balance?: number; sent?: number; receivedCc?: number; spentCc?: number }> => {
  try {
    const r = await fetch(`${API_URL}/api/nexas/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, direction, amount }),
    });
    const data = await r.json();
    if (!r.ok) return { ok: false, error: data?.error ?? "Exchange failed." };
    return data;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Exchange failed." };
  }
};

export const nexasRegisterProfile = async (
  uid: string,
  username: string,
): Promise<{ username?: string; error?: string }> => {
  const r = await fetch(`${API_URL}/api/nexas/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, username }),
  });
  return json(r);
};

export const nexasLookupUsername = async (username: string): Promise<NexasProfile> => {
  const r = await fetch(`${API_URL}/api/nexas/profile/lookup?username=${encodeURIComponent(username)}`);
  return json<NexasProfile>(r);
};

export const nexasSearchProfiles = async (q: string): Promise<NexasProfile[]> => {
  try {
    const r = await fetch(`${API_URL}/api/nexas/profiles/search?q=${encodeURIComponent(q)}`);
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : data?.results ?? [];
  } catch {
    return [];
  }
};

export const nexasNotifications = async (email: string): Promise<any[]> => {
  try {
    const r = await fetch(`${API_URL}/api/nexas/notifications?email=${encodeURIComponent(email)}`);
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : data?.notifications ?? [];
  } catch {
    return [];
  }
};

export const nexasMarkRead = async (email: string, id: string): Promise<boolean> => {
  try {
    const r = await fetch(`${API_URL}/api/nexas/notifications/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, id }),
    });
    return r.ok;
  } catch {
    return false;
  }
};

export const nexasPayQrUrl = (email: string, amount?: number, memo?: string): string => {
  const payload = JSON.stringify({
    v: 1,
    type: "pay",
    email,
    ...(amount ? { amount } : {}),
    ...(memo ? { memo } : {}),
    np: "nexas-pay",
  });
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
};