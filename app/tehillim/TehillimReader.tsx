"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TEXT,
  CHAPTER_COUNT,
  segmentsForDay,
  hebNumber,
  hebNumberPunct,
  type Segment,
} from "./data";

type Selection =
  | { type: "day"; day: number }
  | { type: "chapter"; chapter: number };

type Theme = "light" | "dark";

type HebToday = {
  day: number; // Hebrew day of month, 1–30
  combine: boolean; // true in a 29-day month (day 29 also gets day 30)
  label: string; // e.g. "כ״א באב תשפ״ו"
};

const LS = "tehillim.v1";
const SPEED_MIN = 0.4;
const SPEED_MAX = 6;
const SPEED_STEP = 0.4;
const FONT_MIN = 0.8;
const FONT_MAX = 2;
const FONT_STEP = 0.1;

type Persisted = {
  sel?: Selection;
  speed?: number;
  font?: number;
  theme?: Theme;
  barOpen?: boolean;
  scroll?: { key: string; y: number };
};

function loadLS(): Persisted {
  try {
    return JSON.parse(localStorage.getItem(LS) || "{}") || {};
  } catch {
    return {};
  }
}
function saveLS(patch: Persisted) {
  try {
    localStorage.setItem(LS, JSON.stringify({ ...loadLS(), ...patch }));
  } catch {
    /* storage unavailable — ignore */
  }
}

function hebDayNum(d: Date): number {
  return parseInt(
    new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric" }).format(d),
    10
  );
}

