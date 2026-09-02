// ---------------------------------------------------------------------------
// Birchot HaShachar — the morning blessings, arranged as a guided sit.
//
// Each station carries the liturgy (Hebrew / transliteration / plain English)
// and, next to it, the introspection: what this blessing is actually noticing,
// a one-line cue to do while you say it, and — on some — a question worth
// answering in writing.
//
// The Hebrew is the standard Ashkenaz arrangement. Where a rite or a speaker
// genuinely differs (the three "shelo asani" blessings, מודה/מודה, the way the
// Name is written) the difference is a setting, not a hidden assumption.
//
// PROOFREAD NOTE: the pointed Hebrew below was typed by hand. Check it against
// your own siddur before leaning on it for davening.
// ---------------------------------------------------------------------------

export type Voice = "male" | "female";
export type Form = "traditional" | "positive";
export type NameStyle = "full" | "reverent";
export type Length = "short" | "full";

export type Opts = {
  voice: Voice;
  form: Form;
  nameStyle: NameStyle;
};

export const DEFAULT_OPTS: Opts = {
  voice: "male",
  form: "traditional",
  nameStyle: "full",
};

// ---------------------------------------------------------------------------
// The Name
//
// {H} is the Tetragrammaton, {E} is "our God". A siddur you daven from prints
// them in full; a page you're only reading from is usually written with the
// substitutions. That's the `nameStyle` setting — and it moves the
// transliteration and the English along with the Hebrew, so the three columns
// never disagree with each other.
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
  /** A question worth answering in writing. Optional — most stations have none. */
  prompt?: string;
  /** In the short (about five minute) sit. */
  core?: boolean;
  /** Only in the full-text setting. */
  long?: boolean;
};

type Raw = Omit<Station, "he" | "translit" | "en"> & {
  he: string[] | ((o: Opts) => string[]);
  translit: string[] | ((o: Opts) => string[]);
  en: string[] | ((o: Opts) => string[]);
};

// The shared opening of every blessing.
const OPEN_HE = "בָּרוּךְ אַתָּה {H} {E} מֶלֶךְ הָעוֹלָם,";
const OPEN_TR = "Baruch atah {H}, {E}, melech ha'olam,";
const OPEN_EN = "Blessed are You, {H}, {E}, King of the universe,";

// ---------------------------------------------------------------------------
// The fifteen blessings
// ---------------------------------------------------------------------------

type Seal = {
  id: string;
  heTitle: string;
  title: string;
  theme: string;
  he: string | ((o: Opts) => string);
  tr: string | ((o: Opts) => string);
  en: string | ((o: Opts) => string);
  meditation: string;
  cue: string;
  prompt?: string;
  core?: boolean;
};

