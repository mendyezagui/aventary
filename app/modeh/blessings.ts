// ---------------------------------------------------------------------------
// Birchot HaShachar — the morning blessings, arranged as a guided sit.
//
// Each station carries the liturgy (Hebrew / transliteration / plain English)
// and, beside it, the introspection: what this blessing is noticing, one thing
// to do while you say it, and — on some — a question worth answering in
// writing.
//
// ---------------------------------------------------------------------------
// TEXT SOURCES (all three nusachim transcribed from printed siddurim)
//
//   Ari (Chabad)  Siddur Torah Or (Schulzinger Bros. 1940), the Alter Rebbe's
//                 siddur, via he.wikisource.org/wiki/סידור_תורה_אור/ברכות_השחר
//                 and .../השכמת_הבוקר
//   Ashkenaz      The Metsudah Siddur (1981), via Sefaria, "Siddur Ashkenaz,
//                 Weekday, Shacharit, Preparatory Prayers"
//   Sefard        he.wikisource.org/wiki/סידור/נוסח_ספרד/פתיחת_התפילה_-_שחרית
//
// The three differ in ORDER as well as wording. The big one: in Nusach Ari the
// three blessings of identity (שלא עשני גוי / עבד / אשה) come near the END of
// the sequence, right before המעביר שינה, while Ashkenaz and Sefard put them
// second, straight after the blessing on the rooster. That is why the order is
// data here and not a hard-coded array.
//
// Where a nusach is not given its own variant below, the sources agree and the
// shared text is used. Ashkenaz and Sefard share the order of the fifteen; they
// part on small wordings (גּוֹמֵל vs הַגּוֹמֵל at the end of Vihi Ratzon,
// לַעֲסֹק בְּדִבְרֵי תוֹרָה vs עַל דִּבְרֵי תוֹרָה in the Torah blessings).
//
// PROOFREAD NOTE: the pointed Hebrew below was transcribed by hand from those
// sources. Check it against your own siddur before leaning on it for davening.
// ---------------------------------------------------------------------------

export type Voice = "male" | "female";
export type Nusach = "ari" | "ashkenaz" | "sefard";
export type NameStyle = "full" | "reverent";
export type Length = "short" | "full";

/**
 * How far into each blessing the sit goes. This is not a scale of learning —
 * nobody is being taught here. It is how much room you are given to notice.
 *   quiet   the words and one thing to do while you say them
 *   guided  what the blessing is noticing, and a question on some of them
 *   deep    a second layer on every blessing, and a question on every one
 */
export type Depth = "quiet" | "guided" | "deep";

export type Opts = {
  voice: Voice;
  nusach: Nusach;
  nameStyle: NameStyle;
};

export const DEFAULT_OPTS: Opts = {
  voice: "male",
  nusach: "ari",
  nameStyle: "full",
};

export const NUSACH_LABEL: Record<Nusach, string> = {
  ari: "Ari · Chabad",
  ashkenaz: "Ashkenaz",
  sefard: "Sefard",
};

// ---------------------------------------------------------------------------
// The Name
//
// {H} is the Tetragrammaton, {E} is "our God". A siddur you daven from prints
// them in full; a screen you are only reading from is usually written with the
// substitutions. That is the `nameStyle` setting — and it moves the
// transliteration and the English along with the Hebrew, so the three never
// disagree with each other.
// ---------------------------------------------------------------------------

const NAMES = {
  full: { he: "יְיָ", tr: "Adonai", en: "Lord" },
  reverent: { he: "ה׳", tr: "Hashem", en: "Hashem" },
} as const;

// The Name where an English sentence needs an article in front of it — a verse
// that says "the Lord spoke", as against the blessing formula's vocative
// "Blessed are You, Lord our God". Identical to {H} in Hebrew and in
// transliteration; only the English differs.
const NAMES_NARRATIVE = {
  full: { he: "יְיָ", tr: "Adonai", en: "the Lord" },
  reverent: { he: "ה׳", tr: "Hashem", en: "Hashem" },
} as const;

const OURGOD = {
  full: { he: "אֱלֹהֵינוּ", tr: "Eloheinu", en: "our God" },
  reverent: { he: "אֱלֹקֵינוּ", tr: "Elokeinu", en: "our God" },
} as const;

// In reverent mode the Name has to move everywhere it appears, not only where a
// {E} token was written — otherwise the text comes out half-substituted, which
// is the one outcome nobody wants. Exact strings rather than a clever regex:
// these are the only forms that occur in the liturgy below, and a regex over
// א־ל־ה would eventually catch a word that isn't the Name.
const SANCTIFY_HE: [string, string][] = [
  ["אֱלֹהֵינוּ", "אֱלֹקֵינוּ"],
  ["אֱלֹהַי", "אֱלֹקַי"],
  ["וֵאלֹהֵי", "וֵאלֹקֵי"],
  ["אֱלֹהֵי", "אֱלֹקֵי"],
  ["אֱלֹהִים", "אֱלֹקִים"],
];

const SANCTIFY_TR: [string, string][] = [
  ["Eloheinu", "Elokeinu"],
  ["Elohai", "Elokai"],
  ["vElohei", "vElokei"],
  ["Elohei", "Elokei"],
];

function sanctify(s: string, pairs: [string, string][]): string {
  return pairs.reduce((acc, [from, to]) => acc.split(from).join(to), s);
}

/**
 * Explanatory words are written inline in the English, inside ⟪ ⟫. Plain mode
 * strips them; explained mode keeps the markers and the reader's component
 * renders what is inside them in a lighter tone.
 *
 * One source string rather than two translations: the plain reading and the
 * explained one can never drift apart, and every nusach and voice variant gets
 * the explanation for free.
 */
export const EXPLAIN_OPEN = "\u27ea";
export const EXPLAIN_CLOSE = "\u27eb";

export function stripExplain(s: string): string {
  return s.replace(/\u27ea[^\u27eb]*\u27eb/g, "");
}

/** Split an English line into plain and explanatory runs, for rendering. */
export function explainRuns(s: string): { text: string; added: boolean }[] {
  const out: { text: string; added: boolean }[] = [];
  const re = /\u27ea([^\u27eb]*)\u27eb/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), added: false });
    out.push({ text: m[1], added: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), added: false });
  return out;
}

export function resolve(s: string, o: Opts, lang: "he" | "tr" | "en"): string {
  const out = s
    .replace(/\{HN\}/g, NAMES_NARRATIVE[o.nameStyle][lang])
    .replace(/\{H\}/g, NAMES[o.nameStyle][lang])
    .replace(/\{E\}/g, OURGOD[o.nameStyle][lang]);
  if (o.nameStyle !== "reverent") return out;
  if (lang === "he") return sanctify(out, SANCTIFY_HE);
  if (lang === "tr") return sanctify(out, SANCTIFY_TR);
  return out;
}

// ---------------------------------------------------------------------------
// Station shape
// ---------------------------------------------------------------------------

export type Station = {
  id: string;
  /** Small label above the title: where in the morning this sits. */
  kicker: string;
  /** English name of the blessing. */
  title: string;
  /** Hebrew name, for the RTL heading. */
  heTitle: string;
  /** One or two words: what this blessing is about. */
  theme: string;
  /** The liturgy itself. */
  he: string[];
  translit: string[];
  en: string[];
  /** The introspection: a few sentences on what is being noticed here. */
  meditation: string;
  /** One thing to actually do while you say it. */
  cue: string;
  /** Today's written question, drawn from a rotating set. */
  prompt?: string;
  /** A second pass at the same blessing. Only at the deep level. */
  deeper?: string;
  /** A halachic or practical note printed under the text. */
  note?: string;
  /** In the short (about five minute) sit. */
  core?: boolean;
  /** Only in the full-text setting. */
  long?: boolean;
};

/** A value that may differ by nusach. Falls back to `all`. */
type ByNusach<T> = T | Partial<Record<Nusach, T>> & { all?: T };

function pick<T>(v: ByNusach<T>, n: Nusach): T {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const m = v as Partial<Record<Nusach, T>> & { all?: T };
    if (n in m || "all" in m) return (m[n] ?? m.all) as T;
  }
  return v as T;
}

type Raw = {
  id: string;
  kicker: string;
  title: string;
  heTitle: ByNusach<string> | ((o: Opts) => string);
  theme: string;
  he: ByNusach<string[]> | ((o: Opts) => string[]);
  translit: ByNusach<string[]> | ((o: Opts) => string[]);
  en: ByNusach<string[]> | ((o: Opts) => string[]);
  meditation: string;
  cue: string;
  /**
   * Rotating set — one is chosen per day so the question doesn't go stale.
   * A station that declares its own prompts asks at the guided level too;
   * stations that only get questions from LAYER are asked at deep only.
   */
  prompts?: string[];
  note?: ByNusach<string>;
  core?: boolean;
  long?: boolean;
};

// The shared opening of every blessing.
const OPEN_HE = "בָּרוּךְ אַתָּה {H} {E} מֶלֶךְ הָעוֹלָם,";
const OPEN_TR = "Baruch atah {H}, {E}, melech ha'olam,";
const OPEN_EN = "Blessed are You, {H}, {E}, King of the universe,";

// ---------------------------------------------------------------------------
// The fifteen blessings — each is the shared opening plus its own seal.
// ---------------------------------------------------------------------------

type Seal = {
  id: string;
  heTitle: ByNusach<string> | ((o: Opts) => string);
  title: string;
  theme: string;
  he: ByNusach<string> | ((o: Opts) => string);
  tr: ByNusach<string> | ((o: Opts) => string);
  en: ByNusach<string> | ((o: Opts) => string);
  meditation: string;
  cue: string;
  prompts?: string[];
  note?: string;
  core?: boolean;
};

