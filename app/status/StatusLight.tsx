"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Event = {
  uid: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
};

type Status = {
  state: "green" | "yellow" | "red";
  minutesUntilStart: number | null;
  minutesUntilEnd: number | null;
  current: Event | null;
  next: Event | null;
  source: "calendar" | "demo";
  error: string | null;
  warnMinutes: number;
  now: string;
};

const COPY: Record<Status["state"], { label: string; sub: string }> = {
  green: { label: "Clear", sub: "No meeting imminent" },
  yellow: { label: "Starting soon", sub: "Wrap up — meeting about to begin" },
  red: { label: "In a meeting", sub: "You should be on the call" }
};

function fmtClock(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return "now";
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

export default function StatusLight() {
  const [status, setStatus] = useState<Status | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const lastBoundary = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as Status;
      setStatus(data);
      setFetchError(null);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "offline");
    }
  }, []);

  // Initial load + poll every 15s.
  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  // 1s tick for a smooth countdown.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // When a meeting boundary (start/end) passes between polls, refetch at once
  // so the light flips immediately instead of waiting up to 15s.
  useEffect(() => {
    if (!status) return;
    const now = Date.now();
    const boundary = status.state === "red" ? status.current?.end : status.next?.start;
    if (!boundary) return;
    const ms = new Date(boundary).getTime() - now;
    if (ms <= 0 && lastBoundary.current !== boundary) {
      lastBoundary.current = boundary;
      load();
    }
  }, [tick, status, load]);

  const state = status?.state ?? "green";
  const copy = COPY[state];

  // Local live countdown derived from the relevant event timestamp.
  let countdown: string | null = null;
  let countdownLabel = "";
  if (status) {
    const now = Date.now();
    if (status.state === "red" && status.current) {
      countdown = fmtCountdown(new Date(status.current.end).getTime() - now);
      countdownLabel = "ends in";
    } else if (status.next) {
      countdown = fmtCountdown(new Date(status.next.start).getTime() - now);
      countdownLabel = "starts in";
    }
  }

  const focusEvent = status?.state === "red" ? status.current : status?.next ?? null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-neutral-950 px-6 py-10 text-neutral-100 sm:flex-row sm:gap-16">
      <TrafficLight active={state} />

      <div className="max-w-md text-center sm:text-left">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          Meeting status
        </p>
        <h1
          className="mt-2 text-5xl font-bold sm:text-6xl"
          style={{ color: lampColor(state) }}
        >
          {copy.label}
        </h1>
        <p className="mt-2 text-lg text-neutral-400">{copy.sub}</p>

        {focusEvent && (
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-left">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              {status?.state === "red" ? "Now" : "Next up"}
            </p>
            <p className="mt-1 truncate text-2xl font-semibold">{focusEvent.summary}</p>
            <p className="mt-1 text-neutral-400">
              {fmtClock(new Date(focusEvent.start))} – {fmtClock(new Date(focusEvent.end))}
            </p>
            {countdown && (
              <p className="mt-3 text-lg">
                <span className="text-neutral-500">{countdownLabel} </span>
                <span className="font-semibold tabular-nums" style={{ color: lampColor(state) }}>
                  {countdown}
                </span>
              </p>
            )}
          </div>
        )}

        {!focusEvent && status && (
          <p className="mt-8 text-neutral-500">Nothing scheduled for the rest of today.</p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-neutral-600 sm:justify-start">
          {status?.source === "demo" && (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-400">
              Demo data — set MEETING_ICAL_URL to use your calendar
            </span>
          )}
          {status && (
            <span>turns yellow {status.warnMinutes} min before a meeting</span>
          )}
          {(fetchError || status?.error) && (
            <span className="text-red-400">⚠ {fetchError || status?.error}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function lampColor(state: Status["state"]) {
  return state === "red" ? "#ef4444" : state === "yellow" ? "#f59e0b" : "#22c55e";
}

function TrafficLight({ active }: { active: Status["state"] }) {
  const lamps: { key: Status["state"]; on: string; glow: string }[] = [
    { key: "red", on: "#ef4444", glow: "239,68,68" },
    { key: "yellow", on: "#f59e0b", glow: "245,158,11" },
    { key: "green", on: "#22c55e", glow: "34,197,94" }
  ];
  return (
    <div className="flex flex-col gap-5 rounded-[2.5rem] border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
      {lamps.map((lamp) => {
        const isOn = lamp.key === active;
        return (
          <div
            key={lamp.key}
            className="h-28 w-28 rounded-full transition-all duration-500 sm:h-32 sm:w-32"
            style={{
              backgroundColor: isOn ? lamp.on : "#1c1c1f",
              boxShadow: isOn
                ? `0 0 60px 12px rgba(${lamp.glow},0.7), inset 0 0 30px rgba(255,255,255,0.25)`
                : "inset 0 0 24px rgba(0,0,0,0.8)",
              opacity: isOn ? 1 : 0.28
            }}
          />
        );
      })}
    </div>
  );
}
