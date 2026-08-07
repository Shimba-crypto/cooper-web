import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Pin, Send, Trash2 } from "lucide-react";
import { onValue, ref, remove, set } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import Spinner from "./Spinner";
import { useConfirmDialog } from "./ConfirmDialog";
import type { GroupMember } from "../types";

interface ChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  pinned?: boolean;
  createdAt: number;
}

export default function GroupChat({
  gid,
  myInfo,
  isTeacher,
}: {
  gid: string;
  myInfo: GroupMember | null;
  isTeacher: boolean;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { askConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    if (!gid) return;
    const unsub = onValue(ref(db, `groupChat/${gid}/messages`), (snap) => {
      const val = snap.val() as Record<string, Omit<ChatMessage, "id">> | null;
      setMessages(
        val
          ? Object.entries(val)
              .map(([id, m]) => ({ id, ...m }))
              .sort((a, b) => b.createdAt - a.createdAt)
          : []
      );
    });
    return unsub;
  }, [gid]);

  useEffect(() => {
    if (messages && messages.length > 0 && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  if (!user) return null;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await set(ref(db, `groupChat/${gid}/messages/${id}`), {
      senderUid: user.uid,
      senderName: myInfo?.displayName ?? user.email?.split("@")[0] ?? "Member",
      text: trimmed,
      createdAt: Date.now(),
    });
    setText("");
    setSending(false);
  };

  const togglePin = async (m: ChatMessage) => {
    await set(ref(db, `groupChat/${gid}/messages/${m.id}/pinned`), !m.pinned);
  };

  const deleteMessage = async (m: ChatMessage) => {
    const confirmed = await askConfirm({
      title: "Delete message?",
      message: "Delete this message permanently?",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    await remove(ref(db, `groupChat/${gid}/messages/${m.id}`));
  };

  return (
    <div className="card mt-6 flex flex-col">
      {confirmDialog}
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <MessageCircle className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Discussion</h2>
      </div>

      <div ref={listRef} className="flex max-h-96 flex-col gap-3 overflow-y-auto px-4 py-4">
        {!messages ? (
          <Spinner label="Loading messages…" />
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No messages yet. Start the discussion!
          </p>
        ) : (
          messages.map((m) => {
            const isMe = m.senderUid === user.uid;
            return (
              <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <Link to={`/profile/${m.senderUid}`} className="shrink-0">
                  <Avatar name={m.senderName} size={32} />
                </Link>
                <div className={`max-w-[75%] ${isMe ? "items-end" : ""}`}>
                  <div className={`flex items-baseline gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {m.senderName}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div
                    className={`mt-0.5 rounded-2xl px-3 py-2 text-sm ${
                      isMe
                        ? "rounded-tr-sm bg-emerald-600 text-white"
                        : "rounded-tl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {m.text}
                    {m.pinned && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-semibold opacity-80">
                        <Pin className="h-3 w-3" /> pinned
                      </span>
                    )}
                  </div>
                  {(isTeacher || isMe) && (
                    <div className={`mt-1 flex gap-1 ${isMe ? "justify-end" : ""}`}>
                      {isTeacher && (
                        <button
                          onClick={() => togglePin(m)}
                          aria-label={m.pinned ? "Unpin message" : "Pin message"}
                          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
                        >
                          <Pin className={`h-3.5 w-3.5 ${m.pinned ? "fill-emerald-500 text-emerald-500" : ""}`} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMessage(m)}
                        aria-label="Delete message"
                        className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <input
          className="input"
          placeholder={`Message as ${myInfo?.displayName ?? "member"}…`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Send message"
          className="rounded-lg bg-emerald-600 p-2 text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