const SEALS: Seal[] = [
  {
    id: "sechvi",
    // Ari says הַנּוֹתֵן (present tense); Ashkenaz and Sefard say אֲשֶׁר נָתַן.
    heTitle: { ari: "הַנּוֹתֵן לַשֶּׂכְוִי בִינָה", all: "אֲשֶׁר נָתַן לַשֶּׂכְוִי בִינָה" },
    title: "The rooster's discernment",
    theme: "Telling night from morning",
    he: {
      ari: "הַנּוֹתֵן לַשֶּׂכְוִי בִינָה לְהַבְחִין בֵּין יוֹם וּבֵין לָיְלָה:",
      all: "אֲשֶׁר נָתַן לַשֶּׂכְוִי בִינָה לְהַבְחִין בֵּין יוֹם וּבֵין לָיְלָה:",
    },
    tr: {
      ari: "hanotein lasechvi vinah l'havchin bein yom uvein lailah.",
      all: "asher natan lasechvi vinah l'havchin bein yom uvein lailah.",
    },
    en: {
      ari: "who gives the rooster the understanding to tell day from night⟪ — and gives me the same sense, to know when something has changed⟫.",
      all: "who gave the rooster the understanding to tell day from night⟪ — and gave me the same sense, to know when something has changed⟫.",
    },
    meditation:
      "The sequence opens not with thanks but with discernment — that even a bird knows the night has ended. Gratitude has a prerequisite: you have to notice that something changed. Plenty of us walk into a morning still carrying the previous night's weather.",
    cue: "Look at the actual light in the room for a few seconds. Not the phone.",
    prompts: [
      "What are you still treating as night that has, in fact, already turned into morning?",
      "What changed in the last month that you haven't fully registered yet?",
      "Name one thing you are worrying about today that was already settled yesterday.",
    ],
  },
  {
    id: "yisrael",
    heTitle: "שֶׁלֹּא עָשַׂנִי גּוֹי",
    title: "Born into the story",
    theme: "Belonging",
    he: "שֶׁלֹּא עָשַׂנִי גּוֹי:",
    tr: "shelo asani goy.",
    en: "who did not make me a gentile⟪, but gave me the commandments as my share of the work⟫.",
    meditation:
      "The classical reading of this blessing is not about rank. It is about obligation — being handed, without asking, a set of duties that give a life its shape. You were born into a story already in progress, and it expects something of you.",
    cue: "Name one person in your own family line you are standing on top of this morning.",
    prompts: [
      "Which of your obligations, if you dropped it, would change who you are?",
      "Name someone in your family line whose choices you are living inside of.",
      "What did you inherit that you have not yet done anything with?",
    ],
  },
  {
    id: "chorin",
    heTitle: "שֶׁלֹּא עָשַׂנִי עָבֶד",
    title: "A free person",
    theme: "Freedom",
    he: "שֶׁלֹּא עָשַׂנִי עָבֶד:",
    tr: "shelo asani aved.",
    en: "who did not make me a slave⟪ — my day is mine to point somewhere, and mine to answer for⟫.",
    meditation:
      "Free means the day is yours to point somewhere. That is a gift and a bill. Most of what actually runs a morning — the phone, the inbox, the mood you woke in — you never consented to. Freedom is the daily work of taking the wheel back.",
    cue: "Notice the first thing that reached for your attention today.",
    prompts: [
      "Where are you not free right now — and what is one inch of it you could take back today?",
      "What runs your morning that you never chose?",
      "If today were entirely yours to direct, what would you point it at?",
    ],
    core: true,
  },
  {
    id: "kirtzono",
    // A woman says שֶׁעָשַׂנִי כִּרְצוֹנוֹ in place of שֶׁלֹּא עָשַׂנִי אִשָּׁה —
    // printed that way in all three of the source siddurim. (Some siddurim also
    // print גּוֹיָה and שִׁפְחָה for the two blessings above when a woman says
    // them; the sources used here do not, so this app leaves those as printed.)
    heTitle: (o) =>
      o.voice === "female" ? "שֶׁעָשַׂנִי כִּרְצוֹנוֹ" : "שֶׁלֹּא עָשַׂנִי אִשָּׁה",
    title: "Made on purpose",
    theme: "Being made deliberately",
    he: (o) =>
      o.voice === "female" ? "שֶׁעָשַׂנִי כִּרְצוֹנוֹ:" : "שֶׁלֹּא עָשַׂנִי אִשָּׁה:",
    tr: (o) => (o.voice === "female" ? "she'asani kirtzono." : "shelo asani ishah."),
    en: (o) =>
      o.voice === "female"
        ? "who made me according to His will⟪ — made deliberately, exactly as intended⟫."
        : "who did not make me a woman⟪, and so am bound to the commandments that fall at fixed times⟫.",
    meditation:
      "The classical commentators read this blessing as being about the particular obligations a person is handed — not about anyone's worth. Taken honestly it is a question rather than a claim: what are you actually doing with the duties that came with your life?",
    cue: "Sit with the word 'deliberately' for one breath.",
  },
  {
    id: "ivrim",
    heTitle: "פּוֹקֵחַ עִוְרִים",
    title: "Sight",
    theme: "Seeing",
    he: "פּוֹקֵחַ עִוְרִים:",
    tr: "pokeach ivrim.",
    en: "who gives sight to the blind⟪ — who is opening my eyes again, this morning and every morning⟫.",
    meditation:
      "You opened your eyes and an entire world arrived, free of charge, before you had done anything to deserve it. Sight is the sense we notice least and would grieve most.",
    cue: "Pick one ordinary object in the room and look at it as if you'd been told you would lose your sight tonight.",
    prompts: [
      "Name one thing you saw this week that you're glad you got to see.",
      "Describe a face you saw yesterday — actually describe it.",
      "What is in front of you right now that you have stopped seeing?",
    ],
    core: true,
  },
  {
    id: "arumim",
    heTitle: "מַלְבִּישׁ עֲרֻמִּים",
    title: "Clothed",
    theme: "Dignity",
    he: "מַלְבִּישׁ עֲרֻמִּים:",
    tr: "malbish arumim.",
    en: "who clothes the naked⟪ — the first thing God ever made for a person was dignity⟫.",
    meditation:
      "The first thing the Torah says God made for a human being was clothing. Not shelter, not tools — dignity. Getting dressed is a small daily act of being taken care of.",
    cue: "Feel the weight of the fabric on your shoulders.",
  },
  {
    id: "asurim",
    heTitle: "מַתִּיר אֲסוּרִים",
    title: "Released",
    theme: "Loosening",
    he: "מַתִּיר אֲסוּרִים:",
    tr: "matir asurim.",
    en: "who frees the bound⟪ — the body that was locked in sleep, and whatever else in me is tied⟫.",
    meditation:
      "This was said in the moment of stretching — the body was bound all night and now it moves. There is a second reading, and everybody knows which one applies to them: we each carry something we are tied to. This is the sentence where you ask for it to loosen.",
    cue: "Stretch once, all the way, without hurrying it.",
    prompts: [
      "What are you bound to that you'd like loosened this year?",
      "What have you been carrying this week that isn't yours to carry?",
      "Name the knot. Just name it — you don't have to solve it this morning.",
    ],
    core: true,
  },
  {
    id: "kefufim",
    heTitle: "זוֹקֵף כְּפוּפִים",
    title: "Straightened",
    theme: "Standing up",
    he: "זוֹקֵף כְּפוּפִים:",
    tr: "zokef k'fufim.",
    en: "who straightens the bent⟪ — said in the act of sitting up⟫.",
    meditation:
      "Said, originally, in the act of sitting up in bed. The bent are made straight. Notice how much of this last year you have spent bent — over a screen, under a load, into a worry.",
    cue: "Sit or stand tall. Let the top of your head be the highest point of you.",
    core: true,
  },
  {
    id: "roka",
    heTitle: "רוֹקַע הָאָרֶץ עַל הַמָּיִם",
    title: "Solid ground",
    theme: "Stability",
    he: "רוֹקַע הָאָרֶץ עַל הַמָּיִם:",
    tr: "roka ha'aretz al hamayim.",
    en: "who spreads the earth over the waters⟪ — ground that holds, and was never owed to me⟫.",
    meditation:
      "Land stretched over water — a picture of ground that is stable without being guaranteed. The floor holds this morning. That is not nothing, and it is not owed.",
    cue: "Press your feet into the floor and feel the floor push back.",
  },
  {
    id: "tzorki",
    heTitle: "שֶׁעָשָׂה לִּי כָּל צָרְכִּי",
    title: "Every need",
    theme: "Enough",
    he: "שֶׁעָשָׂה לִּי כָּל צָרְכִּי:",
    tr: "she'asah li kol tzorki.",
    en: "who has provided me my every need⟪ — need, not want; said at the shoes, the last thing before the door⟫.",
    // Printed in the Alter Rebbe's siddur at this blessing.
    note: "Not said on Tishah B'Av or Yom Kippur.",
    meditation:
      "Traditionally said while putting on shoes — the last small thing you need before you can walk out the door. It is a blessing about sufficiency, said every morning inside a life that is otherwise organised entirely around wanting more.",
    cue: "Name one thing you already have that you once prayed for.",
    prompts: [
      "What do you have today that an earlier version of you was hoping for?",
      "What would you miss first if this week took it away?",
      "Name something small you own that does its job perfectly and gets no credit.",
    ],
    core: true,
  },
  {
    id: "mitzadei",
    heTitle: "הַמֵּכִין מִצְעֲדֵי גָבֶר",
    title: "Steps",
    theme: "Direction",
    he: "הַמֵּכִין מִצְעֲדֵי גָבֶר:",
    tr: "hameichin mitzadei gaver.",
    en: "who steadies a person's steps⟪ — the thousands I will take today having planned almost none of them⟫.",
    meditation:
      "You will take thousands of steps today and you will have planned almost none of them. The blessing suggests the route is being written with you, not only by you.",
    cue: "Picture the first place you will walk to today.",
  },
  {
    id: "gevurah",
    heTitle: "אוֹזֵר יִשְׂרָאֵל בִּגְבוּרָה",
    title: "Girded with strength",
    theme: "Strength",
    he: "אוֹזֵר יִשְׂרָאֵל בִּגְבוּרָה:",
    tr: "ozer Yisrael bigvurah.",
    en: "who girds Israel with strength⟪ — said at the belt: strength handed over each morning, to be spent well⟫.",
    meditation:
      "Said at the belt. Not strength you own — strength you are handed each morning and asked to spend well before the day is out.",
    cue: "Where, specifically, will you need strength today?",
  },
  {
    id: "tifarah",
    heTitle: "עוֹטֵר יִשְׂרָאֵל בְּתִפְאָרָה",
    title: "Crowned",
    theme: "Whose name you carry",
    he: "עוֹטֵר יִשְׂרָאֵל בְּתִפְאָרָה:",
    tr: "oter Yisrael b'tifarah.",
    en: "who crowns Israel with dignity⟪ — said at the covering of the head: whose name I carry out the door⟫.",
    meditation:
      "Said at the covering of the head. A crown is a reminder of who you represent when you walk out — you are somebody's child, somebody's parent, somebody's neighbour, and they are all on your head today.",
    cue: "Whose name are you carrying out the door this morning?",
  },
  {
    id: "koach",
    heTitle: "הַנּוֹתֵן לַיָּעֵף כֹּחַ",
    title: "Strength to the weary",
    theme: "Beginning tired",
    he: "הַנּוֹתֵן לַיָּעֵף כֹּחַ:",
    tr: "hanotein laya'ef koach.",
    en: "who gives strength to the weary⟪ — it does not say to the rested⟫.",
    meditation:
      "The most honest blessing in the set. It does not claim you woke up rested. It says strength is given to the weary — the tired is the condition it assumes you are in, and it is fine to be in it.",
    cue: "You don't have to feel ready. Begin anyway.",
    core: true,
  },
  {
    id: "sheinah",
    heTitle: "הַמַּעֲבִיר שֵׁנָה מֵעֵינָי",
    title: "Sleep lifted",
    theme: "Awake",
    he: "הַמַּעֲבִיר שֵׁנָה מֵעֵינָי וּתְנוּמָה מֵעַפְעַפָּי:",
    tr: "hama'avir sheinah me'einai ut'numah me'af'apai.",
    en: "who removes sleep from my eyes and slumber from my eyelids⟪ — I am awake; now to be alert⟫.",
    meditation:
      "The plainest line of the sequence: you are awake now. What follows it in the siddur is a request — and notice that it doesn't ask for success, money or ease. It asks for character.",
    cue: "Close your eyes and open them once, deliberately.",
    core: true,
  },
];

