// Pure traffic-light logic: given the day's events and "now", decide whether
// you're clear (green), about to be in a meeting (yellow), or in one (red).

import type { CalendarEvent } from "@/lib/ical";

export type TrafficState = "green" | "yellow" | "red";

export type MeetingStatus = {
  state: TrafficState;
  /** Minutes until the relevant meeting starts (red: minutes remaining instead). */
  minutesUntilStart: number | null;
  /** Minutes until the in-progress meeting ends, when red. */
  minutesUntilEnd: number | null;
  current: SerializableEvent | null;
  next: SerializableEvent | null;
};

export type SerializableEvent = {
  uid: string;
  summary: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
};

export type StatusOptions = {
  /** Minutes before a meeting at which the light turns yellow. */
  warnMinutes?: number;
  /** Ignore all-day events (they shouldn't make the light red all day). */
  ignoreAllDay?: boolean;
};

function toSerializable(e: CalendarEvent): SerializableEvent {
  return {
    uid: e.uid,
    summary: e.summary,
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    allDay: e.allDay
  };
}

export function computeStatus(
  events: CalendarEvent[],
  now: Date = new Date(),
  options: StatusOptions = {}
): MeetingStatus {
  const warnMinutes = options.warnMinutes ?? 5;
  const ignoreAllDay = options.ignoreAllDay ?? true;
  const t = now.getTime();

  const timed = events
    .filter((e) => (ignoreAllDay ? !e.allDay : true))
    .slice()
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // RED: a meeting is happening right now.
  const current = timed.find((e) => e.start.getTime() <= t && e.end.getTime() > t);
  if (current) {
    const next = timed.find((e) => e.start.getTime() > t) ?? null;
    return {
      state: "red",
      minutesUntilStart: null,
      minutesUntilEnd: Math.max(0, Math.ceil((current.end.getTime() - t) / 60000)),
      current: toSerializable(current),
      next: next ? toSerializable(next) : null
    };
  }

  // Otherwise look at the next upcoming meeting.
  const next = timed.find((e) => e.start.getTime() > t) ?? null;
  if (next) {
    const minutesUntilStart = Math.ceil((next.start.getTime() - t) / 60000);
    if (minutesUntilStart <= warnMinutes) {
      return {
        state: "yellow",
        minutesUntilStart,
        minutesUntilEnd: null,
        current: null,
        next: toSerializable(next)
      };
    }
    return {
      state: "green",
      minutesUntilStart,
      minutesUntilEnd: null,
      current: null,
      next: toSerializable(next)
    };
  }

  // Nothing on the horizon.
  return {
    state: "green",
    minutesUntilStart: null,
    minutesUntilEnd: null,
    current: null,
    next: null
  };
}
