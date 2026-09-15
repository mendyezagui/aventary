// Jewish calendar for the SoFa JCC associate.
//
// Source: hebcal.com REST API — free, no key, no rate-limit worth worrying
// about at one call a day. We deliberately do NOT bundle a Hebrew-date
// library: candle-lighting and havdalah are location- and elevation-
// dependent, and Hebcal already solves that correctly for a given city.
//
// Isomorphic: uses global fetch, so the same code runs in the browser
// (SofaJCCView) and in the Vercel function (api/sofa-jcc.js). One source of
// truth means the console and the cron can never disagree about what day
// Rosh Hashana is.

// Los Angeles ZIP 90035 (Pico-Robertson), not the "Los Angeles" city geonameid.
// The geonameid resolves to downtown, whose coordinates and elevation give
// candle times a minute or two off from the neighbourhood the shul is in.
// 90035 at the standard 18 minutes reproduces the shul's own published
// 6:47pm for Erev Rosh Hashana 5787 exactly.
export const DEFAULT_ZIP = "90035";
export const DEFAULT_GEONAMEID = "";   // set to use a geonameid instead of a ZIP

// Minutes before sunset. 18 is the standard and the Hebcal default.
//
// A previous version of this file set 12, reverse-engineered from a single
// printed flyer (Fri 7 Aug 2026, which reads 7:36pm where 18 minutes gives
// 7:30pm). That was overfitting to one data point: the shul's Rosh Hashana
// times then came in at 6:47pm, which 18 minutes matches and 12 does not.
// Two flyers cannot both be explained by one offset, which is the real lesson
// below.
export const CANDLE_MINUTES_BEFORE_SUNSET = 18;

// WHY CANDLE TIMES ARE SUGGESTIONS, NOT FACTS.
//
// The shul's published zmanim do not come from Hebcal's sunset model. Their
// havdalah and holiday-end times differ from Hebcal's defaults by ~5 minutes
// too. Communities follow a specific luach, and printing a time that is five
// minutes wrong sends people to light candles after the deadline.
//
// So the calendar is trusted for WHICH DAY a holiday falls on — which is
// unambiguous — and its candle times are offered as a starting value that a
// human confirms before anything is printed. See `candle_confirmed`.
export const CANDLE_TIMES_NEED_CONFIRMATION = true;

// How far ahead the associate starts caring, and on which days it speaks up.
// Mendy asked for "3 or 4 days before": T-4 opens, T-2 chases if the flyer
// is still short of inputs, T-1 is last call, T-0 is day-of.
export const LOOKAHEAD_DAYS = 21;
export const NUDGE_LEAD_DAYS = [4, 2, 1, 0];

// Holidays that get a flyer. Everything else (minor fasts, Rosh Chodesh,
// modern civic days) still shows up in the calendar read but does not
// trigger a draft, because the shul does not print a flyer for it.
// Names are matched AFTER baseTitle() normalizes them, so write the plain
// festival name with an ASCII apostrophe — not Hebcal's decorated title.
// Yom Kippur is deliberately absent: Mendy confirmed on 2026-09-15 that the shul
// holds no services, and this flyer is a service schedule. Drafting one would
// advertise Mincha and Maariv at a shul that is closed.
export const FLYER_WORTHY = new Set([
  "Rosh Hashana", "Sukkot", "Shmini Atzeret", "Simchat Torah",
  "Chanukah", "Tu BiShvat", "Purim", "Pesach", "Lag BaOmer", "Shavuot",
  "Tish'a B'Av", "Sukkot VII (Hoshana Raba)",
]);

const pad = (n) => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD (never UTC — off-by-one at night). */
export const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return isoDate(dt);
};

/** Whole days from `from` to `to`. Date-only maths, so DST cannot shift it. */
export const daysBetween = (from, to) => {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};

/** "Rosh Hashana 5787" -> "rosh-hashana-5787" */
export const slugify = (s) =>
  String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Reduce a Hebcal title to the festival it belongs to, so FLYER_WORTHY can
 * match it. Hebcal decorates titles three different ways and all three have to
 * collapse to the same name, or a festival is silently never flagged:
 *   "Rosh Hashana 5787"    -> "Rosh Hashana"   (Hebrew year suffix)
 *   "Pesach I", "Sukkot II"-> "Pesach", "Sukkot" (day numbering)
 *   "Chanukah: 1 Candle",
 *   "Chanukah: 8th Day"    -> "Chanukah"       (per-day subtitle)
 * Chol HaMoed days like "Sukkot III (CH''M)" deliberately do NOT reduce —
 * they keep their parenthetical and so never match, which is correct: the
 * shul does not print a flyer for each intermediate day.
 */