function sealStation(s: Seal): Raw {
  const one = <T,>(v: ByNusach<T> | ((o: Opts) => T), o: Opts): T =>
    typeof v === "function" ? (v as (o: Opts) => T)(o) : pick(v, o.nusach);
  return {
    id: s.id,
    kicker: "Birchot HaShachar",
    title: s.title,
    heTitle: s.heTitle,
    theme: s.theme,
    meditation: s.meditation,
    cue: s.cue,
    prompts: s.prompts,
    note: s.note,
    core: s.core,
    he: (o) => [`${OPEN_HE} ${one(s.he, o)}`],
    translit: (o) => [`${OPEN_TR} ${one(s.tr, o)}`],
    en: (o) => [`${OPEN_EN} ${one(s.en, o)}`],
  };
}

// ---------------------------------------------------------------------------
// The stations that aren't one of the fifteen
// ---------------------------------------------------------------------------

const OPENERS: Raw[] = [
  {
    id: "modeh",
    kicker: "Before you get out of bed",
    title: "Modeh Ani",
    heTitle: "מוֹדֶה אֲנִי",
    theme: "Thanks, before anything else",
    core: true,
    he: (o) => [
      `${o.voice === "female" ? "מוֹדָה" : "מוֹדֶה"} אֲנִי לְפָנֶיךָ, מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה. רַבָּה אֱמוּנָתֶךָ:`,
    ],
    translit: (o) => [
      `${o.voice === "female" ? "Modah" : "Modeh"} ani lefanecha, melech chai v'kayam, shehechezarta bi nishmati b'chemlah. Rabah emunatecha.`,
    ],
    en: [
      "I give thanks before You⟪ — before my name, before my work, before I have done anything to deserve it⟫, living and enduring King, for returning my soul to me with compassion⟪, which You were never obliged to show⟫. Great is Your faithfulness⟪ — You do this every morning without fail⟫.",
    ],
    // Sourced: the Alter Rebbe's siddur explains that this sentence contains
    // none of the seven Names, which is why it can be said before washing.
    note: "Said in bed, before washing — the words contain none of the Divine Names, so unwashed hands are no obstacle.",
    meditation:
      "Before your name, before your work, before the news. The tradition puts this sentence first on purpose: gratitude offered before you have earned anything is the only kind that isn't a transaction. Your soul came back this morning, and nobody had guaranteed it would.",
    cue: "Say it slowly. Whatever else happens today, don't rush the first sentence of it.",
    prompts: [
      "What is one thing you woke up to today that you would genuinely miss if it were gone?",
      "Who is asleep under your roof, or a phone call away, that you are glad about?",
      "Name one ordinary thing waiting for you today that you would grieve if it stopped.",
      "What went right yesterday that you never acknowledged?",
    ],
  },
  {
    id: "netilah",
    kicker: "At the sink",
    title: "Washing the hands",
    heTitle: "עַל נְטִילַת יָדָיִם",
    theme: "A clean start",
    he: [`${OPEN_HE} אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל נְטִילַת יָדָיִם:`],
    translit: [`${OPEN_TR} asher kid'shanu b'mitzvotav v'tzivanu al netilat yadayim.`],
    en: [
      `${OPEN_EN} who made us holy with His commandments and commanded us on the washing of hands⟪, the small act that draws a line between the night and the day⟫.`,
    ],
    meditation:
      "Water over the hands is the smallest possible ritual: two seconds that draw a line between last night and this morning. You are not continuing yesterday. You are starting.",
    cue: "Notice the temperature of the water. That's the whole practice here.",
  },
  {
    id: "asheryatzar",
    kicker: "The body that worked all night",
    title: "Asher Yatzar",
    heTitle: "אֲשֶׁר יָצַר",
    theme: "A body that held",
    core: true,
    he: {
      // Ari: יִסָּתֵם comes first, and there is no וְלַעֲמוֹד לְפָנֶיךָ.
      ari: [
        `${OPEN_HE} אֲשֶׁר יָצַר אֶת הָאָדָם בְּחָכְמָה, וּבָרָא בוֹ נְקָבִים נְקָבִים, חֲלוּלִים חֲלוּלִים,`,
        "גָּלוּי וְיָדוּעַ לִפְנֵי כִסֵּא כְבוֹדֶךָ, שֶׁאִם יִסָּתֵם אֶחָד מֵהֶם אוֹ אִם יִפָּתֵחַ אֶחָד מֵהֶם, אִי אֶפְשַׁר לְהִתְקַיֵּם אֲפִילוּ שָׁעָה אֶחָת:",
        "בָּרוּךְ אַתָּה {H}, רוֹפֵא כָל בָּשָׂר וּמַפְלִיא לַעֲשׂוֹת:",
      ],
      all: [
        `${OPEN_HE} אֲשֶׁר יָצַר אֶת הָאָדָם בְּחָכְמָה, וּבָרָא בוֹ נְקָבִים נְקָבִים, חֲלוּלִים חֲלוּלִים,`,
        "גָּלוּי וְיָדוּעַ לִפְנֵי כִסֵּא כְבוֹדֶךָ, שֶׁאִם יִפָּתֵחַ אֶחָד מֵהֶם אוֹ יִסָּתֵם אֶחָד מֵהֶם, אִי אֶפְשַׁר לְהִתְקַיֵּם וְלַעֲמֹד לְפָנֶיךָ אֲפִילוּ שָׁעָה אֶחָת:",
        "בָּרוּךְ אַתָּה {H}, רוֹפֵא כָל בָּשָׂר וּמַפְלִיא לַעֲשׂוֹת:",
      ],
    },
    translit: {
      ari: [
        `${OPEN_TR} asher yatzar et ha'adam b'chochmah, uvara vo nekavim nekavim, chalulim chalulim.`,
        "Galui v'yadua lifnei chisei ch'vodecha, she'im yisatem echad mehem o im yipateach echad mehem, i efshar l'hitkayem afilu sha'ah echat.",
        "Baruch atah {H}, rofei chol basar umafli la'asot.",
      ],
      all: [
        `${OPEN_TR} asher yatzar et ha'adam b'chochmah, uvara vo nekavim nekavim, chalulim chalulim.`,
        "Galui v'yadua lifnei chisei ch'vodecha, she'im yipateach echad mehem o yisatem echad mehem, i efshar l'hitkayem v'la'amod l'fanecha afilu sha'ah echat.",
        "Baruch atah {H}, rofei chol basar umafli la'asot.",
      ],
    },
    en: {
      ari: [
        `${OPEN_EN} who formed a human being with wisdom⟪ — deliberately, not by accident⟫, and made in him openings upon openings, hollows upon hollows⟪: the passages and cavities a body needs in order to work⟫.`,
        "It is revealed and known before Your throne of glory that if one of them were to close⟪ that should be open⟫, or one of them were to open⟪ that should be closed⟫, it would be impossible to survive even for an hour.",
        "Blessed are You, {H}, healer of all flesh, who does wonders⟪ — holding body and soul together, which is the wonder⟫.",
      ],
      all: [
        `${OPEN_EN} who formed a human being with wisdom, and made in him openings upon openings, hollows upon hollows.`,
        "It is revealed and known before Your throne of glory that if one of them were to open⟪ that should be closed⟫, or one of them were to close⟪ that should be open⟫, it would be impossible to survive and stand before You even for an hour.",
        "Blessed are You, {H}, healer of all flesh, who does wonders.",
      ],
    },
    meditation:
      "Openings that stayed open and passages that stayed clear, for eight hours, with no supervision from you. The blessing states the plain fact that if a single valve had failed you would not be standing here. Most people only think about the body when it breaks; this is the practice of thinking about it while it works.",
    cue: "Take one full breath and follow it the whole way down and the whole way back out.",
    prompts: [
      "What is one thing your body did for you today that you never asked it to do?",
      "Where in your body is there no pain this morning? Start there.",
      "What did you eat, lift, climb or carry yesterday without thinking about it?",
    ],
  },
  {
    id: "neshamah",
    kicker: "The soul you were handed back",
    title: "Elokai Neshamah",
    heTitle: "אֱלֹהַי נְשָׁמָה",
    theme: "You are not damaged goods",
    core: true,
    he: (o) => [
      "אֱלֹהַי, נְשָׁמָה שֶׁנָּתַתָּ בִּי טְהוֹרָה הִיא, אַתָּה בְרָאתָהּ, אַתָּה יְצַרְתָּהּ, אַתָּה נְפַחְתָּהּ בִּי, וְאַתָּה מְשַׁמְּרָהּ בְּקִרְבִּי,",
      `וְאַתָּה עָתִיד לִטְּלָהּ מִמֶּנִּי וּלְהַחֲזִירָהּ בִּי לֶעָתִיד לָבֹא. כָּל זְמַן שֶׁהַנְּשָׁמָה בְקִרְבִּי, ${o.voice === "female" ? "מוֹדָה" : "מוֹדֶה"} אֲנִי לְפָנֶיךָ, {H} אֱלֹהַי וֵאלֹהֵי אֲבוֹתַי, רִבּוֹן כָּל הַמַּעֲשִׂים, אֲדוֹן כָּל הַנְּשָׁמוֹת:`,
      "בָּרוּךְ אַתָּה {H}, הַמַּחֲזִיר נְשָׁמוֹת לִפְגָרִים מֵתִים:",
    ],
    translit: (o) => [
      "Elohai, neshamah shenatata bi t'horah hi. Atah v'ratah, atah y'tzartah, atah n'fachtah bi, v'atah m'shamrah b'kirbi.",
      `V'atah atid lit'lah mimeni ul'hachazirah bi le'atid lavo. Kol z'man shehaneshamah v'kirbi, ${o.voice === "female" ? "modah" : "modeh"} ani lefanecha, {H} Elohai vElohei avotai, ribon kol hama'asim, adon kol han'shamot.`,
      "Baruch atah {H}, hamachazir n'shamot lifgarim metim.",
    ],
    en: [
      "My God, the soul You placed in me is pure⟪ — is, not was; whatever yesterday held⟫. You created it, You formed it, You breathed it into me, and You keep it safe inside me.",
      "One day You will take it from me and return it to me in the time to come⟪, at the resurrection⟫. For as long as the soul is within me⟪ — for as long as I have breath to say so⟫ I give thanks before You, {H}, my God and God of my fathers, Master of all works, Lord of all souls.",
      "Blessed are You, {H}, who returns souls to the lifeless⟪ — as He did for me this morning⟫.",
    ],
    meditation:
      "“The soul You placed in me is pure.” Not was pure — is. Whatever yesterday held, whatever you said or failed to do, the core you were handed back this morning came back undamaged. This is the tradition's answer to shame, and it is said out loud before you have had a chance to argue with it.",
    cue: "Stop on the word pure for one breath before you move on.",
  },
];

