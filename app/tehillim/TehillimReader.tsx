"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TEXT,
  CHAPTER_COUNT,
  DAILY,
  segmentsForDay,
  hebNumber,
  hebNumberPunct,
  type Segment,
} from "./data";

type Selection =
  | { type: "day"; day: number }
  | { type: "chapter"; chapter: number };

type HebToday = {
  day: number; // Hebrew day of month, 1–30
  combineLast: boolean; // true in a 29-day month (day 29 also gets day 30)
  label: string; // e.g. "כ״א באב תשפ״ה"
};

function computeHebToday(base = new Date()): HebToday {
  const dayNum = (d: Date) =>
    parseInt(
      new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric" }).format(d),
      10
    );
  const day = dayNum(base);
  const tomorrow = new Date(base.getTime() + 24 * 60 * 60 * 1000);
  // A Hebrew month is "short" (29 days) when the day after the 29th is the 1st.
  const combineLast = day === 29 && dayNum(tomorrow) === 1;
  let label = "";
  try {
    label = new Intl.DateTimeFormat("he-u-ca-hebrew", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(base);
  } catch {
    label = `${hebNumberPunct(day)}`;
  }
  return { day, combineLast, label };
}

// Which chapters (with optional verse range) to render for a selection.
function resolveSegments(sel: Selection, combineLast: boolean): Segment[] {
  if (sel.type === "day") return segmentsForDay(sel.day, combineLast);
  // Chapter mode: render from the chosen psalm through the end, so auto-scroll
  // can keep flowing onward from wherever you start.
  const out: Segment[] = [];
  for (let c = sel.chapter; c <= CHAPTER_COUNT; c++) out.push({ chapter: c });
  return out;
}

const SPEED_MIN = 0.4;
const SPEED_MAX = 6;
const SPEED_STEP = 0.4;

export default function TehillimReader() {
  const [hebToday, setHebToday] = useState<HebToday | null>(null);
  const [sel, setSel] = useState<Selection>({ type: "chapter", chapter: 1 });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.6); // px per frame (~96px/s at 60fps)

  // Resolve the Hebrew date on the client (depends on "now").
  useEffect(() => {
    const t = computeHebToday();
    setHebToday(t);
    setSel({ type: "day", day: t.day });
  }, []);

  const segments = useMemo(
    () => resolveSegments(sel, hebToday?.combineLast ?? false),
    [sel, hebToday]
  );

  // Scroll to top whenever the selection changes, and stop any auto-scroll.
  useEffect(() => {
    setPlaying(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [sel]);

  // Auto-scroll loop.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let carry = 0;
    const step = () => {
      carry += speed;
      const px = Math.floor(carry);
      if (px >= 1) {
        window.scrollBy(0, px);
        carry -= px;
      }
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  // Keyboard: space toggles play/pause, arrows adjust speed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowUp") {
        setSpeed((s) => Math.min(SPEED_MAX, +(s + SPEED_STEP).toFixed(2)));
      } else if (e.key === "ArrowDown") {
        setSpeed((s) => Math.max(SPEED_MIN, +(s - SPEED_STEP).toFixed(2)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectToday = useCallback(() => {
    if (hebToday) setSel({ type: "day", day: hebToday.day });
  }, [hebToday]);

  const speedPct = Math.round(
    ((speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100
  );

  const heading =
    sel.type === "day"
      ? `יוֹם ${hebNumberPunct(sel.day)}${
          hebToday?.combineLast && sel.day === 29 ? " (ל׳)" : ""
        }`
      : `מִזְמוֹר ${hebNumberPunct(sel.chapter)}`;

  return (
    <div dir="rtl" className="tehillim-root">
      {/* ---- Control bar ---- */}
      <div dir="ltr" className="ctrlbar">
        <div className="ctrlbar-inner">
          <button
            type="button"
            className={`btn ${sel.type === "day" ? "btn-on" : ""}`}
            onClick={selectToday}
            title="Today's Tehillim (by the Hebrew day of the month)"
          >
            <span className="btn-strong">Today</span>
            {hebToday && (
              <span className="btn-sub">
                {hebToday.label} · day {hebToday.day}
              </span>
            )}
          </button>

          <label className="jump">
            <span className="jump-label">Psalm</span>
            <select
              value={sel.type === "chapter" ? sel.chapter : ""}
              onChange={(e) =>
                setSel({ type: "chapter", chapter: Number(e.target.value) })
              }
            >
              <option value="" disabled>
                pick
              </option>
              {Array.from({ length: CHAPTER_COUNT }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} · {hebNumber(n)}
                </option>
              ))}
            </select>
          </label>

          <div className="daychips">
            {sel.type === "day" &&
              Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`chip ${sel.day === d ? "chip-on" : ""}`}
                  onClick={() => setSel({ type: "day", day: d })}
                  title={`Day ${d}`}
                >
                  {d}
                </button>
              ))}
          </div>

          <div className="spacer" />

          <div className="speed">
            <button
              type="button"
              className="btn-round"
              onClick={() =>
                setSpeed((s) => Math.max(SPEED_MIN, +(s - SPEED_STEP).toFixed(2)))
              }
              title="Slower"
            >
              −
            </button>
            <input
              type="range"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={0.1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              aria-label="Auto-scroll speed"
            />
            <button
              type="button"
              className="btn-round"
              onClick={() =>
                setSpeed((s) => Math.min(SPEED_MAX, +(s + SPEED_STEP).toFixed(2)))
              }
              title="Faster"
            >
              +
            </button>
            <span className="speed-num">{speedPct}%</span>
          </div>

          <button
            type="button"
            className={`btn-play ${playing ? "btn-play-on" : ""}`}
            onClick={() => setPlaying((p) => !p)}
            title="Auto-scroll (Space)"
          >
            {playing ? "⏸ Pause" : "▶ Auto-scroll"}
          </button>
        </div>
      </div>

      {/* ---- Text ---- */}
      <main className="scroll-area">
        <p className="selheading">{heading}</p>

        {segments.map((seg, i) => {
          const verses = TEXT[String(seg.chapter)] ?? [];
          const from = seg.from ?? 1;
          const to = seg.to ?? verses.length;
          const rangeNote =
            seg.from || seg.to
              ? ` · ${hebNumberPunct(from)}–${hebNumberPunct(to)}`
              : "";
          return (
            <section key={`${seg.chapter}-${i}`} className="chapter">
              <h2 className="chapter-h">
                <span className="chapter-word">תְּהִלִּים</span>
                <span className="chapter-num">{hebNumberPunct(seg.chapter)}</span>
                {rangeNote && <span className="chapter-range">{rangeNote}</span>}
              </h2>
              <div className="verses">
                {verses.slice(from - 1, to).map((v, idx) => {
                  const vn = from + idx;
                  return (
                    <p key={vn} className="verse">
                      <span className="vnum">{hebNumber(vn)}</span>
                      <span className="vtext">{v}</span>
                    </p>
                  );
                })}
              </div>
            </section>
          );
        })}

        <p className="endnote">
          {sel.type === "day"
            ? "סליק · end of today's Tehillim"
            : "· continue selecting a Psalm above ·"}
        </p>
      </main>
    </div>
  );
}
