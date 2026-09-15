// "What's missing?" — computed, not guessed.
//
// This is deliberately deterministic. The associate may use Claude to WRITE
// copy, but it must never use Claude to DECIDE whether a flyer is printable:
// a model that hallucinates a start time produces a flyer that sends the
// community to a locked door. Every gap below is a field that is empty.
//
// severity:
//   "blocking" — do not print. The flyer is wrong without it.
//   "ask"      — Mendy should answer, but the flyer stands if he doesn't.
//   "nice"     — improves the flyer; silently omitted when absent.

const has = (v) => typeof v === "string" ? v.trim().length > 0 : v != null && v !== "";

// field, label, severity, and the exact question the push notification asks.
const COMMON = [
  { field: "start_time", label: "Start time",  severity: "blocking", question: "What time does it start?" },
  { field: "location",   label: "Location",    severity: "blocking", question: "Where is it — venue name?" },
  { field: "address",    label: "Address",     severity: "ask",      question: "What's the street address for the flyer footer?" },
  { field: "description",label: "Description", severity: "ask",      question: "One line on what this is — I'll write the rest." },
  { field: "rsvp_url",   label: "RSVP link",   severity: "nice",     question: "Is there an RSVP link or phone number?" },
  { field: "audience",   label: "Audience",    severity: "nice",     question: "Who's it for — men, women, families, all?" },
];

const BY_TEMPLATE = {
  holiday: [
    { field: "occasion", label: "Occasion line", severity: "nice", question: "Eyebrow line — e.g. \"Friday Night\" or \"Yom Tov\"?" },
  ],
  weekly: [
    { field: "end_time", label: "End time", severity: "nice", question: "When does it wrap up?" },
  ],
  speaker: [
    { field: "speaker.name",      label: "Speaker name",  severity: "blocking", question: "Who is the speaker?" },
    { field: "speaker.headshot_url", label: "Headshot",   severity: "ask",      question: "Send a headshot — the plate is a dashed placeholder without one." },
    { field: "speaker.short_bio", label: "Speaker bio",   severity: "ask",      question: "I couldn't verify a bio — give me one line, or confirm mine." },
    { field: "speaker.title",     label: "Role",          severity: "ask",      question: "What's their role — Executive Director, Rav, author?" },
    { field: "speaker.org",       label: "Organisation",  severity: "ask",      question: "Which institution should I name under them?" },
    { field: "speaker.name_he",   label: "Hebrew name",   severity: "nice",     question: "Hebrew name to set under the English?" },
    { field: "speaker.honorific", label: "Honorific",     severity: "nice",     question: "Rabbi, Rav, Dr., or none?" },
    { field: "speaker.topic",     label: "Talk topic",    severity: "nice",     question: "What's the talk called?" },
  ],
};

/**
 * Candle lighting is the one field that is dangerous when auto-filled.
 *
 * Every other gap fires because a field is EMPTY. This one fires because a
 * field is FILLED BY A MACHINE and nobody has checked it. The shul's published
 * zmanim follow their own luach and do not match Hebcal's sunset model — the
 * two disagreed by five minutes on Rosh Hashana 5787 — and a candle time that
 * is five minutes late is worse than a blank line, because people act on it.
 *
 * So: a suggested time is offered, and it stays an open question until
 * `candle_confirmed` is set. Confirming is one click; getting it wrong is a
 * community lighting candles after the deadline.
 */
const candleGap = (event) => {
  if (!event) return null;
  if (event.candle_confirmed) return null;
  if (!has(event.candle_lighting)) return null;   // nothing suggested, nothing to check
  return {
    field: "candle_confirmed",
    label: "Candle lighting",
    severity: "ask",
    question: `Confirm candle lighting is ${event.candle_lighting} — this is Hebcal's time for ZIP 90035, and your luach may differ.`,
    suggested: event.candle_lighting,
  };
};

/** Read "speaker.short_bio" out of { event, speaker }. */
const read = (event, speaker, field) => {
  if (field.startsWith("speaker.")) return speaker ? speaker[field.slice(8)] : "";
  return event ? event[field] : "";
};

/**
 * The gap list for one event + its flyer.
 *
 * `answers` is what Mendy already replied on a previous round — an answered
 * field is never asked again, even if the column is still blank, so the
 * associate does not nag about something he has explicitly waved off.
 */
export function computeGaps(event, { speaker = null, template = "holiday", answers = {} } = {}) {
  const specs = [...COMMON, ...(BY_TEMPLATE[template] || [])];
  const gaps = specs
    .filter((s) => !has(read(event, speaker, s.field)) && !has(answers[s.field]))
    .map((s) => ({ ...s }));
  // Holidays and the weekly sheet print a candle time; a speaker evening may too.
  const candle = template === "speaker" ? null : candleGap(event);
  if (candle && !has(answers[candle.field])) gaps.push(candle);
  return gaps;
}

export const blocking = (gaps) => gaps.filter((g) => g.severity === "blocking");
export const askable  = (gaps) => gaps.filter((g) => g.severity !== "nice");

/** draft → needs_input → ready. Purely a function of the gaps. */
export function flyerStatus(gaps) {
  if (blocking(gaps).length > 0) return "needs_input";
  if (askable(gaps).length > 0) return "draft";
  return "ready";
}

/**
 * The notification body: "Your SoFa JCC agent is missing X, Y and Z."
 * Capped at three items — a push notification that lists eight fields is a
 * wall of text nobody reads on a lock screen. The rest live in the console.
 */
export function missingSentence(gaps, { max = 3 } = {}) {
  const items = askable(gaps).map((g) => g.label.toLowerCase());
  if (items.length === 0) return "";
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  const list = shown.length === 1 ? shown[0]
    : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  return rest > 0 ? `${list}, +${rest} more` : list;
}