const CLOSERS: Raw[] = [
  {
    id: "yehiratzon",
    kicker: "The request that follows",
    title: "Vihi Ratzon",
    heTitle: "וִיהִי רָצוֹן",
    theme: "Asking for character, not for luck",
    long: true,
    he: {
      ari: [
        "וִיהִי רָצוֹן מִלְּפָנֶיךָ, {H} {E} וֵאלֹהֵי אֲבוֹתֵינוּ, שֶׁתַּרְגִּילֵנוּ בְּתוֹרָתֶךָ וְתַדְבִּיקֵנוּ בְּמִצְוֹתֶיךָ, וְאַל תְּבִיאֵנוּ לֹא לִידֵי חֵטְא, וְלֹא לִידֵי עֲבֵרָה וְעָוֹן, וְלֹא לִידֵי נִסָּיוֹן, וְלֹא לִידֵי בִזָּיוֹן, וְאַל יִשְׁלוֹט בָּנוּ יֵצֶר הָרָע,",
        "וְהַרְחִיקֵנוּ מֵאָדָם רָע וּמֵחָבֵר רָע, וְדַבְּקֵנוּ בְּיֵצֶר טוֹב וּבְמַעֲשִׂים טוֹבִים, {KOF} אֶת יִצְרֵנוּ לְהִשְׁתַּעְבֶּד לָךְ, וּתְנֵנוּ הַיּוֹם וּבְכָל יוֹם לְחֵן וּלְחֶסֶד וּלְרַחֲמִים בְּעֵינֶיךָ וּבְעֵינֵי כָל רוֹאֵינוּ, וְתִגְמְלֵנוּ חֲסָדִים טוֹבִים:",
        "בָּרוּךְ אַתָּה {H}, הַגּוֹמֵל חֲסָדִים טוֹבִים לְעַמּוֹ יִשְׂרָאֵל:",
      ],
      all: [
        "וִיהִי רָצוֹן מִלְּפָנֶיךָ, {H} {E} וֵאלֹהֵי אֲבוֹתֵינוּ, שֶׁתַּרְגִּילֵנוּ בְּתוֹרָתֶךָ וְדַבְּקֵנוּ בְּמִצְוֹתֶיךָ, וְאַל תְּבִיאֵנוּ לֹא לִידֵי חֵטְא, וְלֹא לִידֵי עֲבֵרָה וְעָוֹן, וְלֹא לִידֵי נִסָּיוֹן, וְלֹא לִידֵי בִזָּיוֹן, וְאַל יִשְׁלֹט בָּנוּ יֵצֶר הָרָע,",
        "וְהַרְחִיקֵנוּ מֵאָדָם רָע וּמֵחָבֵר רָע, וְדַבְּקֵנוּ בְּיֵצֶר הַטּוֹב וּבְמַעֲשִׂים טוֹבִים, {KOF} אֶת יִצְרֵנוּ לְהִשְׁתַּעְבֶּד לָךְ, וּתְנֵנוּ הַיּוֹם וּבְכָל יוֹם לְחֵן וּלְחֶסֶד וּלְרַחֲמִים בְּעֵינֶיךָ וּבְעֵינֵי כָל רוֹאֵינוּ, וְתִגְמְלֵנוּ חֲסָדִים טוֹבִים:",
        "בָּרוּךְ אַתָּה {H}, {SEAL} חֲסָדִים טוֹבִים לְעַמּוֹ יִשְׂרָאֵל:",
      ],
    },
    translit: {
      ari: [
        "Vihi ratzon mil'fanecha, {H} {E} vElohei avoteinu, shetargileinu b'toratecha v'tadbikeinu b'mitzvotecha, v'al t'vi'einu lo lidei chet, v'lo lidei aveirah v'avon, v'lo lidei nisayon, v'lo lidei vizayon, v'al yishlot banu yetzer hara.",
        "V'harchikeinu me'adam ra umechaver ra, v'dab'keinu b'yetzer tov uv'ma'asim tovim, {KOFTR} et yitzreinu l'hishta'bed lach, ut'neinu hayom uv'chol yom l'chen ul'chesed ul'rachamim b'einecha uv'einei chol ro'einu, v'tigm'leinu chasadim tovim.",
        "Baruch atah {H}, hagomel chasadim tovim l'amo Yisrael.",
      ],
      all: [
        "Vihi ratzon mil'fanecha, {H} {E} vElohei avoteinu, shetargileinu b'toratecha v'dab'keinu b'mitzvotecha, v'al t'vi'einu lo lidei chet, v'lo lidei aveirah v'avon, v'lo lidei nisayon, v'lo lidei vizayon, v'al yishlot banu yetzer hara.",
        "V'harchikeinu me'adam ra umechaver ra, v'dab'keinu b'yetzer hatov uv'ma'asim tovim, {KOFTR} et yitzreinu l'hishta'bed lach, ut'neinu hayom uv'chol yom l'chen ul'chesed ul'rachamim b'einecha uv'einei chol ro'einu, v'tigm'leinu chasadim tovim.",
        "Baruch atah {H}, {SEALTR} chasadim tovim l'amo Yisrael.",
      ],
    },
    en: [
      "May it be Your will, {H}, {E} and God of our fathers, to make us at home in Your Torah⟪ — not merely to study it, but to be at ease in it⟫ and attached to Your commandments; do not bring us into the hands of sin, of transgression, of trial⟪ — of being tested past what we can hold⟫, or of disgrace; and let the bad inclination not rule us.",
      "Keep us far from a bad person and a bad friend⟪ — the company we keep does the shaping⟫; bind us to the good inclination and to good deeds; bend our instinct to serve You; and grant us today, and every day, favour, kindness and mercy in Your eyes and in the eyes of all who see us⟪ — that we be judged generously by the people we meet⟫; and deal kindly with us.",
      "Blessed are You, {H}, who bestows good kindnesses on His people Israel⟪ — kindnesses that are good for the one receiving them, which is not always the same thing⟫.",
    ],
    meditation:
      "Read the list of what is actually being asked for. Not money, not success, not an easy day. Not to be humiliated, not to be tested past what you can hold, to be kept away from the wrong company, and to be seen kindly by the people who will look at you today.",
    cue: "Pick the one line on that list you most need this week.",
  },
  {
    id: "shetatzileini",
    kicker: "And then, cover",
    title: "Yehi Ratzon",
    heTitle: "יְהִי רָצוֹן",
    theme: "What you hope doesn't happen",
    long: true,
    he: {
      ari: [
        "יְהִי רָצוֹן מִלְּפָנֶיךָ, {H} אֱלֹהַי וֵאלֹהֵי אֲבוֹתַי, שֶׁתַּצִּילֵנִי הַיּוֹם וּבְכָל יוֹם מֵעַזֵּי פָנִים וּמֵעַזּוּת פָּנִים, מֵאָדָם רָע וּמֵחָבֵר רָע וּמִשָּׁכֵן רָע וּמִפֶּגַע רָע,",
        "מֵעַיִן הָרָע, מִלָּשׁוֹן הָרָע, מִמַּלְשִׁינוּת, מֵעֵדוּת שֶׁקֶר, מִשִּׂנְאַת הַבְּרִיּוֹת, מֵעֲלִילָה, מִמִּיתָה מְשֻׁנָּה, מֵחֳלָיִם רָעִים וּמִמִּקְרִים רָעִים, וּמִשָּׂטָן הַמַּשְׁחִית, מִדִּין קָשֶׁה וּמִבַּעַל דִּין קָשֶׁה, בֵּין שֶׁהוּא בֶן בְּרִית וּבֵין שֶׁאֵינוֹ בֶן בְּרִית, וּמִדִּינָהּ שֶׁל גֵּיהִנֹּם:",
      ],
      sefard: [
        "יְהִי רָצוֹן מִלְּפָנֶיךָ, {H} אֱלֹהַי וֵאלֹהֵי אֲבוֹתַי, שֶׁתַּצִּילֵנִי הַיּוֹם וּבְכָל יוֹם מֵעַזֵּי פָנִים וּמֵעַזּוּת פָּנִים, מֵאָדָם רָע, מִיֵּצֶר רָע, וּמֵחָבֵר רָע, וּמִשָּׁכֵן רָע, וּמִפֶּגַע רָע,",
        "מֵעַיִן הָרָע, מִלָּשׁוֹן הָרָע, מִמַּלְשִׁינוּת, מֵעֵדוּת שֶׁקֶר, מִשִּׂנְאַת הַבְּרִיּוֹת, מֵעֲלִילָה, מִמִּיתָה מְשֻׁנָּה, מֵחֳלָיִם רָעִים, מִמִּקְרִים רָעִים, וּמִשָּׂטָן הַמַּשְׁחִית, מִדִּין קָשֶׁה וּמִבַּעַל דִּין קָשֶׁה, בֵּין שֶׁהוּא בֶן בְּרִית וּבֵין שֶׁאֵינוֹ בֶן בְּרִית, וּמִדִּינָהּ שֶׁל גֵּיהִנֹּם:",
      ],
      // Metsudah prints the shorter list — no evil eye, slander or Gehinnom.
      ashkenaz: [
        "יְהִי רָצוֹן מִלְּפָנֶיךָ, {H} אֱלֹהַי וֵאלֹהֵי אֲבוֹתַי, שֶׁתַּצִּילֵנִי הַיּוֹם וּבְכָל יוֹם מֵעַזֵּי פָנִים וּמֵעַזּוּת פָּנִים, מֵאָדָם רָע וּמֵחָבֵר רָע וּמִשָּׁכֵן רָע וּמִפֶּגַע רָע, וּמִשָּׂטָן הַמַּשְׁחִית, מִדִּין קָשֶׁה וּמִבַּעַל דִּין קָשֶׁה, בֵּין שֶׁהוּא בֶן בְּרִית וּבֵין שֶׁאֵינוֹ בֶן בְּרִית,",
      ],
    },
    translit: {
      ari: [
        "Yehi ratzon mil'fanecha, {H} Elohai vElohei avotai, shetatzileini hayom uv'chol yom me'azei fanim ume'azut panim, me'adam ra umechaver ra umishachen ra umipega ra.",
        "Me'ayin hara, milashon hara, mimalshinut, me'edut sheker, misinat hab'riyot, me'alilah, mimitah m'shunah, mecholayim ra'im umimikrim ra'im, umisatan hamashchit, midin kasheh umiba'al din kasheh, bein shehu ven brit uvein she'eino ven brit, umidinah shel geihinom.",
      ],
      sefard: [
        "Yehi ratzon mil'fanecha, {H} Elohai vElohei avotai, shetatzileini hayom uv'chol yom me'azei fanim ume'azut panim, me'adam ra, miyetzer ra, umechaver ra, umishachen ra, umipega ra.",
        "Me'ayin hara, milashon hara, mimalshinut, me'edut sheker, misinat hab'riyot, me'alilah, mimitah m'shunah, mecholayim ra'im, mimikrim ra'im, umisatan hamashchit, midin kasheh umiba'al din kasheh, bein shehu ven brit uvein she'eino ven brit, umidinah shel geihinom.",
      ],
      ashkenaz: [
        "Yehi ratzon mil'fanecha, {H} Elohai vElohei avotai, shetatzileini hayom uv'chol yom me'azei fanim ume'azut panim, me'adam ra umechaver ra umishachen ra umipega ra, umisatan hamashchit, midin kasheh umiba'al din kasheh, bein shehu ven brit uvein she'eino ven brit.",
      ],
    },
    en: {
      ari: [
        "May it be Your will, {H}, my God and God of my fathers, to save me today and every day from the brazen and from brazenness, from a bad person, a bad friend, a bad neighbour and a bad mishap⟪ — almost nothing on this list is physical; it is a catalogue of how a day gets ruined by other people⟫.",
        "From the evil eye, from an evil tongue, from informers, from false testimony, from people's hatred, from slander, from a strange death, from bad illnesses and bad events, from the destroying accuser, from a harsh judgment and a harsh opponent at law — whether he is a member of the covenant or not⟪ — harm is not assumed to come only from outside⟫ — and from the judgment of Gehinnom.",
      ],
      sefard: [
        "May it be Your will, {H}, my God and God of my fathers, to save me today and every day from the brazen and from brazenness, from a bad person, from a bad instinct⟪ — Sefard alone puts one's own instinct on this list⟫, from a bad friend, a bad neighbour and a bad mishap.",
        "From the evil eye, from an evil tongue, from informers, from false testimony, from people's hatred, from slander, from a strange death, from bad illnesses, from bad events, from the destroying accuser, from a harsh judgment and a harsh opponent at law — whether he is a member of the covenant or not⟪ — harm is not assumed to come only from outside⟫ — and from the judgment of Gehinnom.",
      ],
      ashkenaz: [
        "May it be Your will, {H}, my God and God of my fathers, to save me today and every day from the brazen and from brazenness, from a bad person, a bad friend, a bad neighbour and a bad mishap, from the destroying accuser, from a harsh judgment and a harsh opponent at law — whether he is a member of the covenant or not.",
      ],
    },
    meditation:
      "Straight after asking for character, the siddur asks for cover. Read what is actually on the list — a brazen person, a bad neighbour, an evil tongue, informers, false testimony, being hated, being blamed. Almost none of it is physical. It is a catalogue of the ways a day gets ruined by other people's mouths.",
    cue: "Name, silently, the one thing you are hoping does not happen today.",
    prompts: [
      "What are you quietly hoping doesn't happen today?",
      "Which item on that list have you been on the wrong side of lately?",
      "Whose day could you damage today with one sentence?",
    ],
  },
  {
    id: "torah",
    kicker: "Before you learn anything",
    title: "Birchot HaTorah",
    heTitle: "בִּרְכוֹת הַתּוֹרָה",
    theme: "The day gets an aim",
    long: true,
    he: {
      // Ashkenaz: לַעֲסֹק בְּדִבְרֵי תוֹרָה. Ari and Sefard: עַל דִּבְרֵי תוֹרָה.
      // Ari also reads בְּפִי כָל עַמְּךָ / וְצֶאֱצָאֵי כָל עַמְּךָ.
      ashkenaz: [
        `${OPEN_HE} אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לַעֲסֹק בְּדִבְרֵי תוֹרָה:`,
        "וְהַעֲרֶב נָא, {H} {E}, אֶת דִּבְרֵי תוֹרָתְךָ בְּפִינוּ וּבְפִי עַמְּךָ בֵּית יִשְׂרָאֵל, וְנִהְיֶה אֲנַחְנוּ וְצֶאֱצָאֵינוּ וְצֶאֱצָאֵי עַמְּךָ בֵּית יִשְׂרָאֵל, כֻּלָּנוּ יוֹדְעֵי שְׁמֶךָ וְלוֹמְדֵי תוֹרָתֶךָ לִשְׁמָהּ. בָּרוּךְ אַתָּה {H}, הַמְלַמֵּד תּוֹרָה לְעַמּוֹ יִשְׂרָאֵל:",
        `${OPEN_HE} אֲשֶׁר בָּחַר בָּנוּ מִכָּל הָעַמִּים וְנָתַן לָנוּ אֶת תּוֹרָתוֹ. בָּרוּךְ אַתָּה {H}, נוֹתֵן הַתּוֹרָה:`,
      ],
      ari: [
        `${OPEN_HE} אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל דִּבְרֵי תוֹרָה:`,
        "וְהַעֲרֶב נָא, {H} {E}, אֶת דִּבְרֵי תוֹרָתְךָ בְּפִינוּ וּבְפִי כָל עַמְּךָ בֵּית יִשְׂרָאֵל, וְנִהְיֶה אֲנַחְנוּ וְצֶאֱצָאֵינוּ וְצֶאֱצָאֵי כָל עַמְּךָ בֵּית יִשְׂרָאֵל, כֻּלָּנוּ יוֹדְעֵי שְׁמֶךָ וְלוֹמְדֵי תוֹרָתְךָ לִשְׁמָהּ. בָּרוּךְ אַתָּה {H}, הַמְלַמֵּד תּוֹרָה לְעַמּוֹ יִשְׂרָאֵל:",
        `${OPEN_HE} אֲשֶׁר בָּחַר בָּנוּ מִכָּל הָעַמִּים וְנָתַן לָנוּ אֶת תּוֹרָתוֹ. בָּרוּךְ אַתָּה {H}, נוֹתֵן הַתּוֹרָה:`,
      ],
      sefard: [
        `${OPEN_HE} אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל דִּבְרֵי תוֹרָה:`,
        "וְהַעֲרֶב נָא, {H} {E}, אֶת דִּבְרֵי תוֹרָתְךָ בְּפִינוּ וּבְפִי עַמְּךָ בֵּית יִשְׂרָאֵל, וְנִהְיֶה אֲנַחְנוּ וְצֶאֱצָאֵינוּ וְצֶאֱצָאֵי עַמְּךָ בֵּית יִשְׂרָאֵל, כֻּלָּנוּ יוֹדְעֵי שְׁמֶךָ וְלוֹמְדֵי תוֹרָתֶךָ לִשְׁמָהּ. בָּרוּךְ אַתָּה {H}, הַמְלַמֵּד תּוֹרָה לְעַמּוֹ יִשְׂרָאֵל:",
        `${OPEN_HE} אֲשֶׁר בָּחַר בָּנוּ מִכָּל הָעַמִּים וְנָתַן לָנוּ אֶת תּוֹרָתוֹ. בָּרוּךְ אַתָּה {H}, נוֹתֵן הַתּוֹרָה:`,
      ],
    },
    translit: {
      ashkenaz: [
        `${OPEN_TR} asher kid'shanu b'mitzvotav v'tzivanu la'asok b'divrei Torah.`,
        "V'ha'arev na, {H} {E}, et divrei Toratcha b'finu uv'fi amcha beit Yisrael, v'nihyeh anachnu v'tze'etza'einu v'tze'etza'ei amcha beit Yisrael, kulanu yod'ei sh'mecha v'lomdei Toratecha lishmah. Baruch atah {H}, ham'lamed Torah l'amo Yisrael.",
        `${OPEN_TR} asher bachar banu mikol ha'amim v'natan lanu et Torato. Baruch atah {H}, notein haTorah.`,
      ],
      all: [
        `${OPEN_TR} asher kid'shanu b'mitzvotav v'tzivanu al divrei Torah.`,
        "V'ha'arev na, {H} {E}, et divrei Toratcha b'finu uv'fi amcha beit Yisrael, v'nihyeh anachnu v'tze'etza'einu v'tze'etza'ei amcha beit Yisrael, kulanu yod'ei sh'mecha v'lomdei Toratcha lishmah. Baruch atah {H}, ham'lamed Torah l'amo Yisrael.",
        `${OPEN_TR} asher bachar banu mikol ha'amim v'natan lanu et Torato. Baruch atah {H}, notein haTorah.`,
      ],
    },
    en: [
      `${OPEN_EN} who made us holy with His commandments and commanded us concerning words of Torah⟪ — said before learning, the way a blessing is said before any mitzvah⟫.`,
      "Make the words of Your Torah sweet in our mouths⟪ — sweet before deep; the asking is that we enjoy it⟫, {H}, {E}, and in the mouths of Your people the house of Israel — that we, and our children, and the children of Your people, may all know Your name and learn Your Torah for its own sake⟪, not for what it gets us⟫. Blessed are You, {H}, who teaches Torah to His people Israel.",
      `${OPEN_EN} who chose us from all the peoples and gave us His Torah⟪ — chosen for the work of it⟫. Blessed are You, {H}, giver of the Torah⟪ — present tense: He is giving it now, this morning⟫.`,
    ],
    meditation:
      "The morning ends by giving the day an aim: learn one true thing, and hand it to someone else. Notice that the blessing asks for the learning to be sweet before it asks for it to be deep.",
    cue: "Decide now what one thing you'd like to understand better by tonight.",
  },
  {
    id: "kohanim",
    kicker: "The first thing you learn",
    title: "Birkat Kohanim",
    heTitle: "בִּרְכַּת כֹּהֲנִים",
    theme: "Said over somebody else",
    long: true,
    // Siddur Torah Or prints the whole passage, Bamidbar 6:22–27 — the
    // instruction to say it, the three verses, and the line that explains what
    // saying it does. Metsudah (Ashkenaz) prints only the three verses.
    //
    // UNSOURCED: no printed Nusach Sefard text of this passage could be found.
    // Sefard is given the full form on the grounds that the nusach descends
    // from the Ari, and it is flagged on the proof sheet to be settled against
    // a Sefard siddur rather than left as a silent guess.
    he: {
      ashkenaz: [
        "יְבָרֶכְךָ {H} וְיִשְׁמְרֶךָ׃",
        "יָאֵר {H} פָּנָיו אֵלֶיךָ וִיחֻנֶּךָּ׃",
        "יִשָּׂא {H} פָּנָיו אֵלֶיךָ וְיָשֵׂם לְךָ שָׁלוֹם׃",
      ],
      all: [
        "וַיְדַבֵּר {H} אֶל מֹשֶׁה לֵּאמֹר. דַּבֵּר אֶל אַהֲרֹן וְאֶל בָּנָיו לֵאמֹר, כֹּה תְבָרֲכוּ אֶת בְּנֵי יִשְׂרָאֵל, אָמוֹר לָהֶם׃",
        "יְבָרֶכְךָ {H} וְיִשְׁמְרֶךָ׃",
        "יָאֵר {H} פָּנָיו אֵלֶיךָ וִיחֻנֶּךָּ׃",
        "יִשָּׂא {H} פָּנָיו אֵלֶיךָ וְיָשֵׂם לְךָ שָׁלוֹם׃",
        "וְשָׂמוּ אֶת שְׁמִי עַל בְּנֵי יִשְׂרָאֵל, וַאֲנִי אֲבָרֲכֵם׃",
      ],
    },
    translit: {
      ashkenaz: [
        "Y'varech'cha {H} v'yishm'recha.",
        "Ya'er {H} panav elecha vichuneka.",
        "Yisa {H} panav elecha v'yasem l'cha shalom.",
      ],
      all: [
        "Vay'daber {H} el Moshe lemor. Daber el Aharon v'el banav lemor, koh t'varachu et b'nei Yisrael, amor lahem.",
        "Y'varech'cha {H} v'yishm'recha.",
        "Ya'er {H} panav elecha vichuneka.",
        "Yisa {H} panav elecha v'yasem l'cha shalom.",
        "V'samu et sh'mi al b'nei Yisrael, va'ani avarachem.",
      ],
    },
    en: {
      ashkenaz: [
        "May {HN} bless you and keep you.",
        "May {HN} shine His face toward you and be gracious to you.",
        "May {HN} lift His face toward you and give you peace.",
      ],
      all: [
        "Then {HN} spoke to Moses, saying: speak to Aaron and to his sons — this is how you shall bless the children of Israel. Say to them⟪ — out loud, to their faces⟫:",
        "May {HN} bless you and keep you.",
        "May {HN} shine His face toward you and be gracious to you.",
        "May {HN} lift His face toward you and give you peace.",
        "And they shall place My name upon the children of Israel, and I Myself will bless them⟪ — the kohanim say the words; the blessing is God's. What one person can do for another is put a name on them⟫.",
      ],
    },
    note: {
      ashkenaz:
        "Learned straight after the Torah blessings — you bless, then you learn. Set here with nikkud only; a siddur prints these verses with cantillation.",
      all: "Bamidbar 6:22–27 in full, as the siddur prints it. Set here with nikkud only; a siddur prints these verses with cantillation.",
    },
    meditation:
      "Three verses, and each is longer than the one before: three words, then five, then seven. The blessing widens as it goes — kept, then seen, then whole. And it comes bracketed: an instruction before it to say this out loud to people, and a line after it explaining what saying it does.",
    cue: "Say it once for somebody else. Pick the person before you start.",
    prompts: [
      "Who needs this said over them today?",
      "Of the three — kept, seen, whole — which are you short on this week?",
      "Whose name have you been meaning to say out loud, to them?",
    ],
  },
  {
    id: "eiludevarim",
    kicker: "The last thing before the day",
    title: "Eilu Devarim",
    heTitle: "אֵלּוּ דְבָרִים",
    theme: "What actually counts",
    long: true,
    he: {
      ari: [
        "אֵלּוּ דְבָרִים שֶׁאֵין לָהֶם שִׁעוּר, הַפֵּאָה וְהַבִּכּוּרִים וְהָרְאָיוֹן וּגְמִילוּת חֲסָדִים וְתַלְמוּד תּוֹרָה:",
        "אֵלּוּ דְבָרִים שֶׁאָדָם אוֹכֵל פֵּרוֹתֵיהֶם בָּעוֹלָם הַזֶּה וְהַקֶּרֶן קַיֶּמֶת לָעוֹלָם הַבָּא, וְאֵלּוּ הֵן: כִּבּוּד אָב וָאֵם, וּגְמִילוּת חֲסָדִים, וְהַשְׁכָּמַת בֵּית הַמִּדְרָשׁ שַׁחֲרִית וְעַרְבִית, וְהַכְנָסַת אוֹרְחִים, וּבִקּוּר חוֹלִים, וְהַכְנָסַת כַּלָּה, וְהַלְוָיַת הַמֵּת, וְעִיּוּן תְּפִלָּה, וַהֲבָאַת שָׁלוֹם שֶׁבֵּין אָדָם לַחֲבֵרוֹ וּבֵין אִישׁ לְאִשְׁתּוֹ, וְתַלְמוּד תּוֹרָה כְּנֶגֶד כֻּלָּם:",
      ],
      all: [
        "אֵלּוּ דְבָרִים שֶׁאֵין לָהֶם שִׁעוּר, הַפֵּאָה וְהַבִּכּוּרִים וְהָרְאָיוֹן וּגְמִילוּת חֲסָדִים וְתַלְמוּד תּוֹרָה:",
        "אֵלּוּ דְבָרִים שֶׁאָדָם אוֹכֵל פֵּרוֹתֵיהֶם בָּעוֹלָם הַזֶּה וְהַקֶּרֶן קַיֶּמֶת לָעוֹלָם הַבָּא, וְאֵלּוּ הֵן: כִּבּוּד אָב וָאֵם, וּגְמִילוּת חֲסָדִים, וְהַשְׁכָּמַת בֵּית הַמִּדְרָשׁ שַׁחֲרִית וְעַרְבִית, וְהַכְנָסַת אוֹרְחִים, וּבִקּוּר חוֹלִים, וְהַכְנָסַת כַּלָּה, וּלְוָיַת הַמֵּת, וְעִיּוּן תְּפִלָּה, וַהֲבָאַת שָׁלוֹם בֵּין אָדָם לַחֲבֵרוֹ וּבֵין אִישׁ לְאִשְׁתּוֹ, וְתַלְמוּד תּוֹרָה כְּנֶגֶד כֻּלָּם:",
      ],
    },
    translit: [
      "Eilu devarim she'ein lahem shiur: hapei'ah v'habikurim v'hara'ayon ug'milut chasadim v'talmud Torah.",
      "Eilu devarim she'adam ochel peiroteihem ba'olam hazeh v'hakeren kayemet la'olam haba, v'eilu hen: kibud av va'em, ug'milut chasadim, v'hashkamat beit hamidrash shacharit v'arvit, v'hachnasat orchim, uvikur cholim, v'hachnasat kalah, ul'vayat hamet, v'iyun tefilah, vahava'at shalom bein adam lachavero uvein ish l'ishto, v'talmud Torah k'neged kulam.",
    ],
    en: [
      "These are things that have no fixed measure: the corner of the field⟪ left standing for the poor to take⟫, the first fruits⟪ brought up to the Temple⟫, the festival offering⟪ brought on going up to Jerusalem⟫, acts of kindness, and the study of Torah⟪ — no amount of any of these counts as done⟫.",
      "These are things whose fruit a person eats in this world while the principal remains for the world to come⟪ — you are paid now, and nothing is deducted⟫: honouring a father and mother, acts of kindness, coming early to the study hall morning and evening, hosting guests, visiting the sick, helping a bride marry, escorting the dead⟪ — a kindness that can never be repaid⟫, concentration in prayer, and making peace between a person and his fellow and between a man and his wife — and the study of Torah is equal to them all.",
    ],
    meditation:
      "Every item is something you do with your body, for another person: honour your parents, do a kindness, show up early, host a guest, visit the sick, help a bride marry, walk a body to the grave, mean it when you pray, make peace between two people. This is the last thing the morning says to you before the day starts.",
    cue: "Pick one from the list. You have until tonight.",
    prompts: [
      "Which one on that list are you doing today? Name the person.",
      "Which one have you not done in a year?",
      "Who did one of these for you and never got thanked?",
    ],
  },
];

