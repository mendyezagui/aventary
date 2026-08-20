"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  TEXT,
  CHAPTER_COUNT,
  segmentsForDay,
  seasonalAddition,
  chapterSegments,
  YOM_KIPPUR_SETS,
  nameLetters,
  stanzasForLetters,
  KERA_SATAN,
  NESHAMA,
  LITURGICAL,
  isLiturgical,
  hebNumber,
  hebNumberPunct,
  type Segment,
} from "./data";
import { getSaved, isSaved, toggleSaved, type Saved } from "./store";

type Addition = "kera" | "neshama" | "none";
type Selection =
  | { type: "today" }
  | { type: "day"; day: number }
  | { type: "chapter"; chapter: number }
  | { type: "name"; name: string; add: Addition }
  | { type: "season" }
  | { type: "saved" };

type Theme = "light" | "dark";

type HebToday = {
  day: number;
  combine: boolean;
  month: string; // English month name from Intl, e.g. "Elul", "Tishri"
  label: string; // e.g. "כ״א באב תשפ״ו"
};

// A rendered block: an optional Hebrew heading + its chapter/stanza segments.
type Group = { title?: string; note?: string; segments: Segment[] };

const LS = "tehillim.v1";
const SPEED_MIN = 0.4;
const SPEED_MAX = 6;
const SPEED_STEP = 0.4;
const FONT_MIN = 0.8;
const FONT_MAX = 2;
const FONT_STEP = 0.1;

type Persisted = {
  speed?: number;
  font?: number;
  theme?: Theme;
  barOpen?: boolean;
  enhance?: boolean;
  scroll?: { key: string; y: number };
};

// When enhancement is on, auto-scroll speeds up by this factor over familiar
// (liturgical) Psalms.
const ENHANCE_FACTOR = 1.15;
const ENHANCE_PCT = Math.round((ENHANCE_FACTOR - 1) * 100); // 15

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
    /* ignore */
  }
}

function hebField(base: Date, opt: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-u-ca-hebrew", opt).format(base);
}

function computeHebToday(base = new Date()): HebToday {
  const day = parseInt(hebField(base, { day: "numeric" }), 10);
  const month = hebField(base, { month: "long" });
  const tomorrow = new Date(base.getTime() + 24 * 60 * 60 * 1000);
  const tomDay = parseInt(hebField(tomorrow, { day: "numeric" }), 10);
  const combine = day === 29 && tomDay === 1;
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
  return { day, combine, month, label };
}

function selKey(sel: Selection): string {
  switch (sel.type) {
    case "today":
      return "today";
    case "day":
      return "d" + sel.day;
    case "chapter":
      return "c" + sel.chapter;
    case "name":
      return "n:" + sel.add + ":" + nameLetters(sel.name).join("");
    case "season":
      return "season";
    case "saved":
      return "saved";
  }
}

function additionWord(add: Addition): string | null {
  if (add === "kera") return KERA_SATAN;
  if (add === "neshama") return NESHAMA;
  return null;
}

