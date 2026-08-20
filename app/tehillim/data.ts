import raw from "./tehillim.json";

// Full Hebrew text of Tehillim (Psalms 1–150), Masoretic (MAM, via Sefaria, CC-BY-SA).
// Shape: { "1": ["verse1", "verse2", ...], ... , "150": [...] }
export const TEXT = raw as Record<string, string[]>;

export const CHAPTER_COUNT = 150;

// ---- Daily portions by day of the Hebrew month (the classic Tehillim division) ----
// A segment is a whole chapter, or a chapter limited to a verse range (used to split
// Psalm 119 across days 25 and 26). `label` overrides the section heading (used to
// show the acrostic letter in "Tehillim for a name" mode).
export type Segment = { chapter: number; from?: number; to?: number; label?: string };

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

function seq(a: number, b: number): number[] {
  const out: number[] = [];
  for (let n = a; n <= b; n++) out.push(n);
  return out;
}

// ---- Seasonal Tehillim: the Chabad (Alter Rebbe's) custom ----
// From 1 Elul until Yom Kippur one says three chapters of Tehillim a day, in order
// (1 Elul → 1-3, 2 Elul → 4-6, …), continuing through the Ten Days of Repentance,
// and on Yom Kippur the remaining 36 chapters (115-150), completing the book.
// Elul is always 29 days and Tishrei 1-9 add 9 more, so 38 days × 3 = 114 chapters
// are said by Erev Yom Kippur, leaving exactly 36 for Yom Kippur itself.
export type SeasonKind = "elul" | "aseret" | "yomkippur";

export type SeasonAddition = {
  kind: SeasonKind;
  chapters: number[];
  title: string; // Hebrew heading
  note: string; // English sub-note
  dayIndex: number; // 1 Elul = 1 … 9 Tishrei = 38, Yom Kippur = 39
  dayLabel: string; // e.g. "Day 12 of Elul"
  shortLabel: string; // e.g. "Elul" — for chips and buttons
};

// 29 days of Elul + Tishrei 1–9 + Yom Kippur itself.
export const SEASON_DAYS = 39;

// The three chapters for the n-th day of the count (day 1 → 1-3, day 2 → 4-6, …).
function threeFor(index: number): number[] {
  const start = 3 * (index - 1) + 1;
  return seq(start, start + 2);
}

// `monthName` is the Hebrew-calendar month from Intl (e.g. "Elul", "Tishri").
export function seasonalAddition(
  monthName: string,
  day: number
): SeasonAddition | null {
  const m = monthName.toLowerCase();
  if (m.startsWith("elul") && day >= 1 && day <= 29) {
    return {
      kind: "elul",
      chapters: threeFor(day),
      title: "תְּהִלִּים לְחוֹדֶשׁ אֱלוּל",
      note: "Elul — three chapters a day, in order, from Rosh Chodesh Elul",
      dayIndex: day,
      dayLabel: `Day ${day} of Elul`,
      shortLabel: "Elul",
    };
  }
  if (m.startsWith("tishri") || m.startsWith("tishrei")) {
    if (day === 10) {
      return {
        kind: "yomkippur",
        chapters: seq(115, 150),
        title: "תְּהִלִּים לְיוֹם הַכִּפּוּרִים",
        note:
          "Yom Kippur — the last 36 chapters, in four sets of nine, completing the Tehillim",
        dayIndex: SEASON_DAYS,
        dayLabel: "Yom Kippur",
        shortLabel: "Yom Kippur",
      };
    }
    if (day >= 1 && day <= 9) {
      const idx = 29 + day; // continues the sequential count after Elul's 29 days
      return {
        kind: "aseret",
        chapters: threeFor(idx),
        title: "תְּהִלִּים לַעֲשֶׂרֶת יְמֵי תְּשׁוּבָה",
        note: "Ten Days of Repentance — three chapters a day, continuing the Elul count",
        dayIndex: idx,
        dayLabel: `${day} Tishrei — Ten Days of Repentance`,
        shortLabel: "Ten Days",
      };
    }
  }
  return null;
}

// Yom Kippur's 36 are said at four points in the day, nine at a time.
export const YOM_KIPPUR_SETS: {
  from: number;
  to: number;
  title: string;
  note: string;
}[] = [
  { from: 115, to: 123, title: "לִפְנֵי כָּל נִדְרֵי", note: "Nine before Kol Nidrei" },
  { from: 124, to: 132, title: "לִפְנֵי הַשֵּׁנָה", note: "Nine before sleep" },
  { from: 133, to: 141, title: "אַחַר מוּסָף", note: "Nine after Musaf" },
  { from: 142, to: 150, title: "אַחַר נְעִילָה", note: "Nine after Ne'ilah" },
];

// How far through the 150 the count has reached, counting today's chapters.
export function seasonProgress(add: SeasonAddition): {
  said: number;
  remaining: number;
  pct: number;
} {
  const said = add.chapters[add.chapters.length - 1];
  return {
    said,
    remaining: CHAPTER_COUNT - said,
    pct: Math.round((said / CHAPTER_COUNT) * 100),
  };
}

// Whole-chapter segments for an inclusive chapter range.
export function chapterSegments(from: number, to: number): Segment[] {
  return seq(from, to).map((chapter) => ({ chapter }));
}

