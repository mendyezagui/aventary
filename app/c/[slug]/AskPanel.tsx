"use client";

import { useRef, useState } from "react";

// "Ask a question" panel at the top of a client page. Collapsed to a single
// line until used, because most readers want to read the document, not chat
// with it — it should be available, not in the way.

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
      const res = await fetch(`/api/c/${slug}/ask`, {
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
          Answers come only from this document. Anything it doesn&rsquo;t cover goes to Mendy.
        </p>
      </div>
    </section>
  );
}
