import { NextRequest, NextResponse } from "next/server";
import { parseICS, type CalendarEvent } from "@/lib/ical";
import { computeStatus } from "@/lib/meeting-status";

// Recompute on every request — the whole point is live status.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Demo events used when MEETING_ICAL_URL isn't configured, so the traffic
 * light is visibly working out of the box. Builds a meeting starting ~4 min
 * from now (so you can watch green → yellow → red) plus one later today.
 */
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

export async function GET(req: NextRequest) {
  // Optional access token. When MEETING_STATUS_TOKEN is set, the endpoint
  // exposes meeting titles only to the device (which sends ?token= or a Bearer
  // header) and to same-origin browser requests (the /status test page).
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
  const warnMinutes = parseInt(process.env.MEETING_WARN_MINUTES || "5", 10);

  // Support watching several calendars at once. URLs may be listed in
  // MEETING_ICAL_URL (separated by commas, whitespace, or newlines) and/or in
  // the numbered vars MEETING_ICAL_URL_2 … _6. Events from all feeds are merged.
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
    const results = await Promise.all(
      urls.map(async (u) => {
        try {
          const res = await fetch(u, {
            // Don't let a stale CDN copy mask a freshly-added meeting.
            cache: "no-store",
            headers: { "User-Agent": "aventary-meeting-light/1.0" }
          });
          if (!res.ok) throw new Error(`feed responded ${res.status}`);
          return parseICS(await res.text());
        } catch (e) {
          console.error("meeting feed failed", u, e);
          return e instanceof Error ? e : new Error("failed to load calendar");
        }
      })
    );

    events = results.filter((r): r is CalendarEvent[] => Array.isArray(r)).flat();
    const failures = results.filter((r): r is Error => r instanceof Error);
    if (failures.length) error = `${failures.length} of ${urls.length} feeds failed`;

    // Every feed failed → fall back to demo so the light still does something.
    if (events.length === 0 && failures.length === urls.length) {
      events = demoEvents(now);
      source = "demo";
    } else {
      events.sort((a, b) => a.start.getTime() - b.start.getTime());
    }
  } else {
    events = demoEvents(now);
    source = "demo";
  }

  const warn = Number.isFinite(warnMinutes) ? warnMinutes : 5;
  const status = computeStatus(events, now, { warnMinutes: warn });

  // Flat convenience fields for the single-light device firmware, which can't
  // easily parse ISO timestamps: seconds until the next meeting starts and its
  // UID (so the device can remember which alert you already dismissed).
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
