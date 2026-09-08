"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  TEXT,
  CHAPTER_COUNT,
  segmentsForDay,
  seasonalAddition,
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
import {
  getUser,
  syncOnLoad,
  setSyncUser,
  startSyncLoop,
  queueSync,
} from "./account";

type Addition = "kera" | "neshama" | "none";
type Selection =
  | { type: "today" }
  | { type: "day"; day: number }
  | { type: "chapter"; chapter: number }
  | { type: "name"; name: string; add: Addition }
  | { type: "saved" };

type Theme = "light" | "dark";
type FontFace = "serif" | "sans";

// The two reading faces the user can switch between. `serif` is Frank Ruhl Libre
// (the classic Hebrew book serif); `sans` is Assistant (a crisp on-screen sans).
const FONT_STACKS: Record<FontFace, string> = {
  serif: 'var(--font-hebrew), "Frank Ruhl Libre", "David Libre", Georgia, serif',
  sans: 'var(--font-sans-hebrew), "Assistant", ui-sans-serif, system-ui, sans-serif',
};

type HebToday = {
  day: number;
  combine: boolean;
  month: string; // English month name from Intl, e.g. "Elul", "Tishri"
  label: string; // e.g. "כ״א באב תשפ״ו"
};

// A rendered block: an optional Hebrew heading + its chapter/stanza segments.
type Group = { title?: string; note?: string; segments: Segment[] };

const LS = "tehillim.v1";
const SPEED_MIN = 0.4; // px/frame at 0%
const SPEED_MAX = 6; // px/frame at 100%
const PCT_STEP = 2; // finer nudges than before (was ~7%)
const FONT_MIN = 0.8;
const FONT_MAX = 2;
const FONT_STEP = 0.1;
const FPS = 60; // for the read-time estimate

const pctToSpeed = (pct: number) =>
  SPEED_MIN + (Math.max(0, Math.min(100, pct)) / 100) * (SPEED_MAX - SPEED_MIN);