function computeHebToday(base = new Date()): HebToday {
  const day = hebDayNum(base);
  const tomorrow = new Date(base.getTime() + 24 * 60 * 60 * 1000);
  // A Hebrew month is "short" (29 days) when the day after the 29th is the 1st.
  const combine = day === 29 && hebDayNum(tomorrow) === 1;
  let label = "";
  try {
    label = new Intl.DateTimeFormat("he-u-ca-hebrew", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(base);
  } catch {
    label = hebNumberPunct(day);
  }
  return { day, combine, label };
}

function selKey(sel: Selection): string {
  return sel.type === "day" ? "d" + sel.day : "c" + sel.chapter;
}

export default function TehillimReader() {
  const [ready, setReady] = useState(false);
  const [hebToday, setHebToday] = useState<HebToday | null>(null);
  const [sel, setSel] = useState<Selection>({ type: "chapter", chapter: 1 });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1.6);
  const [font, setFontState] = useState(1);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [barOpen, setBarOpenState] = useState(true);

  const selRef = useRef(sel);
  selRef.current = sel;
  const pendingScroll = useRef<number | null>(null);

  // ---- One-time client init: read the Hebrew date + restore saved state ----
  useEffect(() => {
    const t = computeHebToday();
    setHebToday(t);
    const s = loadLS();
    const startSel: Selection =
      s.sel && (s.sel.type === "day" || s.sel.type === "chapter")
        ? s.sel
        : { type: "day", day: t.day };
    setSel(startSel);
    if (typeof s.speed === "number") setSpeedState(s.speed);
    if (typeof s.font === "number") setFontState(s.font);
    if (typeof s.barOpen === "boolean") setBarOpenState(s.barOpen);
    setTheme(
      s.theme ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light")
    );
    if (s.scroll && s.scroll.key === selKey(startSel)) {
      pendingScroll.current = s.scroll.y;
    }
    setReady(true);
  }, []);

  // Apply the theme to the document root so the scoped tokens flip.
  useEffect(() => {
    if (!theme) return;
    document.documentElement.setAttribute("data-theme", theme);
    saveLS({ theme });
  }, [theme]);

  const segments = useMemo<Segment[]>(() => {
    if (sel.type === "day") return segmentsForDay(sel.day, hebToday?.combine ?? false);
    const out: Segment[] = [];
    for (let c = sel.chapter; c <= CHAPTER_COUNT; c++) out.push({ chapter: c });
    return out;
  }, [sel, hebToday]);

  // On selection change: stop scrolling, then restore saved position (first
  // load only) or jump to the top (user-driven change).
  useEffect(() => {
    if (!ready) return;
    setPlaying(false);
    if (pendingScroll.current != null) {
      window.scrollTo(0, pendingScroll.current);
      pendingScroll.current = null;
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [sel, ready]);

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
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2
      ) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  // Remember scroll position within the current selection.
  useEffect(() => {
    if (!ready) return;
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        saveLS({ scroll: { key: selKey(selRef.current), y: window.scrollY } });
      }, 250);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, [ready]);

  const setSpeed = useCallback((v: number) => {
    const s = Math.max(SPEED_MIN, Math.min(SPEED_MAX, +v.toFixed(2)));
    setSpeedState(s);
    saveLS({ speed: s });
  }, []);
  const setFont = useCallback((v: number) => {
    const f = Math.max(FONT_MIN, Math.min(FONT_MAX, +v.toFixed(2)));
    setFontState(f);
    saveLS({ font: f });
  }, []);

  const choose = useCallback((next: Selection) => {
    saveLS({ sel: next });
    setSel(next);
  }, []);
  const setBarOpen = useCallback((v: boolean) => {
    setBarOpenState(v);
    saveLS({ barOpen: v });
  }, []);

  // Keyboard: space play/pause, up/down speed, +/- text size.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSpeed(speed + SPEED_STEP);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSpeed(speed - SPEED_STEP);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setFont(font + FONT_STEP);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setFont(font - FONT_STEP);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [speed, font, setSpeed, setFont]);

  const speedPct = Math.round(
    ((speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100
  );

  const heading =
    sel.type === "day"
      ? `יוֹם ${hebNumberPunct(sel.day)}${
          hebToday?.combine && sel.day === 29 ? " (ל׳)" : ""
        }`
      : `מִזְמוֹר ${hebNumberPunct(sel.chapter)}`;

  return (
    <div dir="rtl" className="tehillim-root">
      {/* ---- Collapsed handle ---- */}
      {!barOpen && (
        <button
          dir="ltr"
          type="button"
          className="bar-reopen"
          onClick={() => setBarOpen(true)}
          title="Show controls"
          aria-label="Show controls"
        >
          <span className="chev">⌄</span> Tehillim
        </button>
      )}

      {/* ---- Control bar ---- */}
      <div dir="ltr" className="ctrlbar" hidden={!barOpen}>
        <div className="ctrlbar-inner">
          <button
            type="button"
            className={`btn ${sel.type === "day" ? "btn-on" : ""}`}
            onClick={() => hebToday && choose({ type: "day", day: hebToday.day })}
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
                choose({ type: "chapter", chapter: Number(e.target.value) })
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

          {sel.type === "day" && (
            <div className="daychips">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`chip ${sel.day === d ? "chip-on" : ""}`}
                  onClick={() => choose({ type: "day", day: d })}
                  title={`Day ${d}`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          <div className="spacer" />

          <div className="speed">
            <button
              type="button"
              className="btn-round"
              onClick={() => setSpeed(speed - SPEED_STEP)}
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
              onClick={() => setSpeed(speed + SPEED_STEP)}
              title="Faster"
            >
              +
            </button>
            <span className="speed-num">{speedPct}%</span>
          </div>

          <div className="fontsz">
            <button
              type="button"
              className="btn-round font-dn"
              onClick={() => setFont(font - FONT_STEP)}
              title="Smaller text"
              aria-label="Smaller text"
            >
              A
            </button>
            <button
              type="button"
              className="btn-round font-up"
              onClick={() => setFont(font + FONT_STEP)}
              title="Larger text"
              aria-label="Larger text"
            >
              A
            </button>
          </div>

          <button
            type="button"
            className={`btn-play ${playing ? "btn-play-on" : ""}`}
            onClick={() => setPlaying((p) => !p)}
            title="Auto-scroll (Space)"
          >
            {playing ? "⏸ Pause" : "▶ Auto-scroll"}
          </button>

          <button
            type="button"
            className="btn-theme"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            title="Day / night"
            aria-label="Toggle day / night"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>

          <button
            type="button"
            className="btn-collapse"
            onClick={() => setBarOpen(false)}
            title="Collapse controls"
            aria-label="Collapse controls"
          >
            ⌃
          </button>
        </div>
      </div>

      {/* ---- Text ---- */}
      <main
        className="scroll-area"
        style={{ ["--fs" as string]: font } as React.CSSProperties}
      >
        {ready && (
          <>
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
                    <span className="chapter-num">
                      {hebNumberPunct(seg.chapter)}
                    </span>
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
                : "· pick another Psalm above ·"}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
