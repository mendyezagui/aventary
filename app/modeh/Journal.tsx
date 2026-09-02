"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CLOSING, STATION_LABELS } from "./blessings";
import {
  INTENTION,
  deleteEntry,
  englishDateLabel,
  getJournal,
  getSettings,
  stats,
  type Entry,
} from "./store";
import { applyTheme } from "./theme";

export default function Journal() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    applyTheme(getSettings().theme);
    setEntries(getJournal());
    setReady(true);
  }, []);

  const st = useMemo(() => stats(entries), [entries]);

  function remove(date: string) {
    setEntries(deleteEntry(date));
    setConfirming(null);
  }

  return (
    <div className="wrap">
      <Link className="backlink" href="/modeh">
        <span aria-hidden>←</span> Morning
      </Link>

      <header className="head">
        <div className="head-l">
          <p className="greet">Kept on this device</p>
          <h1 className="brand">Journal</h1>
          <p className="dateline">
            {ready
              ? `${st.total} morning${st.total === 1 ? "" : "s"}${
                  st.streak > 0 ? ` · ${st.streak} in a row` : ""
                }`
              : " "}
          </p>
        </div>
      </header>

      {ready && entries.length === 0 && (
        <p className="empty">
          Nothing yet. Anything you write during a sit lands here, dated, so you
          can read back what you were grateful for a month ago.
          <br />
          <br />
          <Link className="card-link" href="/modeh/session">
            Start this morning →
          </Link>
        </p>
      )}

      {entries.map((e) => {
        const keys = Object.keys(e.notes);
        return (
          <article className="entry" key={e.date}>
            <div className="entry-h">
              <h2 className="entry-d">{englishDateLabel(e.date)}</h2>
              <span className="entry-meta">
                {e.completed
                  ? `${e.stations || "—"} blessings`
                  : "not finished"}
              </span>
            </div>
            {e.hebrew && <p className="entry-heb">{e.hebrew}</p>}

            {keys.length === 0 ? (
              <p className="card-p">Sat with it, wrote nothing.</p>
            ) : (
              keys.map((k) => (
                <blockquote className="quote" key={k}>
                  {e.notes[k]}
                  <cite>
                    {k === INTENTION ? CLOSING.title : STATION_LABELS[k]?.title || k}
                  </cite>
                </blockquote>
              ))
            )}

            {confirming === e.date ? (
              <p className="note-hint" style={{ marginTop: 12 }}>
                Delete this morning?{" "}
                <button className="del" type="button" onClick={() => remove(e.date)}>
                  yes, delete
                </button>{" "}
                ·{" "}
                <button className="del" type="button" onClick={() => setConfirming(null)}>
                  keep it
                </button>
              </p>
            ) : (
              <button
                className="del"
                type="button"
                onClick={() => setConfirming(e.date)}
              >
                Delete
              </button>
            )}
          </article>
        );
      })}

      {ready && entries.length > 0 && (
        <p className="foot">
          Stored in this browser only. Clearing site data — or switching phones —
          clears the journal with it.
        </p>
      )}
    </div>
  );
}