const ALL: Record<string, Raw> = Object.fromEntries(
  [...OPENERS, ...SEALS.map(sealStation), ...CLOSERS].map((r) => [r.id, r])
);

// ---------------------------------------------------------------------------
// Order — the part that actually differs between the nusachim
// ---------------------------------------------------------------------------

const AFTER_NESHAMAH: Record<Nusach, string[]> = {
  // Siddur Torah Or: rooster, then the body blessings, and the three of
  // identity come late — immediately before הַמַּעֲבִיר שֵׁנָה.
  ari: [
    "sechvi", "ivrim", "asurim", "kefufim", "arumim", "koach", "roka",
    "mitzadei", "tzorki", "gevurah", "tifarah",
    "yisrael", "chorin", "kirtzono",
    "sheinah",
  ],
  // Metsudah (Ashkenaz) and the Nusach Sefard siddur agree here: the three of
  // identity come second, right after the rooster.
  ashkenaz: [
    "sechvi", "yisrael", "chorin", "kirtzono",
    "ivrim", "arumim", "asurim", "kefufim", "roka", "tzorki", "mitzadei",
    "gevurah", "tifarah", "koach",
    "sheinah",
  ],
  sefard: [
    "sechvi", "yisrael", "chorin", "kirtzono",
    "ivrim", "arumim", "asurim", "kefufim", "roka", "tzorki", "mitzadei",
    "gevurah", "tifarah", "koach",
    "sheinah",
  ],
};

