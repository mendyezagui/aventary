"use client";

import { useRef, useState } from "react";

// "Ask a question" panel at the top of a client page.
//
// It used to be a bare input, on the reasoning that most readers want to read
// the document rather than chat with it. True, but it read as a search box, and
// a feature nobody recognises is a feature nobody uses. It now says what it is
// in one line and stays one line — available, still not in the way.
//
// The second sentence of that line is not decoration. Every question and the
// answer given are emailed to Mendy and kept in the admin section, and a reader
// is entitled to know that before they type. Asking a client what is on their
// mind and quietly forwarding it is not a feature, it is a trick. If the
// notification ever goes away, this sentence goes with it.

type Turn = { role: "user" | "assistant"; content: string };

export function AskPanel({ slug, title }: { slug: string; title: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;

    const next: Turn[] = [...turns, { role: "user", content: question }];
    setTurns([...next, { role: "assistant", content: "" }]);
    setDraft("");
    setBusy(true);

    try {
      // Not /api/c/... — the session cookie is scoped to path=/c/<slug>, so a
      // request outside that path arrives with no cookie and is rejected as
      // signed-out. The endpoint lives under the page for that reason.
      const res = await fetch(`/c/${slug}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next })
      });

      if (!res.ok || !res.body) {
        const fallback =
          res.status === 401
            ? "Your session expired. Reload the page and sign in again."
            : "Something went wrong. Try again, or email Mendy.";
        setTurns([...next, { role: "assistant", content: fallback }]);
        return;
      }

      // Stream the answer in as it arrives rather than waiting for the whole thing.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setTurns([...next, { role: "assistant", content: answer }]);
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
      }
    } catch {
      setTurns([...next, { role: "assistant", content: "Connection lost. Try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cp-ask" aria-label={`Ask a question about ${title}`}>
      <div className="cp-ask-inner">
        {turns.length > 0 && (
          <div className="cp-ask-log" ref={logRef}>
            {turns.map((t, i) => (
              <p key={i} className={t.role === "user" ? "cp-ask-q" : "cp-ask-a"}>
                {t.content || (busy ? "…" : "")}
              </p>
            ))}
          </div>
        )}
        {turns.length === 0 && (
          <p className="cp-ask-lede">
            <strong>Ask anything about this document.</strong> You get an answer drawn
            only from what is written here — never a number or a date that is not in it.
            Questions and answers go to Mendy, so anything it cannot settle, he sees.
          </p>
        )}
        <form onSubmit={ask} className="cp-ask-form">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question about this proposal…"
            aria-label="Your question"
            disabled={busy}
            maxLength={1200}
          />
          <button type="submit" disabled={busy || !draft.trim()}>
            {busy ? "Thinking…" : "Ask"}
          </button>
        </form>
        <p className="cp-ask-note">
          Answers come only from this document, and Mendy sees every exchange.
        </p>
      </div>
    </section>
  );
}
