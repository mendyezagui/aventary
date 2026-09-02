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

export function resolve(s: string, o: Opts, lang: "he" | "tr" | "en"): string {
  const out = s
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
  /** Rotating set — one is chosen per day so the question doesn't go stale. */
  prompts?: string[];
  note?: string;
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
    heTitle: { ari: "הַנּוֹתֵן לַשְּׂכְוִי בִינָה", all: "אֲשֶׁר נָתַן לַשֶּׂכְוִי בִינָה" },
    title: "The rooster's discernment",
    theme: "Telling night from morning",
    he: {
      ari: "הַנּוֹתֵן לַשְּׂכְוִי בִינָה לְהַבְחִין בֵּין יוֹם וּבֵין לָיְלָה.",
      all: "אֲשֶׁר נָתַן לַשֶּׂכְוִי בִינָה לְהַבְחִין בֵּין יוֹם וּבֵין לָיְלָה.",
    },
    tr: {
      ari: "hanotein lasechvi vinah l'havchin bein yom uvein lailah.",
      all: "asher natan lasechvi vinah l'havchin bein yom uvein lailah.",
    },
    en: {
      ari: "who gives the rooster the understanding to tell day from night.",
      all: "who gave the rooster the understanding to tell day from night.",
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
    he: "שֶׁלֹּא עָשַׂנִי גּוֹי.",
    tr: "shelo asani goy.",
    en: "who did not make me a gentile.",
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
    he: "שֶׁלֹּא עָשַׂנִי עָבֶד.",
    tr: "shelo asani aved.",
    en: "who did not make me a slave.",
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
      o.voice === "female" ? "שֶׁעָשַׂנִי כִּרְצוֹנוֹ." : "שֶׁלֹּא עָשַׂנִי אִשָּׁה.",
    tr: (o) => (o.voice === "female" ? "she'asani kirtzono." : "shelo asani ishah."),
    en: (o) =>
      o.voice === "female"
        ? "who made me according to His will."
        : "who did not make me a woman.",
    meditation:
      "The classical commentators read this blessing as being about the particular obligations a person is handed — not about anyone's worth. Taken honestly it is a question rather than a claim: what are you actually doing with the duties that came with your life?",
    cue: "Sit with the word 'deliberately' for one breath.",
  },
  {
    id: "ivrim",
    heTitle: "פּוֹקֵחַ עִוְרִים",
    title: "Sight",
    theme: "Seeing",
    he: "פּוֹקֵחַ עִוְרִים.",
    tr: "pokeach ivrim.",
    en: "who gives sight to the blind.",
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
    he: "מַלְבִּישׁ עֲרֻמִּים.",
    tr: "malbish arumim.",
    en: "who clothes the naked.",
    meditation:
      "The first thing the Torah says God made for a human being was clothing. Not shelter, not tools — dignity. Getting dressed is a small daily act of being taken care of.",
    cue: "Feel the weight of the fabric on your shoulders.",
  },
  {
    id: "asurim",
    heTitle: "מַתִּיר אֲסוּרִים",
    title: "Released",
    theme: "Loosening",
    he: "מַתִּיר אֲסוּרִים.",
    tr: "matir asurim.",
    en: "who frees the bound.",
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
    he: "זוֹקֵף כְּפוּפִים.",
    tr: "zokef k'fufim.",
    en: "who straightens the bent.",
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
    he: "רוֹקַע הָאָרֶץ עַל הַמָּיִם.",
    tr: "roka ha'aretz al hamayim.",
    en: "who spreads the earth over the waters.",
    meditation:
      "Land stretched over water — a picture of ground that is stable without being guaranteed. The floor holds this morning. That is not nothing, and it is not owed.",
    cue: "Press your feet into the floor and feel the floor push back.",
  },
  {
    id: "tzorki",
    heTitle: "שֶׁעָשָׂה לִּי כָּל צָרְכִּי",
    title: "Every need",
    theme: "Enough",
    he: "שֶׁעָשָׂה לִּי כָּל צָרְכִּי.",
    tr: "she'asah li kol tzorki.",
    en: "who has provided me my every need.",
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
    he: "הַמֵּכִין מִצְעֲדֵי גָבֶר.",
    tr: "hameichin mitzadei gaver.",
    en: "who steadies a person's steps.",
    meditation:
      "You will take thousands of steps today and you will have planned almost none of them. The blessing suggests the route is being written with you, not only by you.",
    cue: "Picture the first place you will walk to today.",
  },
  {
    id: "gevurah",
    heTitle: "אוֹזֵר יִשְׂרָאֵל בִּגְבוּרָה",
    title: "Girded with strength",
    theme: "Strength",
    he: "אוֹזֵר יִשְׂרָאֵל בִּגְבוּרָה.",
    tr: "ozer Yisrael bigvurah.",
    en: "who girds Israel with strength.",
    meditation:
      "Said at the belt. Not strength you own — strength you are handed each morning and asked to spend well before the day is out.",
    cue: "Where, specifically, will you need strength today?",
  },
  {
    id: "tifarah",
    heTitle: "עוֹטֵר יִשְׂרָאֵל בְּתִפְאָרָה",
    title: "Crowned",
    theme: "Whose name you carry",
    he: "עוֹטֵר יִשְׂרָאֵל בְּתִפְאָרָה.",
    tr: "oter Yisrael b'tifarah.",
    en: "who crowns Israel with dignity.",
    meditation:
      "Said at the covering of the head. A crown is a reminder of who you represent when you walk out — you are somebody's child, somebody's parent, somebody's neighbour, and they are all on your head today.",
    cue: "Whose name are you carrying out the door this morning?",
  },
  {
    id: "koach",
    heTitle: "הַנּוֹתֵן לַיָּעֵף כֹּחַ",
    title: "Strength to the weary",
    theme: "Beginning tired",
    he: "הַנּוֹתֵן לַיָּעֵף כֹּחַ.",
    tr: "hanotein laya'ef koach.",
    en: "who gives strength to the weary.",
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
    he: "הַמַּעֲבִיר שֵׁנָה מֵעֵינָי וּתְנוּמָה מֵעַפְעַפָּי.",
    tr: "hama'avir sheinah me'einai ut'numah me'af'apai.",
    en: "who removes sleep from my eyes and slumber from my eyelids.",
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
      `${o.voice === "female" ? "מוֹדָה" : "מוֹדֶה"} אֲנִי לְפָנֶיךָ, מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה. רַבָּה אֱמוּנָתֶךָ.`,
    ],
    translit: (o) => [
      `${o.voice === "female" ? "Modah" : "Modeh"} ani lefanecha, melech chai v'kayam, shehechezarta bi nishmati b'chemlah. Rabah emunatecha.`,
    ],
    en: [
      "I give thanks before You, living and enduring King, for returning my soul to me with compassion. Great is Your faithfulness.",
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
    he: [`${OPEN_HE} אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל נְטִילַת יָדָיִם.`],
    translit: [`${OPEN_TR} asher kid'shanu b'mitzvotav v'tzivanu al netilat yadayim.`],
    en: [
      `${OPEN_EN} who made us holy with His commandments and commanded us on the washing of hands.`,
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
        `${OPEN_HE} אֲשֶׁר יָצַר אֶת הָאָדָם בְּחָכְמָה, וּבָרָא בוֹ נְקָבִים נְקָבִים, חֲלוּלִים חֲלוּלִים.`,
        "גָּלוּי וְיָדוּעַ לִפְנֵי כִסֵּא כְבוֹדֶךָ, שֶׁאִם יִסָּתֵם אֶחָד מֵהֶם אוֹ אִם יִפָּתֵחַ אֶחָד מֵהֶם, אִי אֶפְשַׁר לְהִתְקַיֵּם אֲפִילוּ שָׁעָה אֶחָת.",
        "בָּרוּךְ אַתָּה {H}, רוֹפֵא כָל בָּשָׂר וּמַפְלִיא לַעֲשׂוֹת.",
      ],
      all: [
        `${OPEN_HE} אֲשֶׁר יָצַר אֶת הָאָדָם בְּחָכְמָה, וּבָרָא בוֹ נְקָבִים נְקָבִים, חֲלוּלִים חֲלוּלִים.`,
        "גָּלוּי וְיָדוּעַ לִפְנֵי כִסֵּא כְבוֹדֶךָ, שֶׁאִם יִפָּתֵחַ אֶחָד מֵהֶם אוֹ יִסָּתֵם אֶחָד מֵהֶם, אִי אֶפְשַׁר לְהִתְקַיֵּם וְלַעֲמֹד לְפָנֶיךָ אֲפִילוּ שָׁעָה אֶחָת.",
        "בָּרוּךְ אַתָּה {H}, רוֹפֵא כָל בָּשָׂר וּמַפְלִיא לַעֲשׂוֹת.",
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
        `${OPEN_EN} who formed a human being with wisdom, and made in him openings upon openings, hollows upon hollows.`,
        "It is revealed and known before Your throne of glory that if one of them were to close, or one of them were to open, it would be impossible to survive even for an hour.",
        "Blessed are You, {H}, healer of all flesh, who does wonders.",
      ],
      all: [
        `${OPEN_EN} who formed a human being with wisdom, and made in him openings upon openings, hollows upon hollows.`,
        "It is revealed and known before Your throne of glory that if one of them were to open, or one of them were to close, it would be impossible to survive and stand before You even for an hour.",
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
      "אֱלֹהַי, נְשָׁמָה שֶׁנָּתַתָּ בִּי טְהוֹרָה הִיא. אַתָּה בְרָאתָהּ, אַתָּה יְצַרְתָּהּ, אַתָּה נְפַחְתָּהּ בִּי, וְאַתָּה מְשַׁמְּרָהּ בְּקִרְבִּי.",
      `וְאַתָּה עָתִיד לִטְּלָהּ מִמֶּנִּי וּלְהַחֲזִירָהּ בִּי לֶעָתִיד לָבֹא. כָּל זְמַן שֶׁהַנְּשָׁמָה בְקִרְבִּי, ${o.voice === "female" ? "מוֹדָה" : "מוֹדֶה"} אֲנִי לְפָנֶיךָ, {H} אֱלֹהַי וֵאלֹהֵי אֲבוֹתַי, רִבּוֹן כָּל הַמַּעֲשִׂים, אֲדוֹן כָּל הַנְּשָׁמוֹת.`,
      "בָּרוּךְ אַתָּה {H}, הַמַּחֲזִיר נְשָׁמוֹת לִפְגָרִים מֵתִים.",
    ],
    translit: (o) => [
      "Elohai, neshamah shenatata bi t'horah hi. Atah v'ratah, atah y'tzartah, atah n'fachtah bi, v'atah m'shamrah b'kirbi.",
      `V'atah atid lit'lah mimeni ul'hachazirah bi le'atid lavo. Kol z'man shehaneshamah v'kirbi, ${o.voice === "female" ? "modah" : "modeh"} ani lefanecha, {H} Elohai vElohei avotai, ribon kol hama'asim, adon kol han'shamot.`,
      "Baruch atah {H}, hamachazir n'shamot lifgarim metim.",
    ],
    en: [
      "My God, the soul You placed in me is pure. You created it, You formed it, You breathed it into me, and You keep it safe inside me.",
      "One day You will take it from me and return it to me in the time to come. For as long as the soul is within me I give thanks before You, {H}, my God and God of my fathers, Master of all works, Lord of all souls.",
      "Blessed are You, {H}, who returns souls to the lifeless.",
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
        "וִיהִי רָצוֹן מִלְּפָנֶיךָ, {H} {E} וֵאלֹהֵי אֲבוֹתֵינוּ, שֶׁתַּרְגִּילֵנוּ בְּתוֹרָתֶךָ וְתַדְבִּיקֵנוּ בְּמִצְוֹתֶיךָ, וְאַל תְּבִיאֵנוּ לֹא לִידֵי חֵטְא, וְלֹא לִידֵי עֲבֵרָה וְעָוֹן, וְלֹא לִידֵי נִסָּיוֹן, וְלֹא לִידֵי בִזָּיוֹן, וְאַל יִשְׁלוֹט בָּנוּ יֵצֶר הָרָע.",
        "וְהַרְחִיקֵנוּ מֵאָדָם רָע וּמֵחָבֵר רָע, וְדַבְּקֵנוּ בְּיֵצֶר טוֹב וּבְמַעֲשִׂים טוֹבִים, וְכוֹף אֶת יִצְרֵנוּ לְהִשְׁתַּעְבֶּד לָךְ, וּתְנֵנוּ הַיּוֹם וּבְכָל יוֹם לְחֵן וּלְחֶסֶד וּלְרַחֲמִים בְּעֵינֶיךָ וּבְעֵינֵי כָל רוֹאֵינוּ, וְתִגְמְלֵנוּ חֲסָדִים טוֹבִים.",
        "בָּרוּךְ אַתָּה {H}, הַגּוֹמֵל חֲסָדִים טוֹבִים לְעַמּוֹ יִשְׂרָאֵל.",
      ],
      all: [
        "וִיהִי רָצוֹן מִלְּפָנֶיךָ, {H} {E} וֵאלֹהֵי אֲבוֹתֵינוּ, שֶׁתַּרְגִּילֵנוּ בְּתוֹרָתֶךָ וְדַבְּקֵנוּ בְּמִצְוֹתֶיךָ, וְאַל תְּבִיאֵנוּ לֹא לִידֵי חֵטְא, וְלֹא לִידֵי עֲבֵרָה וְעָוֹן, וְלֹא לִידֵי נִסָּיוֹן, וְלֹא לִידֵי בִזָּיוֹן, וְאַל יִשְׁלֹט בָּנוּ יֵצֶר הָרָע.",
        "וְהַרְחִיקֵנוּ מֵאָדָם רָע וּמֵחָבֵר רָע, וְדַבְּקֵנוּ בְּיֵצֶר הַטּוֹב וּבְמַעֲשִׂים טוֹבִים, וְכוֹף אֶת יִצְרֵנוּ לְהִשְׁתַּעְבֶּד לָךְ, וּתְנֵנוּ הַיּוֹם וּבְכָל יוֹם לְחֵן וּלְחֶסֶד וּלְרַחֲמִים בְּעֵינֶיךָ וּבְעֵינֵי כָל רוֹאֵינוּ, וְתִגְמְלֵנוּ חֲסָדִים טוֹבִים.",
        "בָּרוּךְ אַתָּה {H}, {SEAL} חֲסָדִים טוֹבִים לְעַמּוֹ יִשְׂרָאֵל.",
      ],
    },
    translit: {
      ari: [
        "Vihi ratzon mil'fanecha, {H} {E} vElohei avoteinu, shetargileinu b'toratecha v'tadbikeinu b'mitzvotecha, v'al t'vi'einu lo lidei chet, v'lo lidei aveirah v'avon, v'lo lidei nisayon, v'lo lidei vizayon, v'al yishlot banu yetzer hara.",
        "V'harchikeinu me'adam ra umechaver ra, v'dab'keinu b'yetzer tov uv'ma'asim tovim, v'chof et yitzreinu l'hishta'bed lach, ut'neinu hayom uv'chol yom l'chen ul'chesed ul'rachamim b'einecha uv'einei chol ro'einu, v'tigm'leinu chasadim tovim.",
        "Baruch atah {H}, hagomel chasadim tovim l'amo Yisrael.",
      ],
      all: [
        "Vihi ratzon mil'fanecha, {H} {E} vElohei avoteinu, shetargileinu b'toratecha v'dab'keinu b'mitzvotecha, v'al t'vi'einu lo lidei chet, v'lo lidei aveirah v'avon, v'lo lidei nisayon, v'lo lidei vizayon, v'al yishlot banu yetzer hara.",
        "V'harchikeinu me'adam ra umechaver ra, v'dab'keinu b'yetzer hatov uv'ma'asim tovim, v'chof et yitzreinu l'hishta'bed lach, ut'neinu hayom uv'chol yom l'chen ul'chesed ul'rachamim b'einecha uv'einei chol ro'einu, v'tigm'leinu chasadim tovim.",
        "Baruch atah {H}, {SEALTR} chasadim tovim l'amo Yisrael.",
      ],
    },
    en: [
      "May it be Your will, {H}, {E} and God of our fathers, to make us at home in Your Torah and attached to Your commandments; do not bring us into the hands of sin, of transgression, of trial, or of disgrace; and let the bad inclination not rule us.",
      "Keep us far from a bad person and a bad friend; bind us to the good inclination and to good deeds; bend our instinct to serve You; and grant us today, and every day, favour, kindness and mercy in Your eyes and in the eyes of all who see us; and deal kindly with us.",
      "Blessed are You, {H}, who bestows good kindnesses on His people Israel.",
    ],
    meditation:
      "Read the list of what is actually being asked for. Not money, not success, not an easy day. Not to be humiliated, not to be tested past what you can hold, to be kept away from the wrong company, and to be seen kindly by the people who will look at you today.",
    cue: "Pick the one line on that list you most need this week.",
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
        `${OPEN_HE} אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לַעֲסֹק בְּדִבְרֵי תוֹרָה.`,
        "וְהַעֲרֶב נָא, {H} {E}, אֶת דִּבְרֵי תוֹרָתְךָ בְּפִינוּ וּבְפִי עַמְּךָ בֵּית יִשְׂרָאֵל, וְנִהְיֶה אֲנַחְנוּ וְצֶאֱצָאֵינוּ וְצֶאֱצָאֵי עַמְּךָ בֵּית יִשְׂרָאֵל, כֻּלָּנוּ יוֹדְעֵי שְׁמֶךָ וְלוֹמְדֵי תוֹרָתֶךָ לִשְׁמָהּ. בָּרוּךְ אַתָּה {H}, הַמְלַמֵּד תּוֹרָה לְעַמּוֹ יִשְׂרָאֵל.",
        `${OPEN_HE} אֲשֶׁר בָּחַר בָּנוּ מִכָּל הָעַמִּים וְנָתַן לָנוּ אֶת תּוֹרָתוֹ. בָּרוּךְ אַתָּה {H}, נוֹתֵן הַתּוֹרָה.`,
      ],
      ari: [
        `${OPEN_HE} אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל דִּבְרֵי תוֹרָה.`,
        "וְהַעֲרֶב נָא, {H} {E}, אֶת דִּבְרֵי תוֹרָתְךָ בְּפִינוּ וּבְפִי כָל עַמְּךָ בֵּית יִשְׂרָאֵל, וְנִהְיֶה אֲנַחְנוּ וְצֶאֱצָאֵינוּ וְצֶאֱצָאֵי כָל עַמְּךָ בֵּית יִשְׂרָאֵל, כֻּלָּנוּ יוֹדְעֵי שְׁמֶךָ וְלוֹמְדֵי תוֹרָתְךָ לִשְׁמָהּ. בָּרוּךְ אַתָּה {H}, הַמְלַמֵּד תּוֹרָה לְעַמּוֹ יִשְׂרָאֵל.",
        `${OPEN_HE} אֲשֶׁר בָּחַר בָּנוּ מִכָּל הָעַמִּים וְנָתַן לָנוּ אֶת תּוֹרָתוֹ. בָּרוּךְ אַתָּה {H}, נוֹתֵן הַתּוֹרָה.`,
      ],
      sefard: [
        `${OPEN_HE} אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל דִּבְרֵי תוֹרָה.`,
        "וְהַעֲרֶב נָא, {H} {E}, אֶת דִּבְרֵי תוֹרָתְךָ בְּפִינוּ וּבְפִי עַמְּךָ בֵּית יִשְׂרָאֵל, וְנִהְיֶה אֲנַחְנוּ וְצֶאֱצָאֵינוּ וְצֶאֱצָאֵי עַמְּךָ בֵּית יִשְׂרָאֵל, כֻּלָּנוּ יוֹדְעֵי שְׁמֶךָ וְלוֹמְדֵי תוֹרָתֶךָ לִשְׁמָהּ. בָּרוּךְ אַתָּה {H}, הַמְלַמֵּד תּוֹרָה לְעַמּוֹ יִשְׂרָאֵל.",
        `${OPEN_HE} אֲשֶׁר בָּחַר בָּנוּ מִכָּל הָעַמִּים וְנָתַן לָנוּ אֶת תּוֹרָתוֹ. בָּרוּךְ אַתָּה {H}, נוֹתֵן הַתּוֹרָה.`,
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
      `${OPEN_EN} who made us holy with His commandments and commanded us concerning words of Torah.`,
      "Make the words of Your Torah sweet in our mouths, {H}, {E}, and in the mouths of Your people the house of Israel — that we, and our children, and the children of Your people, may all know Your name and learn Your Torah for its own sake. Blessed are You, {H}, who teaches Torah to His people Israel.",
      `${OPEN_EN} who chose us from all the peoples and gave us His Torah. Blessed are You, {H}, giver of the Torah.`,
    ],
    meditation:
      "The morning ends by giving the day an aim: learn one true thing, and hand it to someone else. Notice that the blessing asks for the learning to be sweet before it asks for it to be deep.",
    cue: "Decide now what one thing you'd like to understand better by tonight.",
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
    "yehiratzon", "torah",
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

function lines(
  v: ByNusach<string[]> | ((o: Opts) => string[]),
  o: Opts,
  lang: "he" | "tr" | "en"
): string[] {
  const raw = typeof v === "function" ? v(o) : pick(v, o.nusach);
  return raw
    .map((s) =>
      s
        .replace(/\{SEAL\}/g, sealWord(o.nusach, "he"))
        .replace(/\{SEALTR\}/g, sealWord(o.nusach, "tr"))
    )
    .map((s) => resolve(s, o, lang));
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

export function buildStations(
  o: Opts,
  length: Length,
  longForm: boolean,
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
      note: r.note,
      core: r.core,
      long: r.long,
      // Offset by the station's position so two stations don't ask sibling
      // questions on the same morning.
      prompt: r.prompts?.length
        ? r.prompts[(((day + i) % r.prompts.length) + r.prompts.length) % r.prompts.length]
        : undefined,
      he: lines(r.he, o, "he"),
      translit: lines(r.translit, o, "tr"),
      en: lines(r.en, o, "en"),
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