const baseTitle = (title) => String(title)
  .replace(/[\u2018\u2019]/g, "'")  // Hebcal writes "Tish\u2019a B\u2019Av" with a curly apostrophe
  .replace(/:.*$/, "")            // "Chanukah: 1 Candle" -> "Chanukah"
  .replace(/\s+\d{4}$/, "")       // "Rosh Hashana 5787"  -> "Rosh Hashana"
  .replace(/\s+[IVX]+$/, "")      // "Pesach I"           -> "Pesach"
  .trim();

const timeOf = (item) => {
  // Hebcal gives timed items as full ISO with offset: "2026-09-11T19:11:00-04:00".
  const m = String(item.date).match(/T(\d{2}):(\d{2})/);
  if (!m) return "";
  let h = Number(m[1]);
  const suffix = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m[2]}${suffix}`;
};

/**
 * Raw calendar read for a date window.
 * Returns Hebcal's items untouched; callers normalize.
 */
export async function fetchCalendar({
  start, end, geonameid = DEFAULT_GEONAMEID, zip = DEFAULT_ZIP,
  candleMinutes = CANDLE_MINUTES_BEFORE_SUNSET, fetchImpl,
} = {}) {
  const f = fetchImpl || globalThis.fetch;
  if (typeof f !== "function") throw new Error("hebcal: no fetch available");
  const qs = new URLSearchParams({
    v: "1", cfg: "json",
    maj: "on", min: "on", mod: "off", nx: "off", ss: "on", mf: "on",
    c: "on", M: "on", s: "on",
    b: String(candleMinutes),
    ...(geonameid ? { geo: "geoname", geonameid: String(geonameid) }
                  : { geo: "zip", zip: String(zip) }),
    start, end,
  });
  const res = await f(`https://www.hebcal.com/hebcal?${qs}`);
  if (!res.ok) throw new Error(`hebcal ${res.status}`);
  const json = await res.json();
  return { items: json.items || [], location: json.location || null };
}

/**
 * Normalized upcoming holidays, newest-first by date.
 *
 * Each holiday absorbs the candle-lighting time posted on its own date and
 * the havdalah that closes it, so a flyer never has to go looking for them.
 * `leadDays` is what the nudge logic keys off.
 */
