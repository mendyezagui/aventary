// SoFa JCC associate — the decision core.
//
// Pure functions in, plain "intents" out. No Supabase, no fetch to Claude,
// no push. The Vercel function (api/sofa-jcc.js) and the browser console
// (SofaJCCView) both call these and then perform the IO themselves, so the
// cron and the UI can never disagree about what should happen.
//
// Everything an intent carries is either read from the calendar, read from
// the database, or computed. Nothing here invents a fact.

import { upcomingHolidays, actionable, nextShabbat, isoDate, addDays, daysBetween, slugify, NUDGE_LEAD_DAYS } from "./hebcal.js";
import { scheduleLines, scheduleText } from "./schedule.js";
import { computeGaps, flyerStatus, missingSentence, blocking } from "./gaps.js";
import { renderFlyer, longDate } from "./templates.js";
import { BRAND } from "./brand.js";

/**
 * Has the gap list actually moved since the stored draft?
 *
 * This cannot be `JSON.stringify(a) !== JSON.stringify(b)`, and the reason is
 * not cosmetic. `sofa_flyers.missing` is a jsonb column, and Postgres does not
 * preserve object key order in jsonb — it re-sorts keys by length, then
 * bytewise. So a gap written as {field,label,severity,question} reads back as
 * {field,label,question,severity}, and a stringify comparison reports "the
 * gaps changed" on every single scan, forever.
 *
 * The visible symptom was a flyer redrafted every morning — the scan logged
 * "1 draft(s)" daily for a flyer nobody had touched — and the real cost was
 * that a genuine gap change could never be distinguished from that noise.
 *
 * Compare the identity of the gaps instead: which fields are outstanding and
 * at what severity. Label and question are copy, not state; if they change,
 * the flyer does not need redrawing.
 */
const gapKey = (g) => `${g?.field}:${g?.severity}`;
export const gapsChanged = (a, b) => {
  const norm = (list) => (Array.isArray(list) ? list : []).map(gapKey).sort().join("|");
  return norm(a) !== norm(b);
};

/** Pick the template an event should be drawn with. */
export const templateFor = (ev) =>
  ev.speaker_id || ev.kind === "speaker" ? "speaker"
    : ev.kind === "weekly" ? "weekly"
    : "holiday";

/**
 * Turn a calendar holiday into the sofa_events row it should become.
 * `hebcal_key` is the idempotency key — re-running the scan updates the same
 * row rather than piling up duplicates.
 */
export function eventFromHoliday(h) {
  const name = h.baseTitle;
  return {
    hebcal_key: h.key,
    title: h.erev ? `${name} — Erev` : h.title,
    kind: "holiday",
    event_date: h.date,
    hebrew_date: h.hdate,
    candle_lighting: h.candleLighting || "",
    havdalah: h.havdalah || "",
    // Seed the eyebrow from the calendar so the flyer has its maroon lead-in
    // and the occasion gap starts answered.
    occasion: h.erev ? h.title : name,
    status: "draft",
    source: "agent:hebcal",
    notes: h.memo || "",
  };
}

/**
 * The full daily decision. Given the calendar and what is already stored,
 * returns every action the associate wants to take, with a reason attached.
 *
 * @returns {{ upserts, drafts, nudges, shabbat, summary }}
 */
