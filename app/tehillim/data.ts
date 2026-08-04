import raw from "./tehillim.json";

// Full Hebrew text of Tehillim (Psalms 1–150), Masoretic (MAM, via Sefaria, CC-BY-SA).
// Shape: { "1": ["verse1", "verse2", ...], ... , "150": [...] }
export const TEXT = raw as Record<string, string[]>;

export const CHAPTER_COUNT = 150;

// ---- Daily portions by day of the Hebrew month (the classic Tehillim division) ----
// A segment is a whole chapter, or a chapter limited to a verse range (used to split
// Psalm 119 across days 25 and 26).
export type Segment = { chapter: number; from?: number; to?: number };

export const DAILY: Record<number, Segment[]> = {
  1: range(1, 9),
  2: range(10, 17),
  3: range(18, 22),
  4: range(23, 28),
  5: range(29, 34),
  6: range(35, 38),
  7: range(39, 43),
  8: range(44, 48),
  9: range(49, 54),
  10: range(55, 59),
  11: range(60, 65),
  12: range(66, 68),
  13: range(69, 71),
  14: range(72, 76),
  15: range(77, 78),
  16: range(79, 82),
  17: range(83, 87),
  18: range(88, 89),
  19: range(90, 96),
  20: range(97, 103),
  21: range(104, 105),
  22: range(106, 107),
  23: range(108, 112),
  24: range(113, 118),
  25: [{ chapter: 119, from: 1, to: 96 }],
  26: [{ chapter: 119, from: 97, to: 176 }],
  27: range(120, 134),
  28: range(135, 139),
  29: range(140, 144),
  30: range(145, 150),
};

function range(a: number, b: number): Segment[] {
  const out: Segment[] = [];
  for (let c = a; c <= b; c++) out.push({ chapter: c });
  return out;
}

// Segments for a given Hebrew day. When `combineLast` is true (a 29-day month),
// day 29 also carries day 30's chapters so nothing is skipped.
export function segmentsForDay(day: number, combineLast = false): Segment[] {
  if (combineLast && day === 29) return [...DAILY[29], ...DAILY[30]];
  return DAILY[day] ?? [];
}

// ---- Hebrew numerals (gematria) ----
const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];

// Bare Hebrew number, 1–499 (covers chapters 1–150 and days 1–30).
export function hebNumber(n: number): string {
  let s = "";
  let r = n;
  while (r >= 100) {
    s += "ק"; // 100; max input here is 150 so at most one hundred
    r -= 100;
  }
  if (r === 15) return s + "טו";
  if (r === 16) return s + "טז";
  s += TENS[Math.floor(r / 10)];
  s += ONES[r % 10];
  return s;
}

// Hebrew number with geresh / gershayim punctuation, e.g. 21 -> כ״א, 5 -> ה׳.
export function hebNumberPunct(n: number): string {
  const s = hebNumber(n);
  if (s.length === 1) return s + "׳";
  return s.slice(0, -1) + "״" + s.slice(-1);
}
