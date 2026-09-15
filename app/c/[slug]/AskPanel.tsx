"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { splitAnswer, type Anchor } from "@/lib/doc-anchors";
import { revealAnchor } from "./reveal";

// "Ask" on a client page: a button pinned to the right-hand edge, and a rail
// that opens beside the document.
//
// It began as a bar across the top of the page, which was wrong in two ways.
// Somebody reads a proposal by scrolling, and a question occurs to them at the
// paragraph that prompted it — by which point a bar at the top is long gone, so
// the feature was only really available to a reader who had not started yet.
// And the document is the thing they came for; a permanent strip above it is
// the widget insisting on going first. Pinned to the edge it costs nothing
// until it is wanted, and it is wanted from wherever they happen to be.
//
// Every answer ends with a link to the passage it came from. That is the part
// worth protecting: an answer about a proposal is a claim about a document the
// reader is holding, and "here is where I got that" is what separates it from a
// chatbot they have no reason to believe. The link only appears when the model
// names a section that genuinely exists in the document (see `cited` below) —
// an invented citation would be worse than none.
//
// The one line of small print stays, wherever this sits. Every question and the
// answer given are emailed to Mendy and kept in the admin section, and a reader
// is entitled to know that before they type. If the notification ever goes
// away, that line goes with it.

type Turn = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["What does this cost?", "How long does it take?", "What do you need from us?"];

/**
 * Below this the rail overlays the document instead of the document making room
 * for it, so following a citation has to close the rail to show anything.
 *
 * It must match the `min-width` of the `html.cp-rail-open` rule in
 * client-page.css. Out of step by a few hundred pixels and there is a band of
 * screen widths where "Read more here" scrolls to a passage the rail is sitting
 * on top of, which is the one thing this feature must not do.
 */
const RAIL_FITS_BESIDE = 1100;

export function AskPanel({
  slug,
  title,
  anchors
}: {
  slug: string;
  title: string;
  anchors: Anchor[];
}) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const labels = new Map(anchors.map((a) => [a.id, a.label]));

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Wide screens make room for the rail instead of letting it cover the
  // document; the width at which that is affordable is a question for the
  // stylesheet, so all this does is say whether the rail is open. Narrow
  // screens keep the overlay and close on a citation instead.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("cp-rail-open", open);
    return () => root.classList.remove("cp-rail-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns]);

  // Jump first, and only give up the rail if the jump actually landed. A
  // narrow screen has to close it — the rail is over the document there, so
  // leaving it open is sending the reader nowhere — but closing it for a jump
  // that went nowhere costs them the conversation for nothing. Wide enough and
  // the document is beside the rail, so it stays: read the passage, ask the
  // follow-up, without reopening anything.
  const reveal = useCallback((id: string) => {
    if (!revealAnchor(id)) return;
    if (window.innerWidth < RAIL_FITS_BESIDE) setOpen(false);
  }, []);

  const send = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || busy) return;

      const next: Turn[] = [...turns, { role: "user", content: q }];
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
        }
      } catch {
        setTurns([...next, { role: "assistant", content: "Connection lost. Try again." }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, slug, turns]
  );

  return (
    <>
      {/* Opens only. The rail slides over this corner, so a button that also
          closed would spend that half of its life underneath what it closes —
          the rail carries its own ×, and Escape works from anywhere. */}
      <button
        type="button"
        className={`cp-ask-launcher${open ? " is-hidden" : ""}`}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="cp-ask-rail"
        aria-label={`Ask a question about ${title}`}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
          <path
            d="M4 5h16v11H9l-5 4V5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        <span>Ask</span>
      </button>

      <section
        id="cp-ask-rail"
        className={`cp-ask-rail${open ? " is-open" : ""}`}
        aria-label={`Ask a question about ${title}`}
        // Kept mounted so the conversation survives closing and reopening the
        // rail. `inert` is what takes it out of the tab order and the
        // accessibility tree while it is shut — display:none would throw the
        // scroll position away, and aria-hidden alone would leave a closed
        // rail's input reachable by keyboard.
        inert={!open}
      >
        <header className="cp-ask-head">
          <div>
            <p className="cp-ask-eyebrow">Ask about this document</p>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="cp-ask-x">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="cp-ask-log" ref={logRef}>
          {turns.length === 0 ? (
            <div className="cp-ask-empty">
              <p>
                Answers come only from this document — and each one links back to the passage it
                came from.
              </p>
              <div className="cp-ask-chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} disabled={busy}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((t, i) => {
              if (t.role === "user") {
                return (
                  <p key={i} className="cp-ask-q">
                    {t.content}
                  </p>
                );
              }
              const { text, cited } = splitAnswer(t.content);
              const label = cited ? labels.get(cited) : undefined;
              return (
                <div key={i} className="cp-ask-turn">
                  <p className="cp-ask-a">{text || (busy ? "…" : "")}</p>
                  {/* Only when the model named a section the document actually
                      has. An id it invented resolves to nothing here and the
                      reader is simply not offered a link. */}
                  {label && cited ? (
                    <button type="button" className="cp-ask-cite" onClick={() => reveal(cited)}>
                      <span>
                        Read more here <span aria-hidden="true">→</span>
                      </span>
                      <em>{label}</em>
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <form
          className="cp-ask-form"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <input
            ref={inputRef}
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

        <p className="cp-ask-note">Answers come only from this document, and Mendy sees every exchange.</p>
      </section>
    </>
  );
}