export async function planDay({
  today = isoDate(),
  existingEvents = [],
  existingFlyers = [],
  sentNudgeKeys = [],
  speakersById = {},
  geonameid,
  fetchImpl,
} = {}) {
  const { holidays, location } = await upcomingHolidays({ from: today, geonameid, fetchImpl });
  const due = actionable(holidays, { leadDays: NUDGE_LEAD_DAYS });
  const shabbat = await nextShabbat({ from: today, geonameid, fetchImpl }).catch(() => null);

  const byKey = new Map(existingEvents.filter((e) => e.hebcal_key).map((e) => [e.hebcal_key, e]));
  const flyersByEvent = new Map();
  for (const f of existingFlyers) {
    const cur = flyersByEvent.get(f.event_id);
    if (!cur || (f.version || 1) >= (cur.version || 1)) flyersByEvent.set(f.event_id, f);
  }
  const sent = new Set(sentNudgeKeys);

  const upserts = [];
  const drafts = [];
  const nudges = [];

  for (const h of due) {
    const existing = byKey.get(h.key);

    // 1. Keep the event row in sync with the calendar.
    //
    //    A CONFIRMED candle time is never overwritten. Once a human has checked
    //    it against the shul's own luach it outranks anything computed — the
    //    two demonstrably disagree, and re-deriving it every morning would
    //    silently undo the confirmation and put a wrong time back on the flyer.
    //    The Hebrew date is safe to refresh either way; it is not a judgement
    //    call.
    const row = eventFromHoliday(h);
    if (!existing) {
      upserts.push({ ...row, reason: `${h.title} is ${h.leadDays} day(s) out and has no event row yet` });
    } else {
      const patch = {};
      if (existing.hebrew_date !== row.hebrew_date) patch.hebrew_date = row.hebrew_date;
      if (!existing.candle_confirmed && existing.candle_lighting !== row.candle_lighting) {
        patch.candle_lighting = row.candle_lighting;
      }
      if (Object.keys(patch).length) {
        upserts.push({
          id: existing.id, hebcal_key: h.key, ...patch,
          reason: existing.candle_confirmed
            ? "calendar fields drifted (confirmed candle time left alone)"
            : "calendar fields drifted",
        });
      }
    }

    // 2. Draft a flyer if there isn't one yet. A published flyer is never
    //    silently redrawn — that would replace something already circulating.
    const ev = existing ? { ...existing, ...row, id: existing.id } : row;
    const speaker = ev.speaker_id ? speakersById[ev.speaker_id] || null : null;
    const template = templateFor(ev);
    const prior = existing ? flyersByEvent.get(existing.id) : null;
    const answers = prior?.answers || {};
    const gaps = computeGaps(ev, { speaker, template, answers });
    const status = flyerStatus(gaps);

    if (!prior || prior.status === "superseded") {
      drafts.push({
        event_key: h.key,
        event_id: existing?.id ?? null,
        template,
        version: (prior?.version || 0) + 1,
        status,
        gaps,
        copy: defaultCopy(ev, h, speaker, template),
        reason: prior ? "previous draft was superseded" : `no flyer exists for ${h.title}`,
      });
    } else if (prior.status !== "published" && gapsChanged(prior.missing, gaps)) {
      drafts.push({
        event_key: h.key,
        event_id: existing?.id ?? null,
        flyer_id: prior.id,
        template,
        version: prior.version || 1,
        status,
        gaps,
        copy: null,                       // copy already written; only gaps moved
        reason: "gap list changed since the last draft",
      });
    }

    // 3. Speak up — but only on a scheduled lead day, and only once per
    //    (event, lead day). dedupe_key is what makes that guarantee hold
    //    across re-runs and across both callers.
    if (!h.nudgeDue) continue;
    const dedupe_key = `${h.key}:t-${h.leadDays}`;
    if (sent.has(dedupe_key)) continue;

    const missing = missingSentence(gaps);
    const isBlocked = blocking(gaps).length > 0;
    const when = h.leadDays === 0 ? "today" : h.leadDays === 1 ? "tomorrow" : `in ${h.leadDays} days`;

    nudges.push({
      dedupe_key,
      kind: missing ? "missing_input" : "holiday_lead",
      event_key: h.key,
      event_id: existing?.id ?? null,
      lead_days: h.leadDays,
      severity: isBlocked && h.leadDays <= 2 ? "high" : "normal",
      title: `${h.baseTitle} is ${when}`,
      body: missing
        ? `Your SoFa JCC agent drafted the flyer and is missing ${missing}.`
        : `The ${h.baseTitle} flyer is drafted and ready to review.`,
      url: "/#/sofa_jcc",
      gaps,
      reason: `T-${h.leadDays} is a scheduled lead day`,
    });
  }

  return {
    today,
    location,
    shabbat,
    upserts,
    drafts,
    nudges,
    holidays: due,
    summary:
      `${due.length} holiday(s) in the ${Math.max(...NUDGE_LEAD_DAYS)}-day window · ` +
      `${upserts.length} event upsert(s) · ${drafts.length} draft(s) · ${nudges.length} nudge(s)`,
  };
}