function orderFor(n: Nusach): string[] {
  return [
    "modeh", "netilah", "asheryatzar", "neshamah",
    ...AFTER_NESHAMAH[n],
    "yehiratzon", "shetatzileini", "torah", "kohanim", "eiludevarim",
  ];
}

// ---------------------------------------------------------------------------
// Building the sit
// ---------------------------------------------------------------------------

// Ashkenaz seals Vihi Ratzon with גּוֹמֵל, Sefard and Ari with הַגּוֹמֵל.
function sealWord(n: Nusach, lang: "he" | "tr"): string {
  const he = n === "ashkenaz" ? "גּוֹמֵל" : "הַגּוֹמֵל";
  const tr = n === "ashkenaz" ? "gomel" : "hagomel";
  return lang === "he" ? he : tr;
}

// And Sefard alone prints וְכֹף where the others print וְכוֹף.
function kofWord(n: Nusach, lang: "he" | "tr"): string {
  const he = n === "sefard" ? "וְכֹף" : "וְכוֹף";
  const tr = n === "sefard" ? "v'chof" : "v'chof";
  return lang === "he" ? he : tr;
}

function lines(
  v: ByNusach<string[]> | ((o: Opts) => string[]),
  o: Opts,
  lang: "he" | "tr" | "en",
  explain = false
): string[] {
  const raw = typeof v === "function" ? v(o) : pick(v, o.nusach);
  return raw
    .map((s) =>
      s
        .replace(/\{SEAL\}/g, sealWord(o.nusach, "he"))
        .replace(/\{SEALTR\}/g, sealWord(o.nusach, "tr"))
        .replace(/\{KOF\}/g, kofWord(o.nusach, "he"))
        .replace(/\{KOFTR\}/g, kofWord(o.nusach, "tr"))
    )
    .map((s) => resolve(s, o, lang))
    .map((s) => (lang === "en" && !explain ? stripExplain(s) : s));
}

