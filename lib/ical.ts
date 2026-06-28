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

/** Parse a DTSTART/DTEND value into a Date plus an all-day flag. */
function parseDateValue(value: string, params: Record<string, string>): { date: Date; allDay: boolean } {
  // All-day: VALUE=DATE, e.g. 20260628
  if (params.VALUE === "DATE" || /^\d{8}$/.test(value)) {
    const y = +value.slice(0, 4);
    const mo = +value.slice(4, 6);
    const d = +value.slice(6, 8);
    return { date: new Date(Date.UTC(y, mo - 1, d)), allDay: true };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return { date: new Date(NaN), allDay: false };
  const [, ys, mos, ds, hs, mis, ss, z] = m;
  const y = +ys, mo = +mos, d = +ds, h = +hs, mi = +mis, s = +ss;
  if (z === "Z") {
    return { date: new Date(Date.UTC(y, mo - 1, d, h, mi, s)), allDay: false };
  }
  if (params.TZID) {
    return { date: wallClockToUtc(y, mo, d, h, mi, s, params.TZID), allDay: false };
  }
  // Floating time (no zone). Best effort: treat as UTC.
  return { date: new Date(Date.UTC(y, mo - 1, d, h, mi, s)), allDay: false };
}

type RawEvent = {
  uid: string;
  summary: string;
  start?: { date: Date; allDay: boolean };
  end?: { date: Date; allDay: boolean };
  tzid?: string;
  rrule?: string;
  exdates: number[];
  cancelled: boolean;
};

const DAY_INDEX: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function parseRRule(rule: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of rule.split(";")) {
    const eq = part.indexOf("=");
    if (eq !== -1) out[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }
  return out;
}

/** Advance a date by one recurrence step, in UTC arithmetic. */
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

/** Expand one event into concrete occurrences overlapping [windowStart, windowEnd]. */
function expand(ev: RawEvent, windowStart: Date, windowEnd: Date): CalendarEvent[] {
  if (ev.cancelled || !ev.start || !ev.end) return [];
  const duration = ev.end.date.getTime() - ev.start.date.getTime();
  const base: CalendarEvent = {
    uid: ev.uid,
    summary: ev.summary,
    start: ev.start.date,
    end: ev.end.date,
    allDay: ev.start.allDay
  };

  if (!ev.rrule) {
    if (base.end.getTime() > windowStart.getTime() && base.start.getTime() < windowEnd.getTime()) {
      return [base];
    }
    return [];
  }

  const r = parseRRule(ev.rrule);
  const freq = (r.FREQ || "DAILY").toUpperCase();
  const interval = Math.max(1, parseInt(r.INTERVAL || "1", 10));
  const count = r.COUNT ? parseInt(r.COUNT, 10) : undefined;
  const until = r.UNTIL ? parseDateValue(r.UNTIL, {}).date : undefined;
  const byDay = r.BYDAY ? r.BYDAY.split(",").map((d) => d.trim().slice(-2).toUpperCase()) : undefined;

  const out: CalendarEvent[] = [];
  let cursor = new Date(ev.start.date.getTime());
  let emitted = 0;
  // Hard iteration cap so a malformed rule can never loop forever.
  for (let i = 0; i < 1500; i++) {
    if (until && cursor.getTime() > until.getTime()) break;
    if (count !== undefined && emitted >= count) break;
    if (cursor.getTime() > windowEnd.getTime()) break;

    let occurrenceStarts: Date[] = [cursor];
    // For weekly rules with BYDAY, emit each matching weekday in the week.
    if (freq === "WEEKLY" && byDay) {
      occurrenceStarts = [];
      const weekStart = new Date(cursor.getTime());
      for (let dow = 0; dow < 7; dow++) {
        const cand = new Date(weekStart.getTime());
        cand.setUTCDate(cand.getUTCDate() + dow);
        const code = Object.keys(DAY_INDEX).find((k) => DAY_INDEX[k] === cand.getUTCDay());
        if (code && byDay.includes(code) && cand.getTime() >= ev.start.date.getTime()) {
          occurrenceStarts.push(cand);
        }
      }
    }

    for (const start of occurrenceStarts) {
      if (count !== undefined && emitted >= count) break;
      if (until && start.getTime() > until.getTime()) continue;
      emitted++;
      if (ev.exdates.includes(start.getTime())) continue;
      const end = new Date(start.getTime() + duration);
      if (end.getTime() > windowStart.getTime() && start.getTime() < windowEnd.getTime()) {
        out.push({ uid: ev.uid, summary: ev.summary, start, end, allDay: ev.start.allDay });
      }
    }

    cursor = step(cursor, freq, interval);
  }
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
      r.end = { date: new Date(r.start.date.getTime() + ms), allDay: r.start.allDay };
    }
  }

  const events = raws.flatMap((r) => expand(r, windowStart, windowEnd));
  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return events;
}