/**
 * Deterministic flyer copy. This is the FALLBACK and the floor: it is always
 * correct, never invented, and works with no API key. api/sofa-jcc.js may
 * ask Claude to improve the description on top of this — but if that call
 * fails, the flyer still reads properly.
 */
export function defaultCopy(ev, holiday, speaker, template) {
  if (template === "speaker" && speaker) {
    return {
      headline: speaker.name || "",
      subhead: [speaker.title, speaker.org].filter(Boolean).join(", "),
      body: speaker.short_bio || "",
      occasion: ev.occasion || "",
      lede: ev.lede || "We have the honor of welcoming our guest speaker",
      footer: BRAND.site,
    };
  }
  if (template === "weekly") {
    return { headline: `This Week at ${BRAND.publicName.replace(" Jewish Community Center", "")}`, subhead: "", body: "", occasion: "This Week", lede: "", footer: BRAND.site };
  }
  // The run's name, so a Shmini Atzeret flyer is not headed "Sukkot VII".
  const name = holiday?.runTitle || holiday?.baseTitle || ev.title || "";
  // The times, not the encyclopedia entry. holiday.boundaries covers the whole
  // Yom Tov run, because only its entry point gets a flyer. Falls back to the
  // old blurb only when there is no calendar to compute from.
  const lines = scheduleLines(holiday?.boundaries || []);
  return {
    headline: name,
    subhead: ev.subhead || "",
    schedule: lines,
    body: lines.length ? scheduleText(lines) : (ev.description || holiday?.memo || ""),
    // The house layout leads with a maroon eyebrow; Erev flyers say so.
    occasion: ev.occasion || (holiday?.erev ? "Erev " + name : ""),
    lede: ev.lede || "",
    footer: BRAND.site,
  };
}

/** Assemble the payload renderFlyer expects from DB rows. */
export function flyerPayload(ev, flyer = {}, speaker = null) {
  const merged = {
    ...ev,
    headline: flyer.headline || ev.title,
    subhead: flyer.subhead || "",
    description: flyer.body || ev.description || "",
    occasion: flyer.occasion || ev.occasion || "",
    lede: flyer.lede || ev.lede || "",
    schedule: flyer.schedule || ev.schedule || [],
  };
  if (templateFor(ev) !== "speaker") return { event: merged };
  const sp = speaker || {};
  return {
    event: merged,
    speaker: {
      ...sp,
      // The template shows up to three short credential lines. A researched
      // one-line bio becomes the first of them.
      credentials: Array.isArray(sp.credentials) && sp.credentials.length
        ? sp.credentials
        : [sp.short_bio].filter(Boolean),
    },
  };
}

export function renderFor(ev, flyer, speaker, opts) {
  return renderFlyer(templateFor(ev), flyerPayload(ev, flyer, speaker), opts);
}

/** Build the week's items for the weekly flyer from stored events. */
export function weekPayload(events, { from = isoDate(), shabbat = null } = {}) {
  const to = addDays(from, 7);
  const items = events
    .filter((e) => e.event_date >= from && e.event_date < to && e.status !== "cancelled")
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .map((e) => ({
      day: longDate(e.event_date).split(",")[0],
      title: e.title,
      start_time: e.start_time,
      location: e.location,
      event_date: e.event_date,
    }));
  return {
    week: {
      headline: "This Week at SoFa",
      subhead: `${longDate(from, { weekday: false })} – ${longDate(addDays(from, 6), { weekday: false })}`,
      candle_lighting: shabbat?.candleLighting || "",
      items,
    },
  };
}

export { isoDate, addDays, daysBetween, slugify, computeGaps, flyerStatus, missingSentence };
