import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { parseICS, type CalendarEvent } from "@/lib/ical";
import { computeStatus } from "@/lib/meeting-status";

// The live countdown is still computed per request, but the expensive part --
// fetching and parsing the ICAL feed(s) over the network -- is cached for 600
// via unstable_cache, so a device polling every ~1.4s no longer re-downloads
// the calendar tens of thousands of times a day.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type FeedResult = { events: CalendarEvent[]; failures: number; urlCount: number };

function demoEvents(now: Date): CalendarEvent[] {
  const soon = new Date(now.getTime() + 4 * 60 * 1000);
  const soonEnd = new Date(soon.getTime() + 30 * 60 * 1000);
  const later = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const laterEnd = new Date(later.getTime() + 60 * 60 * 1000);
  return [
    { uid: "demo-1", summary: "Demo standup", start: soon, end: soonEnd, allDay: false },
    { uid: "demo-2", summary: "Demo client call", start: later, end: laterEnd, allDay: false }
    ];
}

const loadFeeds = unstable_cache(
  async (urls: string[]): Promise<FeedResult> => {
    const results = await Promise.all(
      urls.map(async (u) => {
        try {
          const res = await fetch(u, {
            cache: "no-store",
            headers: { "User-Agent": "aventary-meeting-light/1.0" }
          });
          if (!res.ok) throw new Error("feed responded " + res.status);
          return parseICS(await res.text());
        } catch (e) {
          console.error("meeting feed failed", u, e);
          return e instanceof Error ? e : new Error("failed to load calendar");
        }
      })
      );
    const events = results.filter((r): r is CalendarEvent[] => Array.isArray(r)).flat();
    const failures = results.filter((r): r is Error => r instanceof Error).length;
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return { events, failures, urlCount: urls.length };
  },
  ["meeting-ical-feeds"],
  { revalidate: 600 }  );

export async function GET(req: NextRequest) {
  const token = process.env.MEETING_STATUS_TOKEN;
  if (token) {
    const provided =
      req.nextUrl.searchParams.get("token") ??
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      null;
    const sameOrigin = req.headers.get("sec-fetch-site") === "same-origin";
    if (provided !== token && !sameOrigin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

const now = new Date();
  const warnRaw = parseInt(process.env.MEETING_WARN_MINUTES || "5", 10);
  const warn = Number.isFinite(warnRaw) ? warnRaw : 5;

const urls = [
  process.env.MEETING_ICAL_URL,
  process.env.MEETING_ICAL_URL_2,
  process.env.MEETING_ICAL_URL_3,
  process.env.MEETING_ICAL_URL_4,
  process.env.MEETING_ICAL_URL_5,
  process.env.MEETING_ICAL_URL_6
  ]
  .filter((v): v is string => !!v)
  .flatMap((v) => v.split(/[\s,]+/))
  .map((v) => v.trim())
  .filter(Boolean);

let events: CalendarEvent[];
  let source: "calendar" | "demo" = "calendar";
  let error: string | null = null;

if (urls.length) {
  const feed = await loadFeeds(urls);
  events = feed.events.map((e) => ({
    ...e,
    start: new Date(e.start),
    end: new Date(e.end)
  }));
  if (feed.failures) error = feed.failures + " of " + feed.urlCount + " feeds failed";
  if (events.length === 0 && feed.failures === feed.urlCount) {
    events = demoEvents(now);
    source = "demo";
  }
} else {
  events = demoEvents(now);
  source = "demo";
}

const status = computeStatus(events, now, { warnMinutes: warn });

const nextStartsInSeconds = status.next
  ? Math.round((new Date(status.next.start).getTime() - now.getTime()) / 1000)
  : null;
  const nextUid = status.next?.uid ?? null;

return NextResponse.json(
  {
    ...status,
    nextStartsInSeconds,
    nextUid,
    source,
    error,
    warnMinutes: warn,
    now: now.toISOString()
  },
  { headers: { "Cache-Control": "no-store" } }
  );
}
