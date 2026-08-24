"use client";

// The main carpool screen: who is driving, where they are, how long until
// they reach your door, and the buttons that tell the other parents.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CarpoolMap, { type MapMarker } from "./CarpoolMap";
import { StopSheet, SettingsSheet } from "./Sheets";
import {
  endRun,
  sendPing,
  startRun,
  useLocationShare,
  type CarpoolState
} from "./store";
import {
  distanceM,
  etaSeconds,
  formatAge,
  formatDistance,
  formatEta,
  isLive,
  smoothSpeed
} from "@/lib/carpool/geo";
import type { CarpoolStop, RunDirection } from "@/lib/carpool/types";

/** Fire the "one minute out" ping at this ETA. */
const ONE_MINUTE_S = 75;
/** Close enough to count as standing outside the house. */
const ARRIVED_M = 45;

export default function Dashboard({
  state,
  onSignOut
}: {
  state: CarpoolState;
  onSignOut: () => void;
}) {
  const { group, me, members, stops, runs, locations, pings } = state;
  const [sheet, setSheet] = useState<"none" | "stop" | "settings">("none");
  const [direction, setDirection] = useState<RunDirection>("to_school");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Re-render once a second so ETAs and "12s ago" stay honest.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const myRun = useMemo(
    () => runs.find((r) => r.status === "active" && r.driver_id === me?.id) ?? null,
    [runs, me]
  );
  const share = useLocationShare(group?.id ?? null, me?.id ?? null, myRun?.id ?? null);

  const activeRuns = useMemo(() => runs.filter((r) => r.status === "active"), [runs]);
  const memberById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members]
  );

  // The drivers worth drawing: an active run with a fresh position.
  const drivers = useMemo(
    () =>
      activeRuns
        .map((run) => ({ run, member: memberById[run.driver_id], loc: locations[run.driver_id] }))
        .filter((d) => d.member && d.loc && isLive(d.loc.updated_at)),
    // `tick` keeps liveness re-evaluated as fixes go stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRuns, memberById, locations, tick]
  );

  const myStop = useMemo(() => stops.find((s) => s.member_id === me?.id) ?? null, [stops, me]);
  const placedStops = useMemo(
    () => stops.filter((s) => s.lat != null && s.lng != null),
    [stops]
  );

  // Smoothed speed for whichever driver we are quoting an ETA from.
  const speedRef = useRef<Record<string, number | null>>({});
  for (const d of drivers) {
    speedRef.current[d.run.driver_id] = smoothSpeed(
      speedRef.current[d.run.driver_id] ?? null,
      d.loc.speed_mps
    );
  }

  const etaFor = useCallback(
    (stop: CarpoolStop, driverId: string): number | null => {
      const loc = locations[driverId];
      if (!loc || stop.lat == null || stop.lng == null) return null;
      return etaSeconds(
        { lat: loc.lat, lng: loc.lng },
        { lat: stop.lat, lng: stop.lng },
        speedRef.current[driverId] ?? loc.speed_mps
      );
    },
    [locations]
  );

  // Which stops this run has already been pinged about (server is the record).
  const pingedThisRun = useMemo(() => {
    const map = new Set<string>();
    for (const p of pings) {
      if (p.run_id && p.stop_id) map.add(`${p.run_id}:${p.stop_id}:${p.kind}`);
    }
    return map;
  }, [pings]);

  const iAmDriving = Boolean(myRun) && share.sharing;

  // ---- the automatic "one minute away" ping ----
  // Runs on the driver's phone, because that is the device that knows where
  // the car actually is. The unique index on (run_id, stop_id, kind) means a
  // double-fire can never buzz a family twice.
  const attempted = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!iAmDriving || !myRun || !me || !group) return;
    const myLoc = locations[me.id];
    if (!myLoc) return;

    for (const stop of placedStops) {
      if (stop.member_id === me.id) continue; // no need to ping myself
      const eta = etaFor(stop, me.id);
      if (eta == null) continue;
      const metres = distanceM(
        { lat: myLoc.lat, lng: myLoc.lng },
        { lat: stop.lat as number, lng: stop.lng as number }
      );

      const kind = metres <= ARRIVED_M ? "arrived" : eta <= ONE_MINUTE_S ? "one_minute" : null;
      if (!kind) continue;

      const key = `${myRun.id}:${stop.id}:${kind}`;
      if (attempted.current.has(key) || pingedThisRun.has(key)) continue;
      attempted.current.add(key);
      void sendPing({
        groupId: group.id,
        stopId: stop.id,
        runId: myRun.id,
        kind,
        etaSeconds: eta
      }).catch(() => attempted.current.delete(key));
    }
  }, [iAmDriving, myRun, me, group, locations, placedStops, etaFor, pingedThisRun]);

  // ---- driver controls ----
  const beginDriving = useCallback(async () => {
    if (!group || !me) return;
    setBusy(true);
    setNotice(null);
    try {
      const run = await startRun(group.id, me.id, direction);
      share.start();
      await state.refresh();
      await sendPing({
        groupId: group.id,
        stopId: null,
        runId: run.id,
        kind: "heads_up",
        message: `${me.display_name} has started the ${
          direction === "to_school" ? "morning" : "afternoon"
        } route.`
      }).catch(() => undefined);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not start the run.");
    } finally {
      setBusy(false);
    }
  }, [group, me, direction, share, state]);

  const finishDriving = useCallback(async () => {
    if (!myRun) return;
    setBusy(true);
    try {
      share.stop();
      await endRun(myRun.id);
      attempted.current.clear();
      await state.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not end the run.");
    } finally {
      setBusy(false);
    }
  }, [myRun, share, state]);

  const pingStop = useCallback(
    async (stop: CarpoolStop, kind: "one_minute" | "heads_up" | "waiting") => {
      if (!group) return;
      try {
        await sendPing({
          groupId: group.id,
          stopId: stop.id,
          runId: myRun?.id ?? null,
          kind,
          etaSeconds: me ? etaFor(stop, me.id) : null
        });
        setNotice(`Told ${stop.label}.`);
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Could not send that.");
      }
    },
    [group, myRun, me, etaFor]
  );

  // ---- map markers ----
  const markers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    for (const d of drivers) {
      out.push({
        id: `driver-${d.run.driver_id}`,
        lat: d.loc.lat,
        lng: d.loc.lng,
        kind: "driver",
        label: d.member?.display_name ?? "Driver",
        heading: d.loc.heading
      });
    }
    for (const s of placedStops) {
      out.push({
        id: `stop-${s.id}`,
        lat: s.lat as number,
        lng: s.lng as number,
        kind: s.member_id === me?.id ? "me" : "stop",
        label: s.label,
        dimmed: s.member_id !== me?.id
      });
    }
    return out;
  }, [drivers, placedStops, me]);

  // ---- what a waiting parent sees ----
  const inboundDriver = drivers[0] ?? null;
  const myEta =
    myStop && inboundDriver ? etaFor(myStop, inboundDriver.run.driver_id) : null;

  // Stops in the order the driver will reach them.
  const routeStops = useMemo(() => {
    const driverId = iAmDriving && me ? me.id : inboundDriver?.run.driver_id;
    const withEta = placedStops
      .filter((s) => !(iAmDriving && s.member_id === me?.id))
      .map((s) => ({ stop: s, eta: driverId ? etaFor(s, driverId) : null }));
    return withEta.sort((a, b) => (a.eta ?? 1e9) - (b.eta ?? 1e9));
  }, [placedStops, iAmDriving, me, inboundDriver, etaFor]);

  const arrivedStopIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of pings) {
      if (p.kind === "arrived" && p.stop_id && p.run_id && p.run_id === (myRun?.id ?? inboundDriver?.run.id)) {
        ids.add(p.stop_id);
      }
    }
    return ids;
  }, [pings, myRun, inboundDriver]);

  // Follow the car, but keep the house it is heading to on screen: your own
  // when you're waiting, the next one on the route when you're driving.
  const followId = iAmDriving
    ? me
      ? `driver-${me.id}`
      : null
    : inboundDriver
      ? `driver-${inboundDriver.run.driver_id}`
      : null;

  const fitIds = useMemo(() => {
    if (!followId) return undefined;
    const nextStop = iAmDriving
      ? routeStops.find(({ stop }) => !arrivedStopIds.has(stop.id))?.stop
      : myStop;
    return nextStop ? [followId, `stop-${nextStop.id}`] : [followId];
  }, [followId, iAmDriving, routeStops, arrivedStopIds, myStop]);

  if (!group || !me) return null;

  return (
    <div className="cp-shell">
      <header className="cp-header">
        <div>
          <h1>{group.name}</h1>
          <p className="cp-sub">
            {group.school ? `${group.school} · ` : ""}code <strong>{group.join_code}</strong>
          </p>
        </div>
        <div className="cp-header-actions">
          <button type="button" onClick={() => setSheet("stop")}>
            My stop
          </button>
          <button type="button" onClick={() => setSheet("settings")} aria-label="Settings">
            ⚙
          </button>
        </div>
      </header>

      {notice && (
        <p className="cp-notice" role="status" onClick={() => setNotice(null)}>
          {notice}
        </p>
      )}
      {share.error && <p className="cp-notice cp-notice-warn">{share.error}</p>}

      {/* What a parent standing at the window wants to know, first and biggest. */}
      {!iAmDriving && (
        <section className="cp-status">
          {inboundDriver ? (
            <>
              <p className="cp-status-who">
                <strong>{inboundDriver.member?.display_name}</strong> is driving
                {inboundDriver.run.direction === "to_school" ? " to school" : " home"}
              </p>
              {myStop && myEta != null ? (
                <>
                  <p className={`cp-eta${myEta <= ONE_MINUTE_S ? " cp-eta-now" : ""}`}>
                    {myEta <= ONE_MINUTE_S ? "Get outside now" : formatEta(myEta)}
                  </p>
                  <p className="cp-sub">
                    {formatDistance(
                      distanceM(
                        { lat: inboundDriver.loc.lat, lng: inboundDriver.loc.lng },
                        { lat: myStop.lat as number, lng: myStop.lng as number }
                      )
                    )}{" "}
                    away · fix {formatAge(inboundDriver.loc.updated_at)}
                  </p>
                </>
              ) : (
                <p className="cp-sub">
                  {myStop
                    ? "Set your stop's location to get an ETA."
                    : "Add your stop to see when they'll reach you."}
                </p>
              )}
            </>
          ) : (
            <p className="cp-status-idle">Nobody is driving right now.</p>
          )}
        </section>
      )}

      <CarpoolMap
        markers={markers}
        focus={followId}
        fit={fitIds}
        height={300}
      />

      {/* Driver controls */}
      <section className="cp-drive">
        {!myRun ? (
          <>
            <div className="cp-seg" role="group" aria-label="Direction">
              <button
                type="button"
                className={direction === "to_school" ? "on" : ""}
                onClick={() => setDirection("to_school")}
              >
                To school
              </button>
              <button
                type="button"
                className={direction === "from_school" ? "on" : ""}
                onClick={() => setDirection("from_school")}
              >
                Home
              </button>
            </div>
            <button type="button" className="cp-primary" onClick={beginDriving} disabled={busy}>
              {busy ? "Starting…" : "I'm driving — share my location"}
            </button>
            <p className="cp-fineprint">
              Keep this screen on while you drive. Phones stop reporting location when the
              browser is in the background.
            </p>
          </>
        ) : (
          <>
            <p className="cp-driving-flag">
              {share.sharing ? "Sharing your location" : "Run open — location paused"}
            </p>
            {!share.sharing && (
              <button type="button" className="cp-primary" onClick={share.start}>
                Resume sharing
              </button>
            )}
            <button type="button" className="cp-secondary" onClick={finishDriving} disabled={busy}>
              {busy ? "Ending…" : "End run"}
            </button>
          </>
        )}
      </section>

      {/* The route: every family, nearest first */}
      <section className="cp-stops">
        <h2>Stops</h2>
        {routeStops.length === 0 && <p className="cp-sub">No stops with a location yet.</p>}
        <ul>
          {routeStops.map(({ stop, eta }) => {
            const done = arrivedStopIds.has(stop.id);
            return (
              <li key={stop.id} className={done ? "done" : ""}>
                <div className="cp-stop-main">
                  <span className="cp-stop-label">
                    {stop.label}
                    {stop.member_id === me.id ? " (you)" : ""}
                  </span>
                  {stop.riders && <span className="cp-sub">{stop.riders}</span>}
                  {stop.address && <span className="cp-sub cp-addr">{stop.address}</span>}
                </div>
                <div className="cp-stop-side">
                  <span className={`cp-stop-eta${eta != null && eta <= ONE_MINUTE_S ? " soon" : ""}`}>
                    {done ? "picked up" : eta != null ? formatEta(eta) : "—"}
                  </span>
                  {iAmDriving && stop.member_id !== me.id && (
                    <button type="button" onClick={() => void pingStop(stop, "one_minute")}>
                      Ping
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Recent activity */}
      <section className="cp-feed">
        <h2>Latest</h2>
        {pings.length === 0 ? (
          <p className="cp-sub">Nothing yet today.</p>
        ) : (
          <ul>
            {pings.slice(0, 8).map((p) => {
              const from = p.from_member ? memberById[p.from_member]?.display_name : null;
              const stop = stops.find((s) => s.id === p.stop_id);
              return (
                <li key={p.id}>
                  <span>
                    {p.message ||
                      `${from ?? "Someone"} → ${stop?.label ?? "everyone"}: ${p.kind.replace("_", " ")}`}
                  </span>
                  <span className="cp-sub">{formatAge(p.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {sheet === "stop" && (
        <StopSheet state={state} onClose={() => setSheet("none")} />
      )}
      {sheet === "settings" && (
        <SettingsSheet state={state} onClose={() => setSheet("none")} onSignOut={onSignOut} />
      )}
    </div>
  );
}