// ---- Tehillim for a name: Psalm 119 by the letters of a Hebrew name ----
// Psalm 119 is an acrostic: 22 stanzas of 8 verses, one per Hebrew letter. The custom
// is to recite the stanzas spelling a person's Hebrew name, then (for a sick person) the
// stanzas of קרע שטן, or (in memory of the departed) the stanzas of נשמה.
const STANZA: Record<string, [number, number]> = {
  א: [1, 8], ב: [9, 16], ג: [17, 24], ד: [25, 32], ה: [33, 40], ו: [41, 48],
  ז: [49, 56], ח: [57, 64], ט: [65, 72], י: [73, 80], כ: [81, 88], ל: [89, 96],
  מ: [97, 104], נ: [105, 112], ס: [113, 120], ע: [121, 128], פ: [129, 136],
  צ: [137, 144], ק: [145, 152], ר: [153, 160], ש: [161, 168], ת: [169, 176],
};
const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

export const KERA_SATAN = "קרעשטן"; // ק ר ע ש ט ן  ("tear up the accuser")
export const NESHAMA = "נשמה"; //     נ ש מ ה  (soul)

// Pull the recognised Hebrew letters out of free text (ignoring nikkud, spaces,
// punctuation, and any non-Hebrew characters), folding final forms to their base.
export function nameLetters(input: string): string[] {
  const out: string[] = [];
  for (const ch of input) {
    const c = FINALS[ch] ?? ch;
    if (STANZA[c]) out.push(c);
  }
  return out;
}

// Segments (all within Psalm 119) for a list of already-normalised base letters.
export function stanzasForLetters(letters: string[]): Segment[] {
  return letters.map((c) => {
    const [from, to] = STANZA[c];
    return { chapter: 119, from, to, label: c };
  });
}

export function hasValidNameLetters(input: string): boolean {
  return nameLetters(input).length > 0;
}

// ---- Liturgical Psalms: the ones woven throughout the prayer book ----
// These recur across the services and are familiar enough that most people read
// them faster. Used by the "auto-scroll enhancement" (familiar Psalms +15%).
// The note records where each appears (shown on hover). Nusach varies, so this
// list is meant to be a sensible, editable default.
export const LITURGICAL: Record<number, string> = {
  19: "Pesukei DeZimra (Shabbos & Yom Tov)",
  20: "Lamnatze'ach — weekday Shacharis",
  23: "Mizmor LeDavid — Shabbos meals; widely sung",
  24: "Shir shel Yom — Sunday; returning the Torah",
  25: "Recited at Tachanun (weekday)",
  27: "LeDavid Hashem Ori — twice daily, Elul through Hoshana Rabbah",
  29: "Kabbalas Shabbos; returning the Torah",
  30: "Mizmor Shir Chanukas HaBayis — daily before Baruch She'amar",
  33: "Pesukei DeZimra (Shabbos & Yom Tov)",
  34: "Pesukei DeZimra (Shabbos); Torah procession",
  35: "Commonly recited (Tehillim for the sick)",
  47: "Recited seven times before the shofar",
  48: "Shir shel Yom — Monday",
  51: "Selichos & Tachanun — repentance",
  67: "Lamnatze'ach Bineginos — recited frequently",
  81: "Shir shel Yom — Thursday",
  82: "Shir shel Yom — Tuesday",
  86: "Tefilla LeDavid — recited widely",
  90: "Pesukei DeZimra (Shabbos & Yom Tov)",
  91: "Yoshev BeSeser — Shabbos Pesukei DeZimra; bedtime Shema",
  92: "Shir shel Yom — Shabbos; Kabbalas Shabbos",
  93: "Shir shel Yom — Friday; Kabbalas Shabbos",
  94: "Shir shel Yom — Wednesday",
  95: "Kabbalas Shabbos (Lechu Neranena)",
  96: "Kabbalas Shabbos",
  97: "Kabbalas Shabbos",
  98: "Kabbalas Shabbos",
  99: "Kabbalas Shabbos",
  100: "Mizmor LeToda — Pesukei DeZimra (weekday)",
  104: "Barchi Nafshi — Rosh Chodesh; Shabbos Minchah (winter)",
  107: "Hodu LaShem — festivals",
  113: "Hallel (festivals & Rosh Chodesh)",
  114: "Hallel (festivals & Rosh Chodesh)",
  115: "Hallel (festivals & Rosh Chodesh)",
  116: "Hallel (festivals & Rosh Chodesh)",
  117: "Hallel (festivals & Rosh Chodesh)",
  118: "Hallel (festivals & Rosh Chodesh)",
  120: "Shir Hama'alos — Shabbos Minchah (winter)",
  121: "Shir Lama'alos — bedtime & travel",
  122: "Shir Hama'alos — Shabbos Minchah (winter)",
  123: "Shir Hama'alos — Shabbos Minchah (winter)",
  124: "Shir Hama'alos — Shabbos Minchah (winter)",
  125: "Shir Hama'alos — Shabbos Minchah (winter)",
  126: "Shir Hama'alos — before Birkas Hamazon (Shabbos/Yom Tov)",
  127: "Shir Hama'alos — Shabbos Minchah (winter)",
  128: "Shir Hama'alos — after davening; weddings",
  129: "Shir Hama'alos — Shabbos Minchah (winter)",
  130: "MiMa'amakim — Aseres Yemei Teshuvah",
  135: "Pesukei DeZimra (Shabbos & Yom Tov)",
  136: "Hallel HaGadol — Pesukei DeZimra (Shabbos)",
  137: "Al Naharos Bavel — before Birkas Hamazon (weekday)",
  145: "Ashrei — recited three times daily",
  146: "Pesukei DeZimra (daily)",
  147: "Pesukei DeZimra (daily)",
  148: "Pesukei DeZimra (daily)",
  149: "Pesukei DeZimra (daily)",
  150: "Pesukei DeZimra (daily)",
};

export function isLiturgical(ch: number): boolean {
  return Object.prototype.hasOwnProperty.call(LITURGICAL, ch);
}
