"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { buildStations, CLOSING, type Station } from "./blessings";
import {
  DEFAULT_SETTINGS,
  INTENTION,
  getEntry,
  getSettings,
  hebrewDateLabel,
  setNote,
  upsertEntry,
  type Settings,
} from "./store";
import { applyTheme } from "./theme";

export default function Session() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [stations, setStations] = useState<Station[]>([]);
  const [i, setI] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const startedAt = useRef(Date.now());

  // Settings are read once, at the start of the sit: changing the length
  // half-way through would renumber the stations under the reader's feet.
  useEffect(() => {
    const s = getSettings();
    setSettings(s);
    applyTheme(s.theme);
    setStations(
      buildStations(
        { voice: s.voice, form: s.form, nameStyle: s.nameStyle },
        s.length,
        s.longForm
      )
    );
    setNotes(getEntry()?.notes || {});
    startedAt.current = Date.now();
    setReady(true);
  }, []);

  // Keep the screen awake — this is read from a propped-up phone, hands busy.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        const wl = (navigator as Navigator & {
          wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
        }).wakeLock;
        if (!wl) return;
        const l = await wl.request("screen");
        if (cancelled) void l.release();
        else lock = l;
      } catch {
        /* denied or unsupported — not worth mentioning to the user */
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  const total = stations.length;
  const atClosing = i >= total;
  const station = atClosing ? undefined : stations[i];

  const go = useCallback(
    (n: number) => {
      setI((cur) => {
        const next = Math.max(0, Math.min(total, cur + n));
        return next;
      });
    },
    [total]
  );

  // New station: back to the top, so the Hebrew is always the first thing.
  useEffect(() => {
    if (!ready) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [i, ready]);

  // Arrow keys, as long as the reader isn't in the middle of writing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && /^(TEXTAREA|INPUT)$/.test(el.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        go(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Horizontal swipe on the stage.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.6) go(dx < 0 ? 1 : -1);
  };

  function writeNote(id: string, text: string) {
    setNotes((n) => ({ ...n, [id]: text }));
    setNote(id, text);
    if (!getEntry()?.hebrew) upsertEntry({ hebrew: hebrewDateLabel() });
  }

  function finish() {
    upsertEntry({
      completed: true,
      seconds: Math.round((Date.now() - startedAt.current) / 1000),
      stations: total,
      hebrew: hebrewDateLabel(),
    });
    setSaved(true);
  }

  const written = useMemo(
    () =>
      stations
        .filter((s) => s.prompt && notes[s.id]?.trim())
        .map((s) => ({ q: s.title, a: notes[s.id] })),
    [stations, notes]
  );

  if (!ready) return <div className="session" />;

  const pct = total === 0 ? 0 : Math.round(((atClosing ? total : i) / total) * 100);

  return (
    <div className="session">
      <div className="s-bar">
        <div className="s-bar-in">
          <Link className="btn btn-ghost" href="/modeh" aria-label="Leave the sit">
            ✕
          </Link>
          <div className="s-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="s-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="s-count">
            {atClosing ? "Done" : `${i + 1} / ${total}`}
          </span>
        </div>
      </div>

      <div
        className="stage"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {station ? (
          <StationView
            key={station.id}
            station={station}
            settings={settings}
            note={notes[station.id] || ""}
            onNote={(t) => writeNote(station.id, t)}
          />
        ) : (
          <Closing
            note={notes[INTENTION] || ""}
            onNote={(t) => writeNote(INTENTION, t)}
            written={written}
            saved={saved}
            minutes={Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))}
            count={total}
          />
        )}
      </div>

      <div className="nav">
        <div className="nav-in">
          <button
            type="button"
            className="btn"
            onClick={() => go(-1)}
            disabled={i === 0}
            aria-label="Previous blessing"
          >
            ←
          </button>
          {atClosing ? (
            saved ? (
              <Link className="btn btn-primary" href="/modeh" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
                Back to the morning
              </Link>
            ) : (
              <button type="button" className="btn btn-primary" onClick={finish}>
                Finish
              </button>
            )
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => go(1)}>
              {i === total - 1 ? "Close the sit" : "Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function StationView({
  station,
  settings,
  note,
  onNote,
}: {
  station: Station;
  settings: Settings;
  note: string;
  onNote: (t: string) => void;
}) {
  return (
    <>
      <p className="st-kicker">{station.kicker}</p>
      <h1 className="st-he-title he" lang="he">
        {station.heTitle}
      </h1>
      <p className="st-title">{station.title}</p>

      <section className="text">
        {station.he.map((p, n) => (
          <p className="text-he he" lang="he" key={`he${n}`}>
            {p}
          </p>
        ))}
        {settings.showTranslit &&
          station.translit.map((p, n) => (
            <p className="text-tr" key={`tr${n}`}>
              {p}
            </p>
          ))}
        {settings.showEnglish &&
          station.en.map((p, n) => (
            <p className="text-en" key={`en${n}`}>
              {p}
            </p>
          ))}
      </section>

      {settings.breath && (
        <div className="breath" aria-hidden>
          <div className="breath-ring">
            <span className="breath-dot" />
          </div>
          <span className="breath-label">breathe with it</span>
        </div>
      )}

      <section className="reflect">
        <p className="reflect-theme">{station.theme}</p>
        <p className="reflect-p">{station.meditation}</p>
        <p className="reflect-cue">
          <span aria-hidden>◆</span>
          <span>{station.cue}</span>
        </p>
      </section>

      {station.prompt && (
        <section className="note">
          <p className="note-q">{station.prompt}</p>
          <textarea
            className="note-in"
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder="A sentence is plenty."
            aria-label={station.prompt}
          />
          <span className="note-hint">
            Saved on this device as you type. Nothing is sent anywhere.
          </span>
        </section>
      )}
    </>
  );
}

function Closing({
  note,
  onNote,
  written,
  saved,
  minutes,
  count,
}: {
  note: string;
  onNote: (t: string) => void;
  written: { q: string; a: string }[];
  saved: boolean;
  minutes: number;
  count: number;
}) {
  return (
    <>
      <p className="done-he he" lang="he">
        {CLOSING.heTitle}
      </p>
      <h1 className="done-t">{CLOSING.title}</h1>
      <p className="done-sub">
        {count} blessings · {minutes} minute{minutes === 1 ? "" : "s"}
        {saved ? " · kept" : ""}
      </p>

      <section className="note">
        <p className="note-q">{CLOSING.prompt}</p>
        <textarea
          className="note-in"
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Name one thing."
          aria-label={CLOSING.prompt}
        />
        <span className="note-hint">{CLOSING.note}</span>
      </section>

      {written.length > 0 && (
        <section className="card recap">
          <div className="card-h">
            <h2 className="card-t">This morning, in your words</h2>
          </div>
          {written.map((w) => (
            <div className="recap-item" key={w.q}>
              <p className="recap-q">{w.q}</p>
              <p className="recap-a">{w.a}</p>
            </div>
          ))}
        </section>
      )}

      {!saved && (
        <p className="foot">
          Finishing marks the morning done and keeps it in your journal.
        </p>
      )}
      {saved && (
        <p className="foot">
          Kept. <Link className="card-link" href="/modeh/journal">Open the journal →</Link>
        </p>
      )}
    </>
  );
}
