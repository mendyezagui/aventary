// Dependency-free iCalendar (.ics) parser.
//
// Scope: enough to drive the meeting traffic-light. It understands timed events
// (UTC `Z`, floating, and `TZID=` wall-clock times), all-day events, and the
// common recurrence rules (DAILY/WEEKLY/MONTHLY/YEARLY with INTERVAL, COUNT,
// UNTIL, BYDAY) plus EXDATE. Recurring events are expanded only inside the
// window you ask for, so the work stays cheap.
//
// Timezone conversion uses the platform `Intl` time-zone database (full ICU is
// available on both Node 18+ and the Cloudflare Workers runtime), so named
// zones like `America/New_York` resolve correctly across DST.

export type CalendarEvent = {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
};

/** Unfold RFC 5545 folded lines: a leading space/tab continues the prior line. */
function unfold(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Split "NAME;PARAM=x;PARAM2=y:value" into name, params map, and value. */
function parseLine(line: string): { name: string; params: Record<string, string>; value: string } {
  const colon = line.indexOf(":");
  if (colon === -1) return { name: line, params: {}, value: "" };
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = head.split(";");
  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq !== -1) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }
  return { name, params, value };
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Find the UTC instant whose wall-clock representation in `tz` equals the given
 * components. Iterates to settle DST/offset (two passes is always enough).
 */
function wallClockToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  tz: string
): Date {
  // First guess: treat the wall clock as if it were UTC.
  let utc = Date.UTC(y, mo - 1, d, h, mi, s);
  for (let i = 0; i < 2; i++) {
    const asSeen = partsInZone(new Date(utc), tz);
    const seenAsUtc = Date.UTC(
      asSeen.year,
      asSeen.month - 1,
      asSeen.day,
      asSeen.hour,
      asSeen.minute,
      asSeen.second
    );
    const wantedAsUtc = Date.UTC(y, mo - 1, d, h, mi, s);
    const diff = wantedAsUtc - seenAsUtc;
    if (diff === 0) break;
    utc += diff;
  }
  return new Date(utc);
}

function partsInZone(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const out: Record<string, number> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = parseInt(part.value, 10);
  }
  // "24:00" can appear at midnight in some engines; normalise to 0.
  if (out.hour === 24) out.hour = 0;
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour,
    minute: out.minute,
    second: out.second
  };
}

// A parsed date/time keeps both the absolute UTC instant AND the original
// wall-clock components + zone. Recurrence has to reason about the LOCAL
// calendar day (e.g. "every Tuesday"), which the UTC instant alone can't give
// you: 5:30pm in a UTC−7 zone is already the next UTC day, so a UTC weekday is
// off by one for evening events. `tzid` is "UTC" for `Z` times, the named zone
// for `TZID=` times, and undefined for floating times (treated as UTC).
type DateValue = {
  date: Date;
  allDay: boolean;
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
  tzid?: string;
};

/** Turn local wall-clock components into a UTC instant, honouring the zone. */
function toUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tzid?: string): Date {
  if (tzid && tzid !== "UTC") return wallClockToUtc(y, mo, d, h, mi, s, tzid);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
}