const SEALS: Seal[] = [
  {
    id: "sechvi",
    heTitle: "אֲשֶׁר נָתַן לַשֶּׂכְוִי בִינָה",
    title: "The rooster's discernment",
    theme: "Telling night from morning",
    he: "אֲשֶׁר נָתַן לַשֶּׂכְוִי בִינָה לְהַבְחִין בֵּין יוֹם וּבֵין לָיְלָה.",
    tr: "asher natan lasechvi vinah l'havchin bein yom uvein lailah.",
    en: "who gave the rooster the understanding to tell day from night.",
    meditation:
      "The sequence opens not with thanks but with discernment — that even a bird knows the night has ended. Gratitude has a prerequisite: you have to notice that something changed. Plenty of us walk into a morning still carrying the previous night's weather.",
    cue: "Look at the actual light in the room for a few seconds. Not the phone.",
    prompt: "What are you still treating as night that has, in fact, already turned into morning?",
  },
  {
    id: "yisrael",
    heTitle: "שֶׁעָשַׂנִי יִשְׂרָאֵל",
    title: "Born into the story",
    theme: "Belonging",
    he: (o) => (o.form === "positive" ? "שֶׁעָשַׂנִי יִשְׂרָאֵל." : "שֶׁלֹּא עָשַׂנִי גּוֹי."),
    tr: (o) => (o.form === "positive" ? "she'asani Yisrael." : "shelo asani goy."),
    en: (o) =>
      o.form === "positive" ? "who made me a Jew." : "who did not make me a gentile.",
    meditation:
      "The classical reading of this blessing is not about rank. It is about obligation — being handed, without asking, a set of duties that give a life its shape. You were born into a story already in progress, and it expects something of you.",
    cue: "Name one person in your own family line you are standing on top of this morning.",
  },
  {
    id: "chorin",
    heTitle: "שֶׁעָשַׂנִי בֶּן חוֹרִין",
    title: "A free person",
    theme: "Freedom",
    he: (o) =>
      o.form === "positive"
        ? o.voice === "female"
          ? "שֶׁעָשַׂנִי בַּת חוֹרִין."
          : "שֶׁעָשַׂנִי בֶּן חוֹרִין."
        : "שֶׁלֹּא עָשַׂנִי עָבֶד.",
    tr: (o) =>
      o.form === "positive"
        ? o.voice === "female"
          ? "she'asani bat chorin."
          : "she'asani ben chorin."
        : "shelo asani aved.",
    en: (o) =>
      o.form === "positive" ? "who made me free." : "who did not make me a slave.",
    meditation:
      "Free means the day is yours to point somewhere. That is a gift and a bill. Most of what actually runs a morning — the phone, the inbox, the mood you woke in — you never consented to. Freedom is the daily work of taking the wheel back.",
    cue: "Notice the first thing that reached for your attention today.",
    prompt: "Where are you not free right now — and what is one inch of it you could take back today?",
    core: true,
  },
  {
    id: "kirtzono",
    heTitle: "שֶׁעָשַׂנִי כִּרְצוֹנוֹ",
    title: "Made on purpose",
    theme: "Being made deliberately",
    he: (o) =>
      o.form === "positive"
        ? "שֶׁעָשַׂנִי בְּצַלְמוֹ."
        : o.voice === "female"
          ? "שֶׁעָשַׂנִי כִּרְצוֹנוֹ."
          : "שֶׁלֹּא עָשַׂנִי אִשָּׁה.",
    tr: (o) =>
      o.form === "positive"
        ? "she'asani b'tzalmo."
        : o.voice === "female"
          ? "she'asani kirtzono."
          : "shelo asani ishah.",
    en: (o) =>
      o.form === "positive"
        ? "who made me in His image."
        : o.voice === "female"
          ? "who made me according to His will."
          : "who did not make me a woman.",
    meditation:
      "However your rite words it, the classical commentators read this blessing as being about the particular obligations a person is handed — not about anyone's worth. Taken honestly it is a question rather than a claim: what are you actually doing with the duties that came with your life?",
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
    prompt: "Name one thing you saw this week that you're glad you got to see.",
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
    prompt: "What are you bound to that you'd like loosened this year?",
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
    meditation:
      "Traditionally said while putting on shoes — the last small thing you need before you can walk out the door. It is a blessing about sufficiency, said every morning inside a life that is otherwise organised entirely around wanting more.",
    cue: "Name one thing you already have that you once prayed for.",
    prompt: "What do you have today that an earlier version of you was hoping for?",
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
  const pick = <T,>(v: T | ((o: Opts) => T), o: Opts): T =>
    typeof v === "function" ? (v as (o: Opts) => T)(o) : v;
  return {
    id: s.id,
    kicker: "Birchot HaShachar",
    title: s.title,
    heTitle: s.heTitle,
    theme: s.theme,
    meditation: s.meditation,
    cue: s.cue,
    prompt: s.prompt,
    core: s.core,
    he: (o) => [`${OPEN_HE} ${pick(s.he, o)}`],
    translit: (o) => [`${OPEN_TR} ${pick(s.tr, o)}`],
    en: (o) => [`${OPEN_EN} ${pick(s.en, o)}`],
  };
}

// ---------------------------------------------------------------------------
// The full arrangement
// ---------------------------------------------------------------------------

const RAW: Raw[] = [
  {
    id: "modeh",
    kicker: "Before you get out of bed",
    title: "Modeh Ani",
    heTitle: "מוֹדֶה אֲנִי",
    theme: "Thanks, before anything else",
    core: true,
    he: (o) => [
      `${o.voice === "female" ? "מוֹדָה" : "מוֹדֶה"} אֲנִי לְפָנֶיךָ, מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה — רַבָּה אֱמוּנָתֶךָ.`,
    ],
    translit: (o) => [
      `${o.voice === "female" ? "Modah" : "Modeh"} ani lefanecha, melech chai v'kayam, shehechezarta bi nishmati b'chemlah — rabah emunatecha.`,
    ],
    en: [
      "I give thanks before You, living and enduring King, for returning my soul to me with compassion — great is Your faithfulness.",
    ],
    meditation:
      "Before your name, before your work, before the news. The tradition puts this sentence first on purpose: gratitude offered before you have earned anything is the only kind that isn't a transaction. Your soul came back this morning, and nobody had guaranteed it would.",
    cue: "Say it slowly. Whatever else happens today, don't rush the first sentence of it.",
    prompt: "What is one thing you woke up to today that you would genuinely miss if it were gone?",
  },
  {
    id: "netilah",
    kicker: "At the sink",
    title: "Washing the hands",
    heTitle: "עַל נְטִילַת יָדָיִם",
    theme: "A clean start",
    he: [`${OPEN_HE} אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל נְטִילַת יָדָיִם.`],
    translit: [`${OPEN_TR} asher kid'shanu b'mitzvotav v'tzivanu al netilat yadayim.`],
    en: [`${OPEN_EN} who made us holy with His commandments and commanded us on the washing of hands.`],
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
    he: [
      `${OPEN_HE} אֲשֶׁר יָצַר אֶת הָאָדָם בְּחָכְמָה, וּבָרָא בוֹ נְקָבִים נְקָבִים, חֲלוּלִים חֲלוּלִים.`,
      "גָּלוּי וְיָדוּעַ לִפְנֵי כִסֵּא כְבוֹדֶךָ, שֶׁאִם יִפָּתֵחַ אֶחָד מֵהֶם, אוֹ יִסָּתֵם אֶחָד מֵהֶם, אִי אֶפְשַׁר לְהִתְקַיֵּם וְלַעֲמוֹד לְפָנֶיךָ אֲפִילוּ שָׁעָה אֶחָת.",
      "בָּרוּךְ אַתָּה {H}, רוֹפֵא כָל בָּשָׂר וּמַפְלִיא לַעֲשׂוֹת.",
    ],
    translit: [
      `${OPEN_TR} asher yatzar et ha'adam b'chochmah, uvara vo nekavim nekavim, chalulim chalulim.`,
      "Galui v'yadua lifnei chisei ch'vodecha, she'im yipateach echad mehem, o yisatem echad mehem, i efshar l'hitkayem v'la'amod l'fanecha afilu sha'ah echat.",
      "Baruch atah {H}, rofei chol basar umafli la'asot.",
    ],
    en: [
      `${OPEN_EN} who formed a human being with wisdom, and made in him openings upon openings, hollows upon hollows.`,
      "It is revealed and known before Your throne of glory that if one of them were to open, or one of them were to close, it would be impossible to survive and stand before You even for an hour.",
      "Blessed are You, {H}, healer of all flesh, who does wonders.",
    ],
    meditation:
      "Openings that stayed open and passages that stayed clear, for eight hours, with no supervision from you. The blessing states the plain fact that if a single valve had failed you would not be standing here. Most people only think about the body when it breaks; this is the practice of thinking about it while it works.",
    cue: "Take one full breath and follow it the whole way down and the whole way back out.",
    prompt: "What is one thing your body did for you today that you never asked it to do?",
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
      `וְאַתָּה עָתִיד לִטְּלָהּ מִמֶּנִּי וּלְהַחֲזִירָהּ בִּי לֶעָתִיד לָבוֹא. כָּל זְמַן שֶׁהַנְּשָׁמָה בְקִרְבִּי, ${o.voice === "female" ? "מוֹדָה" : "מוֹדֶה"} אֲנִי לְפָנֶיךָ, {H} {E} וֵאלֹהֵי אֲבוֹתַי, רִבּוֹן כָּל הַמַּעֲשִׂים, אֲדוֹן כָּל הַנְּשָׁמוֹת.`,
      "בָּרוּךְ אַתָּה {H}, הַמַּחֲזִיר נְשָׁמוֹת לִפְגָרִים מֵתִים.",
    ],
    translit: (o) => [
      "Elohai, neshamah shenatata bi t'horah hi. Atah v'ratah, atah y'tzartah, atah n'fachtah bi, v'atah m'shamrah b'kirbi.",
      `V'atah atid lit'lah mimeni ul'hachazirah bi le'atid lavo. Kol z'man shehaneshamah v'kirbi, ${o.voice === "female" ? "modah" : "modeh"} ani lefanecha, {H} {E} vElohei avotai, ribon kol hama'asim, adon kol han'shamot.`,
      "Baruch atah {H}, hamachazir n'shamot lifgarim metim.",
    ],
    en: [
      "My God, the soul You placed in me is pure. You created it, You formed it, You breathed it into me, and You keep it safe inside me.",
      "One day You will take it from me and return it to me in the time to come. For as long as the soul is within me I give thanks before You, {H}, {E} and God of my fathers, Master of all works, Lord of all souls.",
      "Blessed are You, {H}, who returns souls to the lifeless.",
    ],
    meditation:
      "“The soul You placed in me is pure.” Not was pure — is. Whatever yesterday held, whatever you said or failed to do, the core you were handed back this morning came back undamaged. This is the tradition's answer to shame, and it is said out loud before you have had a chance to argue with it.",
    cue: "Stop on the word pure for one breath before you move on.",
  },
  ...SEALS.map(sealStation),
  {
    id: "yehiratzon",
    kicker: "The request that follows",
    title: "Vihi Ratzon",
    heTitle: "וִיהִי רָצוֹן",
    theme: "Asking for character, not for luck",
    long: true,
    he: [
      "וִיהִי רָצוֹן מִלְּפָנֶיךָ, {H} אֱלֹהַי וֵאלֹהֵי אֲבוֹתַי, שֶׁתַּרְגִּילֵנִי בְּתוֹרָתֶךָ וְדַבְּקֵנִי בְּמִצְוֹתֶיךָ, וְאַל תְּבִיאֵנִי לֹא לִידֵי חֵטְא, וְלֹא לִידֵי עֲבֵרָה וְעָוֹן, וְלֹא לִידֵי נִסָּיוֹן, וְלֹא לִידֵי בִזָּיוֹן, וְאַל תַּשְׁלֶט בִּי יֵצֶר הָרָע.",
      "וְהַרְחִיקֵנִי מֵאָדָם רָע וּמֵחָבֵר רָע, וְדַבְּקֵנִי בְּיֵצֶר הַטּוֹב וּבְמַעֲשִׂים טוֹבִים, וְכוֹף אֶת יִצְרִי לְהִשְׁתַּעְבֶּד לָךְ, וּתְנֵנִי הַיּוֹם וּבְכָל יוֹם לְחֵן וּלְחֶסֶד וּלְרַחֲמִים בְּעֵינֶיךָ וּבְעֵינֵי כָל רוֹאָי, וְתִגְמְלֵנִי חֲסָדִים טוֹבִים.",
      "בָּרוּךְ אַתָּה {H}, גּוֹמֵל חֲסָדִים טוֹבִים לְעַמּוֹ יִשְׂרָאֵל.",
    ],
    translit: [
      "Vihi ratzon mil'fanecha, {H} Elohai vElohei avotai, shetargileni b'toratecha v'dab'keni b'mitzvotecha, v'al t'vi'eni lo lidei chet, v'lo lidei aveirah v'avon, v'lo lidei nisayon, v'lo lidei vizayon, v'al tashlet bi yetzer hara.",
      "V'harchikeni me'adam ra umechaver ra, v'dab'keni b'yetzer hatov uv'ma'asim tovim, v'chof et yitzri l'hishta'bed lach, ut'neni hayom uv'chol yom l'chen ul'chesed ul'rachamim b'einecha uv'einei chol ro'ai, v'tigm'leni chasadim tovim.",
      "Baruch atah {H}, gomel chasadim tovim l'amo Yisrael.",
    ],
    en: [
      "May it be Your will, {H}, my God and God of my fathers, to make me at home in Your Torah and attached to Your commandments; do not bring me into the hands of sin, of transgression, of trial, or of disgrace; and do not let the bad inclination rule me.",
      "Keep me far from a bad person and a bad friend; bind me to the good inclination and to good deeds; bend my instinct to serve You; grant me today, and every day, favour, kindness and mercy in Your eyes and in the eyes of all who see me; and deal kindly with me.",
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
    he: [
      `${OPEN_HE} אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל דִּבְרֵי תוֹרָה.`,
      "וְהַעֲרֶב נָא, {H} {E}, אֶת דִּבְרֵי תוֹרָתְךָ בְּפִינוּ וּבְפִי עַמְּךָ בֵּית יִשְׂרָאֵל, וְנִהְיֶה אֲנַחְנוּ וְצֶאֱצָאֵינוּ וְצֶאֱצָאֵי עַמְּךָ בֵּית יִשְׂרָאֵל, כֻּלָּנוּ יוֹדְעֵי שְׁמֶךָ וְלוֹמְדֵי תוֹרָתֶךָ לִשְׁמָהּ. בָּרוּךְ אַתָּה {H}, הַמְלַמֵּד תּוֹרָה לְעַמּוֹ יִשְׂרָאֵל.",
      `${OPEN_HE} אֲשֶׁר בָּחַר בָּנוּ מִכָּל הָעַמִּים וְנָתַן לָנוּ אֶת תּוֹרָתוֹ. בָּרוּךְ אַתָּה {H}, נוֹתֵן הַתּוֹרָה.`,
    ],
    translit: [
      `${OPEN_TR} asher kid'shanu b'mitzvotav v'tzivanu al divrei Torah.`,
      "V'ha'arev na, {H} {E}, et divrei Toratcha b'finu uv'fi amcha beit Yisrael, v'nihyeh anachnu v'tze'etza'einu v'tze'etza'ei amcha beit Yisrael, kulanu yod'ei sh'mecha v'lomdei Toratecha lishmah. Baruch atah {H}, ham'lamed Torah l'amo Yisrael.",
      `${OPEN_TR} asher bachar banu mikol ha'amim v'natan lanu et Torato. Baruch atah {H}, notein haTorah.`,
    ],
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

// ---------------------------------------------------------------------------
// Building the sit
// ---------------------------------------------------------------------------

function lines(
  v: string[] | ((o: Opts) => string[]),
  o: Opts,
  lang: "he" | "tr" | "en"
): string[] {
  const raw = typeof v === "function" ? v(o) : v;
  return raw.map((s) => resolve(s, o, lang));
}

export function buildStations(o: Opts, length: Length, longForm: boolean): Station[] {
  return RAW.filter((r) => (r.long ? longForm : true))
    .filter((r) => (length === "short" ? !!r.core : true))
    .map((r) => ({
      ...r,
      he: lines(r.he, o, "he"),
      translit: lines(r.translit, o, "tr"),
      en: lines(r.en, o, "en"),
    }));
}

/** Every station id, in order — used to keep saved notes attached to a station. */
export const ALL_IDS = RAW.map((r) => r.id);

/** Rough minutes for a sit of n stations, at an unhurried pace. */
export function estimateMinutes(n: number): number {
  return Math.max(2, Math.round((n * 35) / 60));
}

// ---------------------------------------------------------------------------
// The closing screen isn't a blessing, so it lives on its own.
// ---------------------------------------------------------------------------

export const CLOSING = {
  title: "Take it with you",
  heTitle: "וְעַכְשָׁיו",
  prompt: "One thing from these blessings you'll carry into the next twelve hours.",
  note: "Every one of those blessings is about something that was already true before you said it. The only new thing in the room is that you noticed.",
};

/**
 * Station titles and questions, keyed by id — so the journal can label a line
 * somebody wrote weeks ago without rebuilding a whole sit to find it.
 */
export const STATION_LABELS: Record<string, { title: string; prompt?: string }> =
  Object.fromEntries(RAW.map((r) => [r.id, { title: r.title, prompt: r.prompt }]));
