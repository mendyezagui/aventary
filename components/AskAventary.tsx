"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
type Msg = { id: number; role: Role; content: string; intro?: boolean };

const GREETING =
  "Hi — I'm Ask Aventary. I can explain what Aventary does, the Method, or the free diagnostic, and point you to the right next step. What are you working on?";

const SUGGESTIONS = [
  "What does Aventary actually do?",
  "Where should I start?",
  "How does the diagnostic work?"
];

// Internal paths + email we linkify in assistant replies.
const LINKABLE =
  /(\/(?:diagnostic|diagnostics|method|lead-to-opp|command|intelligence|insights|appointments|contact)\b|hello@aventary\.com)/g;

function Rich({ text }: { text: string }) {
  const parts = text.split(LINKABLE);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 1) {
          if (p.startsWith("/")) {
            return (
              <Link key={i} href={p} className="text-accent underline underline-offset-2">
                {p}
              </Link>
            );
          }
          return (
            <a key={i} href={`mailto:${p}`} className="text-accent underline underline-offset-2">
              {p}
            </a>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export default function AskAventary() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, role: "assistant", content: GREETING, intro: true }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");

    const userMsg: Msg = { id: idRef.current++, role: "user", content: q };
    const botMsg: Msg = { id: idRef.current++, role: "assistant", content: "" };
    const history = [...messages, userMsg];
    setMessages([...history, botMsg]);
    setBusy(true);

    // Only real turns go to the model (skip the display-only greeting).
    const payload = history
      .filter((m) => !m.intro)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload })
      });

      if (!res.ok && res.status !== 200) {
        const msg = await res.text();
        setMessages((prev) =>
          prev.map((m) => (m.id === botMsg.id ? { ...m, content: msg || "Something went wrong." } : m))
        );
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        const msg = await res.text();
        setMessages((prev) => prev.map((m) => (m.id === botMsg.id ? { ...m, content: msg } : m)));
        return;
      }
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => (m.id === botMsg.id ? { ...m, content: acc } : m)));
      }
      if (!acc.trim()) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsg.id
              ? { ...m, content: "Sorry — nothing came back. Try again, or book a call at /appointments." }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsg.id
            ? { ...m, content: "I couldn't reach the server. Try again in a moment, or book a call at /appointments." }
            : m
        )
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Ask Aventary" : "Open Ask Aventary"}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-ink text-primary shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
      >
        <span className="material-symbols-outlined text-[26px]">
          {open ? "close" : "chat_bubble"}
        </span>
      </button>

      {/* Panel */}
      {open ? (
        <div
          role="dialog"
          aria-label="Ask Aventary"
          className="fixed bottom-24 right-6 z-50 w-[min(400px,calc(100vw-3rem))] h-[min(560px,calc(100vh-8rem))] flex flex-col rounded-3xl overflow-hidden border border-outline-variant/60 bg-surface-container-lowest shadow-2xl"
        >
          {/* Header */}
          <div className="bg-ink text-inverse-on-surface px-5 py-4 flex items-center gap-2.5 shrink-0">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#C9A66B" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3.5 L19.5 20.5 L4.5 20.5 Z" />
              <path d="M12 3.5 L12 13.5" />
            </svg>
            <div className="leading-tight">
              <div className="font-label text-sm font-semibold tracking-[0.16em] uppercase">Ask Aventary</div>
              <div className="text-white/45 text-[11px]">RevOps · AI · the Method</div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto bg-ink text-inverse-on-surface"
                    : "mr-auto bg-surface-container-high text-on-surface"
                }`}
              >
                {m.role === "assistant" ? <Rich text={m.content || "…"} /> : m.content}
              </div>
            ))}

            {messages.length === 1 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs text-on-surface-variant border border-outline-variant/70 rounded-full px-3 py-1.5 hover:border-primary/60 hover:text-on-surface transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-outline-variant/50 p-3 flex items-end gap-2 shrink-0"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask about Aventary…"
              className="flex-1 resize-none max-h-28 bg-surface border border-outline-variant rounded-2xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="h-10 w-10 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">
                {busy ? "more_horiz" : "arrow_upward"}
              </span>
            </button>
          </form>

          <div className="px-4 pb-3 -mt-1 text-[10px] text-on-surface-variant/70 text-center shrink-0">
            AI answers may be imperfect. For anything specific,{" "}
            <Link href="/appointments" className="underline">
              book a working session
            </Link>
            .
          </div>
        </div>
      ) : null}
    </>
  );
}