export async function upcomingHolidays({
  from = isoDate(), days = LOOKAHEAD_DAYS, geonameid = DEFAULT_GEONAMEID, zip = DEFAULT_ZIP,
  candleMinutes = CANDLE_MINUTES_BEFORE_SUNSET, fetchImpl,
} = {}) {
  const end = addDays(from, days);
  // Look back a few days as well as forward. A run is grouped from the days the
  // calendar returns, so fetching only from today makes a Yom Tov that started
  // yesterday look like it starts today — and "only a run's first day drafts"
  // then lets day two draft a second flyer. Four days covers the longest run
  // (Erev plus two days of Yom Tov). Past days still fall out on leadDays < 0.
  const { items, location } = await fetchCalendar({ start: addDays(from, -4), end, geonameid, zip, candleMinutes, fetchImpl });

  const candlesByDate = {};
  const havdalahByDate = {};
  const parashaByDate = {};
  for (const it of items) {
    const d = String(it.date).slice(0, 10);
    if (it.category === "candles") candlesByDate[d] = timeOf(it);
    if (it.category === "havdalah") havdalahByDate[d] = timeOf(it);
    if (it.category === "parashat") parashaByDate[d] = it.title;
  }

  const holidays = items
    .filter((it) => it.category === "holiday")
    .map((it) => {
      const date = String(it.date).slice(0, 10);
      const base = baseTitle(it.title);
      const isErev = /^Erev /.test(it.title);
      // An Erev flyer belongs to the holiday it opens, not to itself.
      const anchorTitle = isErev ? base.replace(/^Erev /, "") : base;
      return {
        key: `${date}:${slugify(it.title)}`,
        title: it.title,
        baseTitle: anchorTitle,
        slug: slugify(it.title),
        date,
        hdate: it.hdate || "",
        hebrew: it.hebrew || "",
        category: it.subcat || "",
        major: it.subcat === "major",
        yomtov: !!it.yomtov,
        erev: isErev,
        candleLighting: candlesByDate[date] || "",
        havdalah: havdalahByDate[date] || "",
        parasha: parashaByDate[date] || "",
        memo: it.memo || "",
        url: it.link || "",
        leadDays: daysBetween(from, date),
        flyerWorthy: FLYER_WORTHY.has(anchorTitle),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Group the days into RUNS, and give every day in a run the same key, title
  // and boundaries.
  //
  // A run is consecutive days that are Yom Tov, plus the Erev that opens them.
  // Chol HaMoed ends it: Sukkot's flyer covers 25-27 September, not all eight
  // days.
  //
  // Grouping by NAME is not enough, and that was a real bug. Rosh Hashana's
  // days are all called "Rosh Hashana", so a name check dedupes them fine. But
  // Hoshana Raba, Shmini Atzeret and Simchat Torah are one three-day run with
  // three different names, so each drafted its own flyer, each carrying a
  // shorter tail of the same schedule — three flyers where the shul holds one
  // stretch of Yom Tov.
  for (let i = 0; i < holidays.length; i++) {
    if (holidays[i].runKey) continue;
    const run = [holidays[i]];
    while (true) {
      const next = holidays[holidays.indexOf(run[run.length - 1]) + 1];
      if (!next || next.date !== addDays(run[run.length - 1].date, 1) || !next.yomtov) break;
      run.push(next);
    }
    const first = run[0];
    const last = run[run.length - 1];

    // Name the run after the Yom Tov in it, not after the day it opens on —
    // otherwise Shmini Atzeret and Simchat Torah go out under the headline
    // "Sukkot VII (Hoshana Raba)".
    const names = [...new Set(run.filter((d) => d.yomtov && !d.erev).map((d) => d.baseTitle))];
    const runTitle = names.length ? names.join(" & ") : first.baseTitle;

    const boundaries = [
      ...run
        .filter((d) => candlesByDate[d.date])
        .map((d) => ({ kind: "candles", date: d.date, time: candlesByDate[d.date] })),
      ...(havdalahByDate[last.date] ? [{ kind: "havdalah", date: last.date, time: havdalahByDate[last.date] }] : []),
    ];

    for (const d of run) { d.runKey = first.date; d.runTitle = runTitle; d.boundaries = boundaries; }
  }

  return { holidays, location, from, end };
}

/**
 * The holidays the associate should act on right now.
 *
 * Only the *entry point* of a multi-day festival gets a flyer — the Erev if
 * there is one, otherwise day one. Without this, Rosh Hashana would draft
 * three near-identical flyers (Erev, day I, day II) and nudge three times.
 */
export function actionable(holidays, { leadDays = NUDGE_LEAD_DAYS } = {}) {
  const maxLead = Math.max(...leadDays);
  const seen = new Set();
  const out = [];
  const seenRuns = new Set();
  for (const h of holidays) {
    if (!h.flyerWorthy) continue;
    // Only a run's FIRST day is actionable. Without this, the moment Erev
    // Sukkot falls out of the window, day one becomes "the first flyer-worthy
    // day in range" and drafts a second flyer, then day two drafts a third —
    // each a shorter tail of a schedule already printed days earlier. A run
    // whose opening has passed is underway; its flyer went out before it.
    if (h.runKey && h.runKey !== h.date) continue;
    if (h.leadDays < 0 || h.leadDays > maxLead) continue;
    // Both checks earn their place. The name check collapses Sukkot's Chol
    // HaMoed days, which are separate runs sharing one name. The run check
    // collapses Hoshana Raba / Shmini Atzeret / Simchat Torah, which are one
    // run under three names.
    if (seen.has(h.baseTitle) || seenRuns.has(h.runKey)) continue;
    seen.add(h.baseTitle);
    seenRuns.add(h.runKey);
    out.push({ ...h, nudgeDue: leadDays.includes(h.leadDays) });
  }
  return out;
}

/** Friday-night / Shabbos info for the coming week, for the weekly flyer. */
export async function nextShabbat({ from = isoDate(), geonameid = DEFAULT_GEONAMEID, zip = DEFAULT_ZIP, candleMinutes = CANDLE_MINUTES_BEFORE_SUNSET, fetchImpl } = {}) {
  const { items } = await fetchCalendar({ start: from, end: addDays(from, 8), geonameid, zip, candleMinutes, fetchImpl });
  const candles = items.find((it) => it.category === "candles");
  const havdalah = items.find((it) => it.category === "havdalah");
  const parasha = items.find((it) => it.category === "parashat");
  if (!candles) return null;
  const date = String(candles.date).slice(0, 10);
  return {
    date,
    candleLighting: timeOf(candles),
    havdalah: havdalah ? timeOf(havdalah) : "",
    havdalahDate: havdalah ? String(havdalah.date).slice(0, 10) : "",
    parasha: parasha ? parasha.title : "",
    leadDays: daysBetween(from, date),
  };
}
