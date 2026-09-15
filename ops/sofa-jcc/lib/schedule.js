// Davening times for a SoFa JCC flyer.
//
// The flyer used to print Hebcal's encyclopedia blurb — "Rosh Hashana. The
// Jewish New Year." Nobody needs a flyer to learn what Rosh Hashanah is. What
// people need off a flyer is when to come, so this computes the one schedule
// the shul actually publishes: candle lighting, the end of Shabbos or Yom Tov,
// and the Mincha/Maariv that hangs off them.
//
// The rules are Mendy's, confirmed 2026-09-15:
//
//   Evening (Friday night, or any night candles are lit)
//     Mincha & Maariv = candle lighting + 15 minutes
//   Shabbos afternoon
//     Mincha & Maariv = 45 minutes before Shabbos ends
//   Last day of Yom Tov
//     Mincha & Maariv = 40 minutes before Yom Tov ends
//
// 45 against pm45 is deliberate, not a slip — Shabbos and Yom Tov differ here.
// Everything rounds FORWARD to the next five-minute mark, so a printed time is
// never earlier than the rule allows.

export const MINCHA_AFTER_CANDLES = 15;
export const MINCHA_BEFORE_SHABBOS_END = 45;
export const MINCHA_BEFORE_YOMTOV_END = 40;

/** "6:47 PM" / "6:47pm" / "18:47" → minutes past midnight. Null if unreadable. */
export function toMinutes(time) {
  const s = String(time || "").trim();
  const m = /^(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?$/i.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const suffix = (m[3] || "").toLowerCase();
  if (suffix.startsWith("p") && h !== 12) h += 12;
  if (suffix.startsWith("a") && h === 12) h = 0;
  return h * 60 + min;
}

/** Minutes past midnight → "6:45 PM". */
export function toClock(mins) {
  if (mins == null || !Number.isFinite(mins)) return "";
  const wrapped = ((mins % 1440) + 1440) % 1440;
  const h24 = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

/**
 * Forward to the next five-minute mark. 6:52 → 6:55; 6:50 stays 6:50.
 *
 * Always forward, never nearest. Rounding back would call Mincha before the
 * rule's own interval has elapsed — fifteen minutes after candle lighting that
 * is actually thirteen.
 */
export const roundUpTo5 = (mins) => (mins == null ? null : Math.ceil(mins / 5) * 5);

const dayOfWeek = (iso) => {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getDay(); // 0 Sun … 6 Sat
};

/**
 * The line above the time. What a reader needs to know is which deadline this
 * is, and they are not the same words:
 *
 *   Friday night            candles start Shabbos      "Candle lighting"
 *   Saturday night          candles start a Yom Tov    "Light candles after Shabbos ends"
 *                           that begins as Shabbos
 *                           ends, so they are lit
 *                           from an existing flame
 *   Any other night         candles start a Yom Tov    "Candle lighting"
 *   Saturday                Shabbos ends               "Shabbos ends"
 *   Any other day           Yom Tov ends               "Yom Tov ends"
 */
export function boundaryLabel(kind, iso) {
  const dow = dayOfWeek(iso);
  if (kind === "candles") return dow === 6 ? "Light candles after Shabbos ends" : "Candle lighting";
  return dow === 6 ? "Shabbos ends" : "Yom Tov ends";
}

/**
 * Mincha & Maariv for one boundary.
 *
 * `kind` is "candles" (an evening beginning) or "havdalah" (a day ending).
 * A day ending on Saturday is Shabbos and takes 45; anything else is Yom Tov
 * and takes 40 — including a Yom Tov that happens to end on a Saturday night,
 * which is Shabbos as far as the shul is concerned.
 */
export function serviceTime(kind, iso, time) {
  const at = toMinutes(time);
  if (at == null) return null;
  if (kind === "candles") return roundUpTo5(at + MINCHA_AFTER_CANDLES);
  const before = dayOfWeek(iso) === 6 ? MINCHA_BEFORE_SHABBOS_END : MINCHA_BEFORE_YOMTOV_END;
  return roundUpTo5(at - before);
}

/**
 * Turn Hebcal's candle/havdalah stream into the flyer's schedule.
 *
 * Input is one entry per boundary — `{ kind, date, time }` where kind is
 * "candles" or "havdalah" — which is exactly the shape fetchCalendar already
 * produces. Out comes one line per boundary, in order, each carrying the
 * boundary itself and the service that hangs off it.
 */
export function scheduleLines(boundaries = []) {
  return boundaries
    .filter((b) => b && (b.kind === "candles" || b.kind === "havdalah") && toMinutes(b.time) != null)
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1))
    .map((b) => {
      const service = serviceTime(b.kind, b.date, b.time);
      return {
        date: b.date,
        kind: b.kind,
        boundaryLabel: boundaryLabel(b.kind, b.date),
        boundaryTime: toClock(toMinutes(b.time)),
        serviceLabel: "Mincha & Maariv",
        serviceTime: toClock(service),
      };
    });
}

/**
 * Holidays the shul does not hold services for, so no flyer is drafted.
 *
 * Yom Kippur is here because Mendy confirmed on 2026-09-15 that there are no
 * services — not because a fast day is structurally different. A flyer
 * advertising Mincha and Maariv at a shul that is closed is worse than none.
 */
export const NO_SERVICES = new Set(["Yom Kippur"]);

export const holdsServices = (baseTitle) => !NO_SERVICES.has(String(baseTitle || "").trim());

/**
 * The schedule as the block of text that goes on the flyer, one boundary per
 * pair of lines. This is what replaces the Hebcal blurb in `sofa_flyers.body`,
 * so the times survive in the row rather than only existing at render time.
 */
export function scheduleText(lines = []) {
  return lines
    .map((l) => `${l.boundaryLabel} ${l.boundaryTime}\n${l.serviceLabel} ${l.serviceTime}`)
    .join("\n\n");
}