/**
 * Days since the epoch, in local time — the index the rotating prompts turn on,
 * so the question is stable for a whole morning and different tomorrow.
 */
export function dayIndex(d = new Date()): number {
  return Math.floor(
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000
  );
}

// ---------------------------------------------------------------------------
// The deep level
//
// A second pass at each blessing, and a question for the stations that don't
// carry one of their own. This is not commentary and not study — it is the same
// noticing, gone one layer further in. It is kept apart from the liturgy above
// so the text stays the text.
// ---------------------------------------------------------------------------

const LAYER: Record<string, { deeper: string; prompts?: string[] }> = {
  modeh: {
    deeper:
      "Notice what the sentence does not say. It doesn't thank God for a good day ahead, or for anything you own. It thanks Him for the return of something you never knew was gone. Every night is a small rehearsal, and every morning is the answer to it — which is why it is said before your feet touch the floor, before the day has had a chance to make any claims on you.",
  },
  netilah: {
    deeper:
      "Ritual is how a body learns what the mind already knows. You can decide in your head that today starts clean; the water is how you tell your hands. Even at its plainest, this is the first thing you do all day that you chose rather than reacted to.",
    prompts: [
      "What from yesterday are you carrying that you would rather leave at the sink?",
      "Name the first thing today you will choose rather than react to.",
    ],
  },
  asheryatzar: {
    deeper:
      "The blessing ends on umafli la'asot — who does wonders. The commentators ask what the wonder actually is, and the answer they land on is not the plumbing: it is that a soul stays joined to a body at all. Read that way this is not a blessing about anatomy. It is about the improbability of being one thing, self and body together, for another day.",
  },
  neshamah: {
    deeper:
      "Look at the tenses: You created it, formed it, breathed it in, keep it, will take it, will return it. Past, present and future in one sentence — and every verb belongs to someone else. The one thing the prayer never says is that the soul is yours. It is on loan, it came back clean, and the day is what you do with it.",
    prompts: [
      "What would you do differently today if you fully believed nothing from yesterday had stained you?",
      "Say the word pure about yourself. Notice what argues back.",
    ],
  },
  sechvi: {
    deeper:
      "The word sechvi is rare enough that the commentators disagree about it — a rooster, or the heart, or the mind's own power to tell things apart. All three readings land in the same place: something in you knows dark from light before you have reasoned it out. The blessing thanks God for the instinct, not for the analysis.",
  },
  yisrael: {
    deeper:
      "It is worth being honest about the discomfort in this blessing, because the discomfort is part of it. It names something about you that you did not earn and cannot resign from. That is what an inheritance is — and the only question an inheritance ever puts to anyone is whether they will steward it or just sit on it.",
  },
  chorin: {
    deeper:
      "A slave's day is decided somewhere else. The test of freedom is not whether anybody owns you; it is whether, at the end of today, you could name one hour that went where you sent it. Most of us are freer in law than in practice — and this is said at the exact moment when the whole day is still unclaimed.",
  },
  kirtzono: {
    deeper:
      "According to His will is not a consolation prize. It is a claim that you are not a rough draft of somebody else — that the particular shape of your capacities, your obligations and your limits was intended. Which puts a question to you that a general blessing never could.",
    prompts: [
      "What can you do that is not easily replaceable — and are you actually spending it?",
      "Where do you keep wishing you had been handed a different set of tools?",
    ],
  },
  ivrim: {
    deeper:
      "Pokeach ivrim is present tense: who opens the eyes of the blind, now, continuously. Sight is not a possession handed over once. It is being given again this second, and again — and the blessing catches you in the act of receiving it.",
  },
  arumim: {
    deeper:
      "Notice who is being clothed in the blessing. Not me — the naked, plural, everybody. It is not a private thank-you for a wardrobe. It is a statement that covering people is what God does, which makes it fairly obvious what you are meant to do with the spare coat.",
    prompts: [
      "Whose dignity is in your hands today?",
      "What do the clothes you just put on say you are about to do?",
    ],
  },
  asurim: {
    deeper:
      "The Talmud attaches this to the moment the body unlocks after sleep. But asurim is the same word the prophets use for prisoners and the Psalms for people trapped by their circumstances. The blessing lets you say both at once, and never asks you to specify which one you meant.",
  },
  kefufim: {
    deeper:
      "Bent is a posture, then a habit, then a shape. And the blessing does not say the bent straighten themselves. It says they are straightened — worth sitting with if there is something you have been trying to fix by effort alone for longer than that has been working.",
    prompts: [
      "What have you been bent under long enough that it has started to feel normal?",
      "Where do you need to be straightened rather than to straighten yourself?",
    ],
  },
  roka: {
    deeper:
      "Land over water is a deliberately unstable picture. The ground here is not bedrock; it is something spread over something that moves. The blessing does not promise the water is gone. It says the ground holds anyway, today, and asks you to walk on it.",
    prompts: [
      "What in your life is solid ground that you long ago stopped thanking anyone for?",
      "What are you standing on today that you do not actually control?",
    ],
  },
  tzorki: {
    deeper:
      "Kol tzorki — my every need. Not my every want; the Hebrew is precise about it. Said at the shoes, the last thing between you and the door, it draws a line most of us never draw: this side is need, and it is already met; the other side is want, and the day is about to work very hard to blur the two.",
  },
  mitzadei: {
    deeper:
      "Mitzadei gaver — a person's steps, particular and specific, not humanity's in general. The claim is not that a plan exists somewhere. It is that today's route, including the detour you will resent at four in the afternoon, is being set with you. You still have to walk it.",
    prompts: [
      "Where is one place you will go today that you would rather not?",
      "Where did an unplanned turn last year end up mattering?",
    ],
  },
  gevurah: {
    deeper:
      "Gevurah in the tradition is not raw force — it is restraint, the strength to hold something back. Girding is what you do before work, and a belt is what keeps a person from coming apart in the middle of it. Ask what you will have to hold in today, not only what you will have to push through.",
    prompts: [
      "Where will you need to hold back today rather than push?",
      "What will take more strength today than it looks like it should?",
    ],
  },
  tifarah: {
    deeper:
      "Tiferet is beauty of a particular kind — the beauty of things in proportion. And a crown is not worn for the wearer; it is worn so other people can see who is coming. Whatever you carry out the door this morning, somebody will read it as evidence about the people who raised you.",
    prompts: [
      "Who will read you today as evidence about your family?",
      "What would the person whose name you carry want seen this morning?",
    ],
  },
  koach: {
    deeper:
      "Ya'ef — weary — is the word Isaiah uses for a nation that has run out. The blessing does not promise energy. It promises that strength gets given to the empty, which is a different claim and a far more useful one at six in the morning.",
    prompts: [
      "What are you tired of, as opposed to tired from?",
      "What will you begin today without waiting to feel ready for it?",
    ],
  },
  sheinah: {
    deeper:
      "Two nouns, sleep and slumber, and two places, the eyes and the eyelids. The liturgy is being oddly specific for a sentence about waking up. Read it as the difference between being awake and being alert — plenty of people get the first every morning without ever getting the second.",
    prompts: [
      "You are awake. Are you alert? What would it take?",
      "What did you sleep through this week that you should have noticed?",
    ],
  },
  yehiratzon: {
    deeper:
      "Count the requests. Two are about learning, four are about staying out of trouble, two are about company, one is about your own instinct, and the last is about how you will be seen. Not one of them is about an outcome. This is a prayer about who you will be at three in the afternoon, not about what you will get.",
    prompts: [
      "Which line on that list do you most need this week?",
      "Who is the bad friend the prayer asks to be kept from — and is it ever you?",
    ],
  },
  shetatzileini: {
    deeper:
      "The list ends on a phrase that stops people: whether he is a member of the covenant or not. The prayer refuses to assume that harm only ever comes from outside. And notice the mirror — nearly every item you are asking to be spared is something one person does to another. The list reads both ways.",
  },
  torah: {
    deeper:
      "Three blessings for one act, which is unusual. The first is the ordinary blessing before a mitzvah. The second asks for the learning to be sweet. The third thanks God for having been given it at all. Wanting, enjoying and receiving — the tradition does not assume that doing the thing and loving the thing are the same thing.",
    prompts: [
      "What one thing would you like to understand better by tonight?",
      "When did learning something last feel sweet rather than owed?",
    ],
  },
  kohanim: {
    deeper:
      "The first line asks for things — bless and guard. The second asks for attention: that a face be turned toward you, and be kind about it. The third asks for shalom, which in Hebrew is less the absence of conflict than the state of a thing being whole. Possessions, then being seen, then being whole; most days get spent in exactly the reverse order. Then the closing verse resolves it, and it is the easiest line in the morning to read straight past: they shall place My name on the children of Israel, and I will bless them. The kohanim say words. God does the blessing. What one person can actually do for another is put a name on them — say out loud that they belong to something and are worth blessing — and that turns out to be the part that was being asked for.",
  },
  eiludevarim: {
    deeper:
      "Read the two headings together: these are things with no fixed measure, and these are things whose fruit you eat now while the principal stays untouched. Both halves say the same thing from opposite ends — there is no amount of this that counts as finished, and none of it is ever wasted. It is a strange sort of comfort. The work has no ceiling and no drain.",
  },
};

