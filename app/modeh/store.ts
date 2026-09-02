// Local storage for the morning sit. Everything lives on the device: settings,
// the written answers, and the streak. No account, no server, nothing leaves
// the phone — which is the right default for a page where somebody writes down
// what they're grateful for and what they're bound by.

import { DEFAULT_OPTS, type Length, type NameStyle, type Nusach, type Voice } from "./blessings";

const SETTINGS_KEY = "modeh.settings.v1";
const JOURNAL_KEY = "modeh.journal.v1";

export type Settings = {
  voice: Voice;
  nusach: Nusach;
  nameStyle: NameStyle;
  length: Length;
  longForm: boolean;
  showTranslit: boolean;
  showEnglish: boolean;
  breath: boolean;
  theme: "light" | "dark" | "system";
};

export const DEFAULT_SETTINGS: Settings = {
  voice: DEFAULT_OPTS.voice,
  nusach: DEFAULT_OPTS.nusach,
  nameStyle: DEFAULT_OPTS.nameStyle,
  length: "full",
  longForm: true,
  showTranslit: true,
  showEnglish: true,
  breath: true,
  theme: "system",
};

export function getSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the session still works, it just won't be remembered */
  }
  return next;
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

export type Entry = {
  /** Local calendar day, YYYY-MM-DD — one entry per day. */
  date: string;
  /** Hebrew date label as of that morning, for the way it reads back later. */
  hebrew?: string;
  /** Written answers, keyed by station id. `_intention` holds the closing line. */
  notes: Record<string, string>;
  /** Set once the sit was carried through to the end. */
  completed: boolean;
  /** Seconds spent in the sit. */
  seconds: number;
  /** Stations in the sit, so a short day reads back as a short day. */
  stations: number;
  updatedAt: number;
};

/** Closing if-then plan: the trigger and the action, kept apart so the journal
 *  can print them back as one sentence. `INTENTION` is the older single-field
 *  form and is still read back for mornings written before the change. */
export const WHEN = "_when";
export const THEN = "_then";
export const INTENTION = "_intention";

/** The closing line for an entry, however it was written. */
export function intentionOf(notes: Record<string, string>): string {
  const w = notes[WHEN]?.trim();
  const t = notes[THEN]?.trim();
  if (w && t) return `When ${w}, I will ${t}.`;
  if (t) return `I will ${t}.`;
  if (w) return `When ${w}…`;
  return notes[INTENTION]?.trim() || "";
}

/** Keys the journal should not label with a station title. */
export const CLOSING_KEYS = [WHEN, THEN, INTENTION];

export function todayKey(d = new Date()): string {
  // Local date, not UTC — a 6am sit must land on today, not yesterday.
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function getJournal(): Entry[] {
  try {
    const v = JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]");
    if (!Array.isArray(v)) return [];
    return v
      .filter((e) => e && typeof e.date === "string")
      .map((e) => ({
        date: e.date,
        hebrew: typeof e.hebrew === "string" ? e.hebrew : undefined,
        notes: e.notes && typeof e.notes === "object" ? e.notes : {},
        completed: !!e.completed,
        seconds: typeof e.seconds === "number" ? e.seconds : 0,
        stations: typeof e.stations === "number" ? e.stations : 0,
        updatedAt: typeof e.updatedAt === "number" ? e.updatedAt : 0,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
  } catch {
    return [];
  }
}

function writeJournal(list: Entry[]): void {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function getEntry(date = todayKey()): Entry | undefined {
  return getJournal().find((e) => e.date === date);
}

/** Merge a patch into today's entry (creating it if this is the first note). */
export function upsertEntry(patch: Partial<Entry>, date = todayKey()): Entry {
  const list = getJournal();
  const i = list.findIndex((e) => e.date === date);
  const base: Entry =
    i >= 0
      ? list[i]
      : { date, notes: {}, completed: false, seconds: 0, stations: 0, updatedAt: 0 };
  const next: Entry = {
    ...base,
    ...patch,
    notes: { ...base.notes, ...(patch.notes || {}) },
    updatedAt: Date.now(),
  };
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  writeJournal(list);
  return next;
}

export function setNote(stationId: string, text: string, date = todayKey()): Entry {
  const t = text.trim();
  const entry = getEntry(date);
  const notes = { ...(entry?.notes || {}) };
  if (t) notes[stationId] = t;
  else delete notes[stationId];
  const list = getJournal();
  const i = list.findIndex((e) => e.date === date);
  const next: Entry = {
    date,
    hebrew: entry?.hebrew,
    completed: entry?.completed ?? false,
    seconds: entry?.seconds ?? 0,
    stations: entry?.stations ?? 0,
    notes,
    updatedAt: Date.now(),
  };
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  writeJournal(list);
  return next;
}

export function deleteEntry(date: string): Entry[] {
  const list = getJournal().filter((e) => e.date !== date);
  writeJournal(list);
  return list;
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return todayKey(dt);
}

export type Stats = { streak: number; total: number; longest: number };

/**
 * Current streak counts back from today; a sit not yet done today doesn't break
 * a streak until tomorrow, so the count starts at yesterday when today is empty.
 */
export function stats(list = getJournal()): Stats {
  const done = new Set(list.filter((e) => e.completed).map((e) => e.date));
  const today = todayKey();

  let streak = 0;
  let cursor = done.has(today) ? today : shiftDay(today, -1);
  while (done.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }

  // Longest run anywhere in the history.
  const days = [...done].sort();
  let longest = 0;
  let run = 0;
  let prev = "";
  for (const d of days) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }

  return { streak, total: done.size, longest };
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export function hebrewDateLabel(d = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-u-ca-hebrew", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

export function englishDateLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  try {
    return new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date(y, m - 1, d));
  } catch {
    return key;
  }
}

/** "Good morning" until noon, then something that isn't a lie. */
export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