/** Parse a DTSTART/DTEND value, preserving wall-clock components and zone. */
function parseDateValue(value: string, params: Record<string, string>): DateValue {
  // All-day: VALUE=DATE, e.g. 20260628
  if (params.VALUE === "DATE" || /^\d{8}$/.test(value)) {
    const y = +value.slice(0, 4);
    const mo = +value.slice(4, 6);
    const d = +value.slice(6, 8);
    return { date: new Date(Date.UTC(y, mo - 1, d)), allDay: true, y, mo, d, h: 0, mi: 0, s: 0 };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return { date: new Date(NaN), allDay: false, y: 0, mo: 0, d: 0, h: 0, mi: 0, s: 0 };
  const [, ys, mos, ds, hs, mis, ss, z] = m;
  const y = +ys, mo = +mos, d = +ds, h = +hs, mi = +mis, s = +ss;
  const tzid = z === "Z" ? "UTC" : params.TZID || undefined;
  return { date: toUtc(y, mo, d, h, mi, s, tzid), allDay: false, y, mo, d, h, mi, s, tzid };
}

type RawEvent = {
  uid: string;
  summary: string;
  start?: DateValue;
  end?: DateValue;
  tzid?: string;
  rrule?: string;
  exdates: number[];
  cancelled: boolean;
};

const DAY_INDEX: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const DAY_CODE = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function parseRRule(rule: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of rule.split(";")) {
    const eq = part.indexOf("=");
    if (eq !== -1) out[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }
  return out;
}

/**
 * Advance a LOCAL calendar-date cursor (a UTC-midnight Date used purely for
 * date arithmetic) by one recurrence step.
 */
function step(date: Date, freq: string, interval: number): Date {
  const d = new Date(date.getTime());
  switch (freq) {
    case "DAILY":
      d.setUTCDate(d.getUTCDate() + interval);
      break;
    case "WEEKLY":
      d.setUTCDate(d.getUTCDate() + 7 * interval);
      break;
    case "MONTHLY":
      d.setUTCMonth(d.getUTCMonth() + interval);
      break;
    case "YEARLY":
      d.setUTCFullYear(d.getUTCFullYear() + interval);
      break;
    default:
      d.setUTCDate(d.getUTCDate() + interval);
  }
  return d;
}

/**
 * Expand one event into concrete occurrences overlapping [windowStart,
 * windowEnd]. All recurrence math happens on the event's LOCAL calendar date
 * (so "every Tuesday" means Tuesday in the event's own timezone), then each
 * occurrence's wall-clock time is converted back to a UTC instant.
 */
function expand(ev: RawEvent, windowStart: Date, windowEnd: Date): CalendarEvent[] {
  if (ev.cancelled || !ev.start || !ev.end) return [];
  const dv = ev.start;
  const duration = ev.end.date.getTime() - ev.start.date.getTime();

  // Build a concrete occurrence from a local calendar date, keeping the
  // event's wall-clock time-of-day and zone.
  const makeAt = (y: number, mo: number, d: number): CalendarEvent => {
    const start = toUtc(y, mo, d, dv.h, dv.mi, dv.s, dv.tzid);
    return { uid: ev.uid, summary: ev.summary, start, end: new Date(start.getTime() + duration), allDay: dv.allDay };
  };
  const inWindow = (e: CalendarEvent) =>
    e.end.getTime() > windowStart.getTime() && e.start.getTime() < windowEnd.getTime();

  if (!ev.rrule) {
    const e = makeAt(dv.y, dv.mo, dv.d);
    return inWindow(e) ? [e] : [];
  }

  const r = parseRRule(ev.rrule);
  const freq = (r.FREQ || "DAILY").toUpperCase();
  const interval = Math.max(1, parseInt(r.INTERVAL || "1", 10));
  const count = r.COUNT ? parseInt(r.COUNT, 10) : undefined;
  const until = r.UNTIL ? parseDateValue(r.UNTIL, {}).date : undefined;
  const byDay = r.BYDAY ? r.BYDAY.split(",").map((d) => d.trim().slice(-2).toUpperCase()) : undefined;

  const startMs = ev.start.date.getTime();
  const out: CalendarEvent[] = [];
  let emitted = 0;
  // Cursor is a UTC-midnight Date representing the local calendar date.
  let cursor = new Date(Date.UTC(dv.y, dv.mo - 1, dv.d));

  for (let i = 0; i < 1500; i++) {
    // Candidate local dates produced by this step.
    let dates: Date[] = [cursor];
    if (freq === "WEEKLY" && byDay) {
      dates = [];
      for (let dow = 0; dow < 7; dow++) {
        const cand = new Date(cursor.getTime());
        cand.setUTCDate(cand.getUTCDate() + dow);
        if (byDay.includes(DAY_CODE[cand.getUTCDay()])) dates.push(cand);
      }
    }

    let stop = false;
    for (const cand of dates) {
      const e = makeAt(cand.getUTCFullYear(), cand.getUTCMonth() + 1, cand.getUTCDate());
      if (e.start.getTime() < startMs) continue; // before DTSTART
      if (until && e.start.getTime() > until.getTime()) { stop = true; break; }
      if (count !== undefined && emitted >= count) { stop = true; break; }
      emitted++;
      if (ev.exdates.includes(e.start.getTime())) continue;
      if (inWindow(e)) out.push(e);
    }
    if (stop) break;

    const stepStart = toUtc(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate(), dv.h, dv.mi, dv.s, dv.tzid);
    if (stepStart.getTime() > windowEnd.getTime()) break; // nothing further can land in-window
    cursor = step(cursor, freq, interval);
  }

  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

/**
 * Parse an .ics document and return concrete events overlapping the window.
 * Defaults to a window of [now − 1h, now + 24h], which is all the traffic-light
 * ever needs.
 */
export function parseICS(
  text: string,
  windowStart: Date = new Date(Date.now() - 60 * 60 * 1000),
  windowEnd: Date = new Date(Date.now() + 24 * 60 * 60 * 1000)
): CalendarEvent[] {
  const lines = unfold(text);
  const raws: RawEvent[] = [];
  let cur: RawEvent | null = null;

  for (const line of lines) {
    const { name, params, value } = parseLine(line);
    if (name === "BEGIN" && value === "VEVENT") {
      cur = { uid: "", summary: "(busy)", exdates: [], cancelled: false };
      continue;
    }
    if (name === "END" && value === "VEVENT") {
      if (cur) raws.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;

    switch (name) {
      case "UID":
        cur.uid = value;
        break;
      case "SUMMARY":
        cur.summary = unescapeText(value) || "(busy)";
        break;
      case "DTSTART":
        cur.start = parseDateValue(value, params);
        break;
      case "DTEND":
        cur.end = parseDateValue(value, params);
        break;
      case "RRULE":
        cur.rrule = value;
        break;
      case "EXDATE":
        for (const part of value.split(",")) {
          cur.exdates.push(parseDateValue(part, params).date.getTime());
        }
        break;
      case "STATUS":
        if (value.toUpperCase() === "CANCELLED") cur.cancelled = true;
        break;
    }
  }

  // An event with DTSTART but no DTEND is treated as zero-length; give all-day a day.
  for (const r of raws) {
    if (r.start && !r.end) {
      const ms = r.start.allDay ? 24 * 60 * 60 * 1000 : 0;
      r.end = { ...r.start, date: new Date(r.start.date.getTime() + ms) };
    }
  }

  const events = raws.flatMap((r) => expand(r, windowStart, windowEnd));
  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return events;
}