/**
 * The question for this station this morning, if the level asks for one. A
 * station's own `prompts` are its guided-level question; LAYER supplies one for
 * every other station, which only the deep level draws on.
 */
function promptFor(r: Raw, depth: Depth, day: number, i: number): string | undefined {
  if (depth === "quiet") return undefined;
  const set = r.prompts?.length ? r.prompts : depth === "deep" ? LAYER[r.id]?.prompts : undefined;
  if (!set?.length) return undefined;
  return set[(((day + i) % set.length) + set.length) % set.length];
}

export function buildStations(
  o: Opts,
  length: Length,
  longForm: boolean,
  depth: Depth = "guided",
  explain = false,
  day = dayIndex()
): Station[] {
  return orderFor(o.nusach)
    .map((id) => ALL[id])
    .filter((r) => (r.long ? longForm : true))
    .filter((r) => (length === "short" ? !!r.core : true))
    .map((r, i) => ({
      id: r.id,
      kicker: r.kicker,
      title: r.title,
      heTitle:
        typeof r.heTitle === "function" ? r.heTitle(o) : pick(r.heTitle, o.nusach),
      theme: r.theme,
      meditation: r.meditation,
      cue: r.cue,
      note: r.note ? pick(r.note, o.nusach) : undefined,
      core: r.core,
      long: r.long,
      // Offset by the station's position so two stations don't ask sibling
      // questions on the same morning.
      prompt: promptFor(r, depth, day, i),
      deeper: depth === "deep" ? LAYER[r.id]?.deeper : undefined,
      he: lines(r.he, o, "he"),
      translit: lines(r.translit, o, "tr"),
      en: lines(r.en, o, "en", explain),
    }));
}

/** Rough minutes for a sit of n stations, at an unhurried pace. */
export function estimateMinutes(n: number): number {
  return Math.max(2, Math.round((n * 35) / 60));
}

/**
 * Station titles keyed by id — so the journal can label a line somebody wrote
 * weeks ago without rebuilding a whole sit to find it.
 */
export const STATION_LABELS: Record<string, { title: string }> = Object.fromEntries(
  Object.values(ALL).map((r) => [r.id, { title: r.title }])
);

// ---------------------------------------------------------------------------
// The closing screen isn't a blessing, so it lives on its own.
//
// It asks for an if-then plan rather than a free-floating resolution, which is
// the one design choice here taken straight from the research: Gollwitzer &
// Sheeran's meta-analysis of 94 studies found naming the trigger alongside the
// action roughly doubles follow-through compared with intention alone.
// ---------------------------------------------------------------------------

export const CLOSING = {
  title: "Take it with you",
  heTitle: "וְעַכְשָׁיו",
  whenLabel: "When this happens today…",
  whenPlaceholder: "the first time someone tests my patience",
  thenLabel: "…I will",
  thenPlaceholder: "stop, breathe once, and answer slower",
  note: "Naming the moment, not just the resolve, is what makes it stick.",
};