const speedToPct = (s: number) =>
  Math.round(((s - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100);

// ---- Read-aloud (Web Speech) ----
type NameStyle = "hashem" | "adonai"; // how the Divine Name is vocalized
const VRATE_MIN = 0.5; // voice rate at 0%
const VRATE_MAX = 1.3; // voice rate at 100%
const pctToVRate = (pct: number) =>
  VRATE_MIN + (Math.max(0, Math.min(100, pct)) / 100) * (VRATE_MAX - VRATE_MIN);
const vRateToPct = (r: number) =>
  Math.round(((r - VRATE_MIN) / (VRATE_MAX - VRATE_MIN)) * 100);

const SHEM = /י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה/g; // Tetragrammaton, nikkud between letters
// The Tetragrammaton carries Adonai's borrowed vowels, so a TTS engine sounds
// it into garble. Always swap it for a word the voice can say — never the raw
// letters — and turn the maqaf into a space so joined words read apart.
function speakText(text: string, nameStyle: NameStyle): string {
  return text
    .replace(SHEM, nameStyle === "adonai" ? "אֲדֹנָי" : "הַשֵּׁם")
    .replace(/־/g, " ")
    .trim();
}

// Stable id for a rendered verse, matched by the read-aloud loop and the DOM.
const readId = (gi: number, si: number, vn: number) => `rv-${gi}-${si}-${vn}`;

type Persisted = {
  speed?: number;
  font?: number;
  fontFace?: FontFace;
  theme?: Theme;
  barOpen?: boolean;
  enhance?: boolean;
  seasonalOn?: boolean;
  voiceRate?: number;
  voiceURI?: string;
  nameStyle?: NameStyle;
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

// The "today" key carries the calendar day so a new day starts fresh (at the
// top) instead of restoring yesterday's scroll position.
function selKey(sel: Selection, todayKey = ""): string {
  switch (sel.type) {
    case "today":
      return "today:" + todayKey;
    case "day":
      return "d" + sel.day;
    case "chapter":
      return "c" + sel.chapter;
    case "name":
      return "n:" + sel.add + ":" + nameLetters(sel.name).join("");
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
  const [fontFace, setFontFaceState] = useState<FontFace>("serif");
  const [theme, setTheme] = useState<Theme | null>(null);
  const [barOpen, setBarOpenState] = useState(false);
  const [enhance, setEnhanceState] = useState(false);
  const [seasonalOn, setSeasonalOnState] = useState(true);
  const [readMin, setReadMin] = useState<number | null>(null);

  // ---- read-aloud (Web Speech) ----
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURIState] = useState<string>("");
  const [voiceRate, setVoiceRateState] = useState(0.85);
  const [nameStyle, setNameStyleState] = useState<NameStyle>("hashem");
  const [reading, setReading] = useState(false);
  const [activeMode, setActiveMode] = useState<"scroll" | "voice">("scroll");
  const [currentReadId, setCurrentReadId] = useState<string | null>(null);

  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const selRef = useRef(sel);
  selRef.current = sel;
  const pendingScroll = useRef<number | null>(null);
  const todayKeyRef = useRef("");
  const enhanceRef = useRef(enhance);
  enhanceRef.current = enhance;
  const fillRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const progRaf = useRef(0);
  const enhBtnRef = useRef<HTMLButtonElement | null>(null);
  const enhLblRef = useRef<HTMLSpanElement | null>(null);
  const boostRef = useRef(false);
  const readingRef = useRef(false);
  const voiceRateRef = useRef(voiceRate);
  voiceRateRef.current = voiceRate;
  const nameStyleRef = useRef(nameStyle);
  nameStyleRef.current = nameStyle;
  const activeModeRef = useRef(activeMode);
  activeModeRef.current = activeMode;

  // ---- One-time client init ----
  useEffect(() => {
    const t = computeHebToday();
    todayKeyRef.current = new Date().toDateString(); // unique per calendar day
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
    } else if (mode === "saved") {
      startSel = { type: "saved" };
    }
    setSel(startSel);

    const s = loadLS();
    if (typeof s.speed === "number") setSpeedState(s.speed);
    if (typeof s.font === "number") setFontState(s.font);
    if (s.fontFace === "serif" || s.fontFace === "sans") setFontFaceState(s.fontFace);
    if (typeof s.barOpen === "boolean") setBarOpenState(s.barOpen);
    if (typeof s.enhance === "boolean") setEnhanceState(s.enhance);
    if (typeof s.seasonalOn === "boolean") setSeasonalOnState(s.seasonalOn);
    if (typeof s.voiceRate === "number") setVoiceRateState(s.voiceRate);
    if (typeof s.voiceURI === "string") setVoiceURIState(s.voiceURI);
    if (s.nameStyle === "hashem" || s.nameStyle === "adonai")
      setNameStyleState(s.nameStyle);
    setTheme(
      s.theme ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    );
    if (s.scroll && s.scroll.key === selKey(startSel, todayKeyRef.current)) {
      pendingScroll.current = s.scroll.y;
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!theme) return;
    document.documentElement.setAttribute("data-theme", theme);
    saveLS({ theme });
    queueSync();
  }, [theme]);

  // ---- Account sync: pull the account's saved + settings when signed in ----
  useEffect(() => {
    if (!ready) return;
    let stop: (() => void) | undefined;
    (async () => {
      const u = await getUser();
      if (!u) return;
      setSyncUser(u.id);
      try {
        await syncOnLoad();
      } catch {
        /* offline — keep local */
      }
      setSavedState(getSaved());
      const s = loadLS();
      if (typeof s.speed === "number") setSpeedState(s.speed);
      if (typeof s.font === "number") setFontState(s.font);
      if (s.fontFace === "serif" || s.fontFace === "sans") setFontFaceState(s.fontFace);
      if (typeof s.barOpen === "boolean") setBarOpenState(s.barOpen);
      if (typeof s.enhance === "boolean") setEnhanceState(s.enhance);
      if (typeof s.seasonalOn === "boolean") setSeasonalOnState(s.seasonalOn);
      if (typeof s.voiceRate === "number") setVoiceRateState(s.voiceRate);
      if (typeof s.voiceURI === "string") setVoiceURIState(s.voiceURI);
      if (s.nameStyle === "hashem" || s.nameStyle === "adonai")
        setNameStyleState(s.nameStyle);
      if (s.theme === "light" || s.theme === "dark") setTheme(s.theme);
      stop = startSyncLoop();
    })();
    return () => stop?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

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
    // today: the day's portion + the seasonal addition + your saved Psalms,
    // so Daily Tehillim is one destination for everything said each day.
    const combine = hebToday?.combine ?? false;
    const day = hebToday?.day ?? 1;
    const out: Group[] = [{ segments: segmentsForDay(day, combine) }];
    if (hebToday && seasonalOn) {
      const add = seasonalAddition(hebToday.month, hebToday.day);
      if (add) {
        out.push({
          title: add.title,
          note: add.note,
          segments: add.chapters.map((c) => ({ chapter: c })),
        });
      }
    }
    if (saved.length) {
      out.push({
        title: "תְּהִלִּים שְׁמוּרִים",
        note: "Your saved Psalms",
        segments: saved.map((s) => ({ chapter: s.ch })),
      });
    }
    return out;
  }, [sel, hebToday, saved, seasonalOn]);

  // Flat, ordered list of verses to read aloud — ids match the rendered DOM.
  const readItems = useMemo(() => {
    const items: { id: string; text: string }[] = [];
    groups.forEach((g, gi) => {
      g.segments.forEach((seg, si) => {
        const verses = TEXT[String(seg.chapter)] ?? [];
        const from = seg.from ?? 1;
        const to = seg.to ?? verses.length;
        verses.slice(from - 1, to).forEach((v, idx) => {
          items.push({ id: readId(gi, si, from + idx), text: v });
        });
      });
    });
    return items;
  }, [groups]);
  const readItemsRef = useRef(readItems);
  readItemsRef.current = readItems;

  // ---- Voices: load the device's Hebrew voices (async on some browsers) ----
  const speechOK =
    typeof window !== "undefined" && "speechSynthesis" in window;
  useEffect(() => {
    if (!speechOK) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    const t = setTimeout(load, 250);
    return () => {
      clearTimeout(t);
      window.speechSynthesis.removeEventListener("voiceschanged", load);
    };
  }, [speechOK]);

  const hebrewVoices = useMemo(
    () => voices.filter((v) => v.lang?.toLowerCase().startsWith("he")),
    [voices]
  );
  // The voice we'll actually speak with: the saved choice, else an on-device
  // one (Carmit et al.), else the first Hebrew voice.
  const chosenVoice = useMemo(() => {
    if (!hebrewVoices.length) return null;
    return (
      hebrewVoices.find((v) => v.voiceURI === voiceURI) ||
      hebrewVoices.find((v) => v.localService) ||
      hebrewVoices[0]
    );
  }, [hebrewVoices, voiceURI]);
  const chosenVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  chosenVoiceRef.current = chosenVoice;

  // Speak verse i, then chain to i+1 on end. Reads live values from refs so a
  // stale closure (from a re-render mid-read) still uses the current voice/rate.
  const speakFrom = useCallback((i: number) => {
    const items = readItemsRef.current;
    if (!readingRef.current || i >= items.length) {
      readingRef.current = false;
      setReading(false);
      setCurrentReadId(null);
      return;
    }
    const item = items[i];
    const u = new SpeechSynthesisUtterance(
      speakText(item.text, nameStyleRef.current)
    );
    const v = chosenVoiceRef.current;
    if (v) u.voice = v;
    u.lang = v?.lang || "he-IL";
    u.rate = voiceRateRef.current;
    u.onstart = () => {
      setCurrentReadId(item.id);
      document
        .getElementById(item.id)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    u.onend = () => {
      if (readingRef.current) speakFrom(i + 1);
    };
    u.onerror = (e) => {
      const err = (e as SpeechSynthesisErrorEvent).error;
      if (err === "interrupted" || err === "canceled") return;
      readingRef.current = false;
      setReading(false);
      setCurrentReadId(null);
    };
    window.speechSynthesis.speak(u);
  }, []);

  const stopReading = useCallback(() => {
    readingRef.current = false;
    setReading(false);
    setCurrentReadId(null);
    if (speechOK) window.speechSynthesis.cancel();
  }, [speechOK]);

  // Start from the first verse whose element is at/below the top of the view,
  // so tapping play reads from where you're looking (not always the top).
  const startReading = useCallback(() => {
    if (!speechOK || !chosenVoiceRef.current) return;
    setPlaying(false); // auto-scroll and read-aloud are mutually exclusive
    setActiveMode("voice");
    const items = readItemsRef.current;
    let start = 0;
    for (let k = 0; k < items.length; k++) {
      const el = document.getElementById(items[k].id);
      if (el && el.getBoundingClientRect().bottom > 90) {
        start = k;
        break;
      }
    }
    const synth = window.speechSynthesis;
    // Speak synchronously in the click; only cancel if something's still going
    // (a cancel + same-tick speak races and drops the utterance in Chromium).
    if (synth.speaking || synth.pending) synth.cancel();
    synth.resume();
    readingRef.current = true;
    setReading(true);
    speakFrom(start);
  }, [speechOK, speakFrom]);

  // Stop scrolling on selection change; restore saved position on first load only.
  useEffect(() => {
    if (!ready) return;
    setPlaying(false);
    stopReading();
    if (pendingScroll.current != null) {
      window.scrollTo(0, pendingScroll.current);
      pendingScroll.current = null;
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [sel, ready, stopReading]);

  // Silence the voice if the reader unmounts.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
        saveLS({
          scroll: {
            key: selKey(selRef.current, todayKeyRef.current),
            y: window.scrollY,
          },
        });
      }, 250);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, [ready]);

  const setSpeed = useCallback((v: number) => {
    const s = Math.max(SPEED_MIN, Math.min(SPEED_MAX, +v.toFixed(3)));
    setSpeedState(s);
    saveLS({ speed: s });
    queueSync();
  }, []);
  const setSpeedPct = useCallback(
    (pct: number) => {
      if (!Number.isFinite(pct)) return;
      setSpeed(pctToSpeed(pct));
    },
    [setSpeed]
  );
  const setFont = useCallback((v: number) => {
    const f = Math.max(FONT_MIN, Math.min(FONT_MAX, +v.toFixed(2)));
    setFontState(f);
    saveLS({ font: f });
    queueSync();
  }, []);
  const setFontFace = useCallback((v: FontFace) => {
    setFontFaceState(v);
    saveLS({ fontFace: v });
    queueSync();
  }, []);
  const setBarOpen = useCallback((v: boolean) => {
    setBarOpenState(v);
    saveLS({ barOpen: v });
    queueSync();
  }, []);
  const onToggleSave = useCallback((ch: number) => {
    setSavedState(toggleSaved(ch));
    queueSync();
  }, []);
  const setEnhance = useCallback((v: boolean) => {
    setEnhanceState(v);
    saveLS({ enhance: v });
    queueSync();
  }, []);
  const setVoiceRate = useCallback((v: number) => {
    const r = Math.max(VRATE_MIN, Math.min(VRATE_MAX, +v.toFixed(2)));
    setVoiceRateState(r);
    saveLS({ voiceRate: r });
    queueSync();
  }, []);
  const setVoiceURI = useCallback((v: string) => {
    setVoiceURIState(v);
    saveLS({ voiceURI: v });
    queueSync();
  }, []);
  const setNameStyle = useCallback((v: NameStyle) => {
    setNameStyleState(v);
    saveLS({ nameStyle: v });
    queueSync();
  }, []);

  // One speed control, two meanings: it drives the voice rate while reading
  // aloud, and the auto-scroll speed otherwise.
  const voiceMode = activeMode === "voice";
  const shownPct = voiceMode ? vRateToPct(voiceRate) : speedToPct(speed);
  const applyPct = useCallback((pct: number) => {
    if (activeModeRef.current === "voice") setVoiceRate(pctToVRate(pct));
    else setSpeedPct(pct);
  }, [setVoiceRate, setSpeedPct]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur =
        activeMode === "voice" ? vRateToPct(voiceRate) : speedToPct(speed);
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => {
          if (!p) stopReading();
          return !p;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        applyPct(cur + PCT_STEP);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        applyPct(cur - PCT_STEP);
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
  }, [speed, voiceRate, activeMode, font, applyPct, setFont, stopReading]);

  // ---- Read-time estimate (like Substack): time to auto-scroll top→bottom ----
  useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(() => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 4) {
        setReadMin(null);
        return;
      }
      const seconds = scrollable / (speed * FPS);
      setReadMin(seconds / 60);
    });
    return () => cancelAnimationFrame(id);
  }, [ready, sel, font, groups, speed]);

  // ---- Keep the screen awake while auto-scrolling or reading aloud ----
  const awake = playing || reading;
  useEffect(() => {
    let cancelled = false;
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator && awake && !cancelled) {
          wakeRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* not supported / denied — ignore */
      }
    };
    const release = () => {
      try {
        wakeRef.current?.release();
      } catch {
        /* ignore */
      }
      wakeRef.current = null;
    };
    if (awake) acquire();
    else release();
    // Re-acquire when returning to the tab (the lock drops when hidden).
    const onVis = () => {
      if (document.visibilityState === "visible" && awake) acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      release();
    };
  }, [awake]);

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
      case "saved":
        return "תְּהִלִּים שְׁמוּרִים";
    }
  })();

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

          <div className="spacer" />

          <label className="jump fontface">
            <span className="jump-label">Font</span>
            <select
              value={fontFace}
              onChange={(e) => setFontFace(e.target.value as FontFace)}
              title="Reading font"
            >
              <option value="serif">Traditional</option>
              <option value="sans">Clean</option>
            </select>
          </label>

          {speechOK && hebrewVoices.length > 0 && (
            <>
              <label className="jump voicepick">
                <span className="jump-label" aria-hidden>
                  🔊
                </span>
                <select
                  value={chosenVoice?.voiceURI || ""}
                  onChange={(e) => setVoiceURI(e.target.value)}
                  title="Reading voice"
                  aria-label="Reading voice"
                >
                  {hebrewVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="jump namestyle">
                <span className="jump-label">ה׳</span>
                <select
                  value={nameStyle}
                  onChange={(e) => setNameStyle(e.target.value as NameStyle)}
                  title="How the reading voice says the Divine Name"
                  aria-label="How to say the Divine Name"
                >
                  <option value="hashem">Hashem</option>
                  <option value="adonai">Adonai</option>
                </select>
              </label>
            </>
          )}

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
        style={
          {
            ["--fs" as string]: font,
            fontFamily: FONT_STACKS[fontFace],
          } as React.CSSProperties
        }
      >
        {ready && (
          <>
            <p className="selheading">{overallHeading}</p>

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
                          const vid = readId(gi, i, vn);
                          return (
                            <p
                              key={vn}
                              id={vid}
                              className={`verse ${currentReadId === vid ? "speaking" : ""}`}
                            >
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
                {sel.type === "today" || sel.type === "day"
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
        {readMin != null && (
          <span className="fab-time" title="Estimated time at this speed">
            ~{readMin < 1 ? "<1" : Math.round(readMin)} min
          </span>
        )}
        <div className={`fab-speed ${voiceMode ? "voice-mode" : ""}`}>
          <button
            type="button"
            className="fab-step"
            onClick={() => applyPct(shownPct - PCT_STEP)}
            title="Slower"
            aria-label="Slower"
          >
            −
          </button>
          <span className="fab-pctwrap">
            {voiceMode && (
              <span className="fab-speed-ic" aria-hidden title="Voice speed">
                🔊
              </span>
            )}
            <input
              className="fab-pct"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={shownPct}
              onChange={(e) => {
                if (e.target.value === "") return;
                applyPct(Number(e.target.value));
              }}
              aria-label={voiceMode ? "Voice speed percent" : "Auto-scroll speed percent"}
              title={
                voiceMode
                  ? "Voice speed (0–100%)"
                  : "Auto-scroll speed (0–100%)"
              }
            />
            <span className="fab-pctsign">%</span>
          </span>
          <button
            type="button"
            className="fab-step"
            onClick={() => applyPct(shownPct + PCT_STEP)}
            title="Faster"
            aria-label="Faster"
          >
            +
          </button>
        </div>
        <div className="fab-plays">
          {speechOK && chosenVoice && (
            <button
              type="button"
              className={`fab-read ${reading ? "fab-read-on" : ""}`}
              onClick={() => (reading ? stopReading() : startReading())}
              title={reading ? "Stop reading aloud" : "Read aloud"}
              aria-pressed={reading}
              aria-label={reading ? "Stop reading aloud" : "Read aloud"}
            >
              {reading ? "❚❚" : "🔊"}
            </button>
          )}
          <button
            type="button"
            className={`fab-play ${playing ? "fab-play-on" : ""}`}
            onClick={() =>
              setPlaying((p) => {
                if (!p) {
                  stopReading();
                  setActiveMode("scroll");
                }
                return !p;
              })
            }
            title={playing ? "Pause (Space)" : "Auto-scroll (Space)"}
            aria-label={playing ? "Pause auto-scroll" : "Start auto-scroll"}
          >
            {playing ? "❚❚" : "▶"}
          </button>
        </div>
      </div>
    </div>
  );
}