export default function TehillimReader() {
  const params = useSearchParams();

  const [ready, setReady] = useState(false);
  const [hebToday, setHebToday] = useState<HebToday | null>(null);
  const [sel, setSel] = useState<Selection>({ type: "today" });
  const [saved, setSavedState] = useState<Saved[]>([]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1.6);
  const [font, setFontState] = useState(1);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [barOpen, setBarOpenState] = useState(true);
  const [enhance, setEnhanceState] = useState(false);

  const selRef = useRef(sel);
  selRef.current = sel;
  const pendingScroll = useRef<number | null>(null);
  const enhanceRef = useRef(enhance);
  enhanceRef.current = enhance;
  const fillRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const progRaf = useRef(0);
  const enhBtnRef = useRef<HTMLButtonElement | null>(null);
  const enhLblRef = useRef<HTMLSpanElement | null>(null);
  const boostRef = useRef(false);

  // ---- One-time client init ----
  useEffect(() => {
    const t = computeHebToday();
    setHebToday(t);
    setSavedState(getSaved());

    // Selection comes from the URL (links from the home hub); default to today.
    const mode = params.get("mode");
    let startSel: Selection = { type: "today" };
    if (mode === "chapter") {
      const ch = Math.min(CHAPTER_COUNT, Math.max(1, Number(params.get("ch")) || 1));
      startSel = { type: "chapter", chapter: ch };
    } else if (mode === "day") {
      const d = Math.min(30, Math.max(1, Number(params.get("day")) || t.day));
      startSel = { type: "day", day: d };
    } else if (mode === "name") {
      const name = params.get("name") || "";
      const addRaw = params.get("add");
      const add: Addition =
        addRaw === "kera" || addRaw === "neshama" ? addRaw : "none";
      startSel = { type: "name", name, add };
    } else if (mode === "season") {
      startSel = { type: "season" };
    } else if (mode === "saved") {
      startSel = { type: "saved" };
    }
    setSel(startSel);

    const s = loadLS();
    if (typeof s.speed === "number") setSpeedState(s.speed);
    if (typeof s.font === "number") setFontState(s.font);
    if (typeof s.barOpen === "boolean") setBarOpenState(s.barOpen);
    if (typeof s.enhance === "boolean") setEnhanceState(s.enhance);
    setTheme(
      s.theme ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    );
    if (s.scroll && s.scroll.key === selKey(startSel)) {
      pendingScroll.current = s.scroll.y;
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!theme) return;
    document.documentElement.setAttribute("data-theme", theme);
    saveLS({ theme });
  }, [theme]);

  // Today's place in the Elul → Yom Kippur count (null outside the season).
  const season = useMemo(
    () => (hebToday ? seasonalAddition(hebToday.month, hebToday.day) : null),
    [hebToday]
  );

  // ---- Build the groups to render for the current selection ----
  const groups = useMemo<Group[]>(() => {
    if (sel.type === "chapter") {
      const segs: Segment[] = [];
      for (let c = sel.chapter; c <= CHAPTER_COUNT; c++) segs.push({ chapter: c });
      return [{ segments: segs }];
    }
    if (sel.type === "day") {
      return [{ segments: segmentsForDay(sel.day, false) }];
    }
    if (sel.type === "saved") {
      return [{ segments: saved.map((s) => ({ chapter: s.ch })) }];
    }
    if (sel.type === "season") {
      if (!season) return [];
      // On Yom Kippur the 36 are said nine at a time, at four points in the day.
      if (season.kind === "yomkippur") {
        return YOM_KIPPUR_SETS.map((set) => ({
          title: set.title,
          note: set.note,
          segments: chapterSegments(set.from, set.to),
        }));
      }
      return [
        {
          title: season.title,
          note: `${season.note} · ${season.dayLabel}`,
          segments: season.chapters.map((c) => ({ chapter: c })),
        },
      ];
    }
    if (sel.type === "name") {
      const letters = nameLetters(sel.name);
      const out: Group[] = [
        { title: sel.name.trim() || "—", note: "Psalm 119 — stanzas of the name", segments: stanzasForLetters(letters) },
      ];
      const word = additionWord(sel.add);
      if (word) {
        out.push({
          title: word,
          note: sel.add === "kera" ? "for a refuah" : "in memory",
          segments: stanzasForLetters(nameLetters(word)),
        });
      }
      return out;
    }
    // today
    const combine = hebToday?.combine ?? false;
    const day = hebToday?.day ?? 1;
    const out: Group[] = [{ segments: segmentsForDay(day, combine) }];
    if (season) {
      out.push({
        title: season.title,
        note: `${season.note} · ${season.dayLabel}`,
        segments: season.chapters.map((c) => ({ chapter: c })),
      });
    }
    return out;
  }, [sel, hebToday, season, saved]);

  // Stop scrolling on selection change; restore saved position on first load only.
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

  // Which Psalm sits on the "reading line" (~40% down the viewport) right now.
  function familiarAtReadingLine(): boolean {
    const el = document.elementFromPoint(
      Math.round(window.innerWidth / 2),
      Math.round(window.innerHeight * 0.4)
    );
    const sec = el?.closest?.(".chapter") as HTMLElement | null;
    const ch = sec ? Number(sec.dataset.ch) : NaN;
    return Number.isFinite(ch) && ch > 0 ? isLiturgical(ch) : false;
  }

  // Reflect the "actively boosting" state on the Enhance pill via the DOM
  // (no React re-render mid-scroll). Only touches the DOM on a real transition.
  function setBoostVisual(on: boolean) {
    if (boostRef.current === on) return;
    boostRef.current = on;
    enhBtnRef.current?.classList.toggle("boosting", on);
    if (enhLblRef.current) {
      enhLblRef.current.textContent = on
        ? `+${ENHANCE_PCT}%`
        : enhanceRef.current
          ? "Enhanced"
          : "Enhance";
    }
  }

  // Auto-scroll loop. With enhancement on, familiar Psalms move ENHANCE_FACTOR faster.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let carry = 0;
    const step = () => {
      const boosting = enhanceRef.current && familiarAtReadingLine();
      setBoostVisual(boosting);
      carry += speed * (boosting ? ENHANCE_FACTOR : 1);
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
    return () => {
      cancelAnimationFrame(raf);
      setBoostVisual(false); // clear the glow when paused / stopped
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed]);

  // Progress indicator: update the right-edge rail + % badge as you scroll
  // (works for both manual and auto-scroll), throttled to one rAF.
  useEffect(() => {
    if (!ready) return;
    const update = () => {
      progRaf.current = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 4 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      if (fillRef.current) fillRef.current.style.height = (p * 100).toFixed(2) + "%";
      if (badgeRef.current) {
        badgeRef.current.textContent = Math.round(p * 100) + "%";
        const top0 = 76;
        const band = Math.max(0, window.innerHeight - top0 - 150);
        badgeRef.current.style.top = Math.round(top0 + p * band) + "px";
      }
    };
    const onScroll = () => {
      if (!progRaf.current) progRaf.current = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (progRaf.current) cancelAnimationFrame(progRaf.current);
    };
  }, [ready]);

  // Recompute progress after layout changes (new selection or text size).
  useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 4 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      if (fillRef.current) fillRef.current.style.height = (p * 100).toFixed(2) + "%";
      if (badgeRef.current) badgeRef.current.textContent = Math.round(p * 100) + "%";
    });
    return () => cancelAnimationFrame(id);
  }, [ready, sel, font, groups]);

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
  const setBarOpen = useCallback((v: boolean) => {
    setBarOpenState(v);
    saveLS({ barOpen: v });
  }, []);
  const onToggleSave = useCallback((ch: number) => {
    setSavedState(toggleSaved(ch));
  }, []);
  const setEnhance = useCallback((v: boolean) => {
    setEnhanceState(v);
    saveLS({ enhance: v });
  }, []);

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

  const speedPct = Math.round(((speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100);

  const overallHeading = (() => {
    switch (sel.type) {
      case "today":
        return `יוֹם ${hebToday ? hebNumberPunct(hebToday.day) : ""}`;
      case "day":
        return `יוֹם ${hebNumberPunct(sel.day)}`;
      case "chapter":
        return `מִזְמוֹר ${hebNumberPunct(sel.chapter)}`;
      case "name":
        return "תְּהִלִּים לְשֵׁם";
      case "season":
        return season ? season.title : "תְּהִלִּים";
      case "saved":
        return "תְּהִלִּים שְׁמוּרִים";
    }
  })();

  const showDayChips = sel.type === "today" || sel.type === "day";
  const totalSegments = groups.reduce((n, g) => n + g.segments.length, 0);

  return (
    <div dir="rtl" className="tehillim-root">
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

      <div dir="ltr" className="ctrlbar" hidden={!barOpen}>
        <div className="ctrlbar-inner">
          <a className="btn-home" href="/tehillim" title="Home" aria-label="Home">
            ⌂
          </a>

          <button
            type="button"
            className={`btn ${sel.type === "today" ? "btn-on" : ""}`}
            onClick={() => setSel({ type: "today" })}
            title="Today's Tehillim (by the Hebrew day of the month)"
          >
            <span className="btn-strong">Today</span>
            {hebToday && (
              <span className="btn-sub">
                {hebToday.label} · day {hebToday.day}
              </span>
            )}
          </button>

          {season && (
            <button
              type="button"
              className={`btn ${sel.type === "season" ? "btn-on" : ""}`}
              onClick={() => setSel({ type: "season" })}
              title="The season's chapters on their own — three a day from 1 Elul through Yom Kippur"
            >
              <span className="btn-strong">{season.shortLabel}</span>
              <span className="btn-sub">
                {season.kind === "yomkippur"
                  ? "115–150 · four sets of nine"
                  : `${season.chapters[0]}–${season.chapters[season.chapters.length - 1]} · three a day`}
              </span>
            </button>
          )}

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

          {showDayChips && (
            <div className="daychips">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`chip ${sel.type === "day" && sel.day === d ? "chip-on" : ""}`}
                  onClick={() => setSel({ type: "day", day: d })}
                  title={`Day ${d}`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          <div className="spacer" />

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

      <main
        className="scroll-area"
        style={{ ["--fs" as string]: font } as React.CSSProperties}
      >
        {ready && (
          <>
            <p className="selheading">{overallHeading}</p>

            {sel.type === "season" && totalSegments === 0 && (
              <p className="empty-note">
                The three-chapters-a-day count runs from 1 Elul through Yom Kippur.
                Outside those days, read today&rsquo;s portion from the home screen.
              </p>
            )}

            {sel.type === "saved" && totalSegments === 0 && (
              <p className="empty-note">
                No saved Psalms yet. Open any Psalm and tap the ☆ to save it here —
                for a yahrzeit, a kaddish, or a name you keep in mind.
              </p>
            )}

            {groups.map((g, gi) => (
              <section key={gi} className="group">
                {g.title && (
                  <div className="group-h">
                    <span className="group-title">{g.title}</span>
                    {g.note && <span className="group-note">{g.note}</span>}
                  </div>
                )}
                {g.segments.map((seg, i) => {
                  const verses = TEXT[String(seg.chapter)] ?? [];
                  const from = seg.from ?? 1;
                  const to = seg.to ?? verses.length;
                  const isStanza = !!seg.label;
                  const rangeNote =
                    !isStanza && (seg.from || seg.to)
                      ? ` · ${hebNumberPunct(from)}–${hebNumberPunct(to)}`
                      : "";
                  const familiar = !isStanza && isLiturgical(seg.chapter);
                  return (
                    <section
                      key={`${seg.chapter}-${i}`}
                      className="chapter"
                      data-ch={seg.chapter}
                    >
                      <h2 className="chapter-h">
                        {isStanza ? (
                          <>
                            <span className="chapter-num">{seg.label}</span>
                            <span className="chapter-word">
                              תְּהִלִּים קי״ט
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="chapter-word">תְּהִלִּים</span>
                            <span className="chapter-num">
                              {hebNumberPunct(seg.chapter)}
                            </span>
                            {rangeNote && (
                              <span className="chapter-range">{rangeNote}</span>
                            )}
                            {familiar && (
                              <span
                                className={`litmark ${enhance ? "on" : ""}`}
                                title={`Familiar in the siddur — ${LITURGICAL[seg.chapter]}${enhance ? ` · +${ENHANCE_PCT}% with enhancement` : ""}`}
                              >
                                ✦
                              </span>
                            )}
                            <button
                              type="button"
                              className={`savebtn ${isSaved(saved, seg.chapter) ? "saved" : ""}`}
                              onClick={() => onToggleSave(seg.chapter)}
                              title={
                                isSaved(saved, seg.chapter)
                                  ? "Remove from saved"
                                  : "Save this Psalm"
                              }
                              aria-label={
                                isSaved(saved, seg.chapter)
                                  ? "Remove from saved"
                                  : "Save this Psalm"
                              }
                            >
                              {isSaved(saved, seg.chapter) ? "★" : "☆"}
                            </button>
                          </>
                        )}
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
              </section>
            ))}

            {totalSegments > 0 && (
              <p className="endnote">
                {sel.type === "today" || sel.type === "day" || sel.type === "season"
                  ? "סליק · end of the portion"
                  : sel.type === "name"
                    ? "· may it be a merit ·"
                    : "· end ·"}
              </p>
            )}
          </>
        )}
      </main>

      {/* Progress: right-edge rail + a % badge that travels as you scroll */}
      <div className="progress-rail" aria-hidden>
        <div ref={fillRef} className="progress-fill" />
      </div>
      <div
        ref={badgeRef}
        className="progress-badge"
        aria-label="Percent completed"
      >
        0%
      </div>

      <div dir="ltr" className="fab" role="group" aria-label="Auto-scroll controls">
        <button
          ref={enhBtnRef}
          type="button"
          className={`fab-enh ${enhance ? "on" : ""}`}
          onClick={() => setEnhance(!enhance)}
          title={`Enhancement — familiar (siddur) Psalms auto-scroll ${ENHANCE_PCT}% faster`}
          aria-pressed={enhance}
          aria-label="Toggle auto-scroll enhancement"
        >
          ✦{" "}
          <span ref={enhLblRef} className="fab-enh-lbl">
            {enhance ? "Enhanced" : "Enhance"}
          </span>
        </button>
        <div className="fab-speed">
          <button
            type="button"
            className="fab-step"
            onClick={() => setSpeed(speed - SPEED_STEP)}
            title="Slower"
            aria-label="Slower"
          >
            −
          </button>
          <span className="fab-pct" title="Auto-scroll speed">
            {speedPct}%
          </span>
          <button
            type="button"
            className="fab-step"
            onClick={() => setSpeed(speed + SPEED_STEP)}
            title="Faster"
            aria-label="Faster"
          >
            +
          </button>
        </div>
        <button
          type="button"
          className={`fab-play ${playing ? "fab-play-on" : ""}`}
          onClick={() => setPlaying((p) => !p)}
          title={playing ? "Pause (Space)" : "Auto-scroll (Space)"}
          aria-label={playing ? "Pause auto-scroll" : "Start auto-scroll"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
      </div>
    </div>
  );
}
