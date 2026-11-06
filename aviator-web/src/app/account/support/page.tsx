"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MobileShell } from "@/components/layout/MobileShell";
import { useFirebaseUser } from "@/hooks/useFirebaseUser";
import {
  fetchMySupportChat,
  sendSupportMessage,
  type SupportMessage,
} from "@/lib/api";

const POLL_MS = 2500;

export default function SupportChatPage() {
  const router = useRouter();
  const { user, ready } = useFirebaseUser();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef(0);
  const initializedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const mergeMessages = useCallback((incoming: SupportMessage[], replace = false) => {
    if (replace) {
      setMessages(incoming);
      lastIdRef.current = incoming.length ? incoming[incoming.length - 1]!.id : 0;
      return;
    }
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev];
      for (const m of incoming) {
        if (!seen.has(m.id)) next.push(m);
      }
      next.sort((a, b) => a.id - b.id);
      lastIdRef.current = next.length ? next[next.length - 1]!.id : 0;
      return next;
    });
  }, []);

  const loadChat = useCallback(
    async (incremental: boolean) => {
      try {
        const afterId = incremental && lastIdRef.current > 0 ? lastIdRef.current : undefined;
        const data = await fetchMySupportChat(afterId);
        mergeMessages(data.messages, !incremental);
        setError(null);
        if (!incremental || data.messages.length) scrollToBottom();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load chat");
      } finally {
        setLoading(false);
      }
    },
    [mergeMessages, scrollToBottom],
  );

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;
    void loadChat(false);
  }, [ready, user, router, loadChat]);

  useEffect(() => {
    if (!ready || !user) return;
    const timer = window.setInterval(() => {
      void loadChat(true);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [ready, user, loadChat]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    try {
      setSending(true);
      setError(null);
      const res = await sendSupportMessage(text);
      setDraft("");
      mergeMessages([res.message]);
      scrollToBottom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <MobileShell showTab={false} scroll={false}>
      <div className="flex h-full min-h-0 flex-col bg-zinc-50">
        <div className="flex h-14 shrink-0 items-center gap-3 bg-white px-4 shadow-sm">
          <button type="button" onClick={() => router.back()} className="text-2xl text-zinc-500">
            ‹
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-zinc-900">Customer Support</h1>
            <p className="truncate text-xs font-medium text-zinc-500">Usually replies within a few minutes</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="py-10 text-center text-sm font-semibold text-zinc-400">Opening chat…</div>
          ) : null}

          {!loading && messages.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-6 text-center shadow-sm ring-1 ring-zinc-200/70">
              <div className="text-sm font-extrabold text-zinc-900">How can we help?</div>
              <p className="mt-1 text-xs font-medium text-zinc-500">
                Send a message and our support team will reply here.
              </p>
            </div>
          ) : null}

          {messages.map((m) => {
            const mine = m.sender === "user";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm font-medium shadow-sm ${
                    mine
                      ? "rounded-br-md bg-rose-500 text-white"
                      : "rounded-bl-md bg-white text-zinc-800 ring-1 ring-zinc-200/80"
                  }`}
                >
                  {!mine ? <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-rose-500">Support</div> : null}
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  <div className={`mt-1 text-[10px] font-semibold ${mine ? "text-white/70" : "text-zinc-400"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error ? (
          <div className="mx-4 mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSend} className="shrink-0 border-t border-zinc-200 bg-white p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={1}
              placeholder="Type your message…"
              maxLength={2000}
              className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-rose-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSend(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-lg text-white shadow-sm active:scale-[0.98] disabled:opacity-50"
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </form>
      </div>
    </MobileShell>
  );
}
