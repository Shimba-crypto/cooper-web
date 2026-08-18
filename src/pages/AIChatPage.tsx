import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, RefreshCcw, Send } from "lucide-react";
import { onValue, push, ref, remove } from "firebase/database";
import { db } from "../firebase";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { hasInteractiveAccess } from "../utils/plans";
import UpgradeGate from "../components/UpgradeGate";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StoredMessage extends ChatMessage {
  createdAt: number;
}

const SYSTEM_PROMPT: ChatMessage = {
  role: "system",
  content:
    "You are CooperWeb AI, the friendly AI tutor on CooperWeb, a Zambian revision site for ECZ Grade 7 students. " +
    "Answer in simple, clear English, and explain step by step like a patient teacher. " +
    "Keep answers focused and reasonably short, and when asked for help with schoolwork, work through the answer " +
    "rather than giving it away straight off. " +
    "You have tools to look up the student's own progress, the quiz list, study notes, past papers and the " +
    "leaderboard — use them whenever the student asks about their results, quizzes, notes, papers or rankings, " +
    "and mention what you found.",
};

const SUGGESTIONS = [
  "Explain photosynthesis in simple words",
  "How do I solve long division step by step?",
  "Give me 5 revision tips for my Grade 7 exams",
  "What is a noun? Give examples",
];

export default function AIChatPage() {
  const { user, planId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef(false);

  // Restore the conversation from the database so history survives reloads.
  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `aiChats/${user.uid}/messages`), (snap) => {
      if (streamingRef.current) return;
      const val = (snap.val() ?? {}) as Record<string, StoredMessage>;
      const list: StoredMessage[] = Object.values(val)
        .filter((m): m is StoredMessage => !!m && typeof m.content === "string")
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
      setMessages(list.map(({ role, content }) => ({ role, content })));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log in required</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          AI Chat is a Student Plus feature. Log in to start chatting with CooperWeb AI.
        </p>
        <Link to="/login?next=/ai-chat" className="btn-primary mt-6">Log in</Link>
      </div>
    );
  }

  if (!hasInteractiveAccess(planId)) {
    return <UpgradeGate title="AI Chat is a Student Plus feature" />;
  }

  const clearChat = () => {
    if (streaming || !user) return;
    remove(ref(db, `aiChats/${user.uid}/messages`)).catch(() => {});
    setMessages([]);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming || !user) return;
    const history: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(history);
    setInput("");
    setError(null);
    setStreaming(true);
    streamingRef.current = true;
    push(ref(db, `aiChats/${user.uid}/messages`), {
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    }).catch(() => {});
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: [SYSTEM_PROMPT, ...history].slice(-30) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "The AI is not available right now. Try again in a moment.");
        setStreaming(false);
        streamingRef.current = false;
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";
      setMessages([...history, { role: "assistant", content: "" }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data:")) continue;
          const payload = trimmedLine.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              reply += delta;
              setMessages([...history, { role: "assistant", content: reply }]);
            }
          } catch {
            // partial JSON line mid-stream — ignore and keep reading
          }
        }
      }
      if (reply) {
        push(ref(db, `aiChats/${user.uid}/messages`), {
          role: "assistant",
          content: reply,
          createdAt: Date.now(),
        }).catch(() => {});
      }
    } catch {
      setError("Could not reach the AI. Check your connection and try again.");
    } finally {
      setStreaming(false);
      streamingRef.current = false;
    }
  };

  const lastAssistant = messages[messages.length - 1];
  const thinking = streaming && (!lastAssistant || lastAssistant.role === "user");

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-600 p-2.5 text-white shadow-sm">
          <Bot className="h-6 w-6" aria-hidden />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">CooperWeb AI</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your ECZ Grade 7 tutor — ask anything
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            disabled={streaming}
            title="Start a new chat"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden />
            New chat
          </button>
        )}
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        {messages.length === 0 && !streaming && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Bot className="h-12 w-12 text-emerald-600" aria-hidden />
            <p className="max-w-sm text-slate-600 dark:text-slate-400">
              Hi! I'm CooperWeb AI. Ask me about maths, science, English or any subject you're
              revising for Grade 7.
            </p>
            <div className="grid w-full max-w-md gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-emerald-400"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-md bg-emerald-600 text-white"
                  : "rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {m.content || "\u00A0"}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
              </span>
              CooperWeb AI is thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={streaming ? "CooperWeb AI is replying…" : "Ask CooperWeb AI anything…"}
          disabled={streaming}
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="btn-primary !px-4"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
      <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
        AI answers are generated — always check them against your notes and past papers.
      </p>
    </div>
  );
}