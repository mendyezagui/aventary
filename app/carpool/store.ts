"use client";

// Data layer for the carpool app: session, group state, Realtime wiring,
// location broadcasting and push registration. Everything the screens need
// comes from here so the components stay presentational.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import type {
  CarpoolGroup,
  CarpoolLocation,
  CarpoolMember,
  CarpoolPing,
  CarpoolRun,
  CarpoolStop,
  PingKind,
  RunDirection
} from "@/lib/carpool/types";
import { distanceM } from "@/lib/carpool/geo";

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!client) client = createSupabaseBrowser();
  return client;
}

export const LAST_GROUP_KEY = "carpool.lastGroup";

// ---------- session ----------

export type SessionState = { userId: string | null; email: string | null; ready: boolean };

// types/shims.d.ts types the auth client loosely (it has to, for sandboxed
// installs), so spell out the shapes we actually read.
type SessionLike = { user: { id: string; email?: string | null } } | null;

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ userId: null, email: null, ready: false });

  useEffect(() => {
    const sb = supabase();
    let alive = true;

    sb.auth.getSession().then(({ data }: { data: { session: SessionLike } }) => {
      if (!alive) return;
      setState({
        userId: data.session?.user.id ?? null,
        email: data.session?.user.email ?? null,
        ready: true
      });
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event: string, session: SessionLike) => {
      setState({ userId: session?.user.id ?? null, email: session?.user.email ?? null, ready: true });
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

// ---------- group state ----------

export type CarpoolState = {
  loading: boolean;
  error: string | null;
  groups: CarpoolGroup[];
  group: CarpoolGroup | null;
  me: CarpoolMember | null;
  members: CarpoolMember[];
  stops: CarpoolStop[];
  runs: CarpoolRun[];
  locations: Record<string, CarpoolLocation>;
  pings: CarpoolPing[];
  selectGroup: (id: string) => void;
  refresh: () => Promise<void>;
};

export function useCarpool(userId: string | null): CarpoolState {
  const [groups, setGroups] = useState<CarpoolGroup[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<CarpoolMember[]>([]);
  const [stops, setStops] = useState<CarpoolStop[]>([]);
  const [runs, setRuns] = useState<CarpoolRun[]>([]);
  const [locations, setLocations] = useState<Record<string, CarpoolLocation>>({});
  const [pings, setPings] = useState<CarpoolPing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Which groups am I in?
  const loadGroups = useCallback(async () => {
    if (!userId) {
      setGroups([]);
      setGroupId(null);
      setLoading(false);
      return;
    }
    const sb = supabase();
    const { data: mine, error: memberErr } = await sb
      .from("carpool_members")
      .select("group_id")
      .eq("user_id", userId);
    if (memberErr) {
      setError(memberErr.message);
      setLoading(false);
      return;
    }
    const ids = (mine ?? []).map((m) => m.group_id as string);
    if (ids.length === 0) {
      setGroups([]);
      setGroupId(null);
      setLoading(false);
      return;
    }
    const { data: gs, error: groupErr } = await sb
      .from("carpool_groups")
      .select("*")
      .in("id", ids)
      .order("created_at");
    if (groupErr) {
      setError(groupErr.message);
      setLoading(false);
      return;
    }
    const list = (gs ?? []) as CarpoolGroup[];
    setGroups(list);
    setGroupId((current) => {
      if (current && list.some((g) => g.id === current)) return current;
      const remembered = typeof localStorage !== "undefined" ? localStorage.getItem(LAST_GROUP_KEY) : null;
      if (remembered && list.some((g) => g.id === remembered)) return remembered;
      return list[0]?.id ?? null;
    });
  }, [userId]);

  // Everything inside the selected group.
  const loadGroup = useCallback(async (id: string) => {
    const sb = supabase();
    const [memberRes, stopRes, runRes, locRes, pingRes] = await Promise.all([
      sb.from("carpool_members").select("*").eq("group_id", id).order("created_at"),
      sb.from("carpool_stops").select("*").eq("group_id", id).eq("active", true).order("position"),
      sb.from("carpool_runs").select("*").eq("group_id", id).order("started_at", { ascending: false }).limit(10),
      sb.from("carpool_locations").select("*").eq("group_id", id),
      sb.from("carpool_pings").select("*").eq("group_id", id).order("created_at", { ascending: false }).limit(30)
    ]);

    const firstError =
      memberRes.error || stopRes.error || runRes.error || locRes.error || pingRes.error;
    if (firstError) setError(firstError.message);

    setMembers((memberRes.data ?? []) as CarpoolMember[]);
    setStops((stopRes.data ?? []) as CarpoolStop[]);
    setRuns((runRes.data ?? []) as CarpoolRun[]);
    setPings((pingRes.data ?? []) as CarpoolPing[]);
    setLocations(
      Object.fromEntries(((locRes.data ?? []) as CarpoolLocation[]).map((l) => [l.member_id, l]))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!groupId) return;
    try {
      localStorage.setItem(LAST_GROUP_KEY, groupId);
    } catch {
      /* private mode — the default group is fine */
    }
    setLoading(true);
    void loadGroup(groupId);
  }, [groupId, loadGroup]);

  // Realtime: positions, pings and runs stream in; the rest is refetched.
  useEffect(() => {
    if (!groupId) return;
    const sb = supabase();
    const filter = `group_id=eq.${groupId}`;
    const channel = sb
      .channel(`carpool:${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carpool_locations", filter },
        (payload) => {
          setLocations((prev) => {
            const next = { ...prev };
            if (payload.eventType === "DELETE") {
              const old = payload.old as Partial<CarpoolLocation>;
              if (old.member_id) delete next[old.member_id];
              return next;
            }
            const row = payload.new as CarpoolLocation;
            next[row.member_id] = row;
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "carpool_pings", filter },
        (payload) => {
          const row = payload.new as CarpoolPing;
          setPings((prev) => (prev.some((p) => p.id === row.id) ? prev : [row, ...prev].slice(0, 30)));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carpool_runs", filter },
        (payload) => {
          const row = payload.new as CarpoolRun;
          if (!row?.id) return;
          setRuns((prev) => {
            const rest = prev.filter((r) => r.id !== row.id);
            return [row, ...rest].slice(0, 10);
          });
        }
      )
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [groupId]);

  const group = useMemo(() => groups.find((g) => g.id === groupId) ?? null, [groups, groupId]);
  const me = useMemo(
    () => members.find((m) => m.user_id === userId) ?? null,
    [members, userId]
  );

  const refresh = useCallback(async () => {
    await loadGroups();
    if (groupId) await loadGroup(groupId);
  }, [groupId, loadGroup, loadGroups]);

  return {
    loading,
    error,
    groups,
    group,
    me,
    members,
    stops,
    runs,
    locations,
    pings,
    selectGroup: setGroupId,
    refresh
  };
}

// ---------- group actions ----------

export async function createGroup(name: string, school: string, displayName: string) {
  const sb = supabase();
  const { data, error } = await sb.rpc("carpool_create_group", {
    p_name: name,
    p_school: school || null,
    p_display_name: displayName || null,
    p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
  });
  if (error) throw new Error(error.message);
  return data as CarpoolGroup;
}

export async function joinGroup(code: string, displayName: string) {
  const sb = supabase();
  const { data, error } = await sb.rpc("carpool_join_group", {
    p_code: code,
    p_display_name: displayName || null
  });
  if (error) throw new Error(error.message);
  return data as CarpoolGroup;
}

export async function saveStop(stop: Partial<CarpoolStop> & { group_id: string }) {
  const sb = supabase();
  const row = {
    group_id: stop.group_id,
    member_id: stop.member_id ?? null,
    label: stop.label ?? "Home",
    address: stop.address ?? null,
    lat: stop.lat ?? null,
    lng: stop.lng ?? null,
    riders: stop.riders ?? null,
    position: stop.position ?? 0
  };
  const query = stop.id
    ? sb.from("carpool_stops").update(row).eq("id", stop.id).select().single()
    : sb.from("carpool_stops").insert(row).select().single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as CarpoolStop;
}

export async function startRun(groupId: string, driverId: string, direction: RunDirection) {
  const sb = supabase();
  // A stale run from this morning would block today's; close anything open first.
  await sb
    .from("carpool_runs")
    .update({ status: "done", ended_at: new Date().toISOString() })
    .eq("driver_id", driverId)
    .eq("status", "active");
  const { data, error } = await sb
    .from("carpool_runs")
    .insert({ group_id: groupId, driver_id: driverId, direction })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CarpoolRun;
}

export async function endRun(runId: string) {
  const sb = supabase();
  const { error } = await sb
    .from("carpool_runs")
    .update({ status: "done", ended_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw new Error(error.message);
}

export async function sendPing(input: {
  groupId: string;
  stopId: string | null;
  runId: string | null;
  kind: PingKind;
  message?: string;
  etaSeconds?: number | null;
}) {
  const res = await fetch("/api/carpool/ping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      group_id: input.groupId,
      stop_id: input.stopId,
      run_id: input.runId,
      kind: input.kind,
      message: input.message,
      eta_seconds: input.etaSeconds ?? null
    })
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; duplicate?: boolean };
  if (!res.ok) throw new Error(json.error || "Could not send that");
  return json;
}

// ---------- broadcasting my position ----------

export type ShareState = {
  sharing: boolean;
  position: GeolocationPosition | null;
  error: string | null;
  start: () => void;
  stop: () => void;
};

const MIN_UPLOAD_MS = 4000; // don't write more than ~once every 4s
const MIN_MOVE_M = 15; // ...unless the car has actually moved

/**
 * Streams this device's position into carpool_locations while sharing is on.
 *
 * Browsers only run this while the page is in the foreground — on iOS the fix
 * stops the moment Safari is backgrounded or the screen locks. That is why we
 * hold a screen wake lock and why the UI tells the driver to keep the phone on
 * and visible.
 */
export function useLocationShare(
  groupId: string | null,
  memberId: string | null,
  runId: string | null
): ShareState {
  const [sharing, setSharing] = useState(false);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const lastSent = useRef<{ at: number; lat: number; lng: number } | null>(null);
  const runRef = useRef<string | null>(runId);
  runRef.current = runId;

  const push = useCallback(
    async (pos: GeolocationPosition) => {
      if (!groupId || !memberId) return;
      const { latitude, longitude, accuracy, heading, speed } = pos.coords;
      const now = Date.now();
      const last = lastSent.current;
      const movedEnough =
        !last || distanceM({ lat: last.lat, lng: last.lng }, { lat: latitude, lng: longitude }) >= MIN_MOVE_M;
      if (last && now - last.at < MIN_UPLOAD_MS && !movedEnough) return;
      lastSent.current = { at: now, lat: latitude, lng: longitude };

      const { error: upsertError } = await supabase()
        .from("carpool_locations")
        .upsert(
          {
            member_id: memberId,
            group_id: groupId,
            run_id: runRef.current,
            lat: latitude,
            lng: longitude,
            accuracy_m: accuracy ?? null,
            heading: Number.isFinite(heading) ? heading : null,
            speed_mps: Number.isFinite(speed) ? speed : null,
            updated_at: new Date().toISOString()
          },
          { onConflict: "member_id" }
        );
      if (upsertError) setError(upsertError.message);
    },
    [groupId, memberId]
  );

  const requestWakeLock = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: WakeLock };
      if (nav.wakeLock) wakeRef.current = await nav.wakeLock.request("screen");
    } catch {
      /* wake lock is a nicety, not a requirement */
    }
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError("This device can't share its location.");
      return;
    }
    if (watchRef.current !== null) return;
    setError(null);
    setSharing(true);
    void requestWakeLock();
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos);
        void push(pos);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is off. Turn it on for this site to share where you are."
            : err.message
        );
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }, [push, requestWakeLock]);

  const stop = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    void wakeRef.current?.release().catch(() => undefined);
    wakeRef.current = null;
    setSharing(false);
    lastSent.current = null;
    // Stop sharing means stop sharing: drop the row rather than leave a
    // last-known pin sitting on everyone's map.
    if (memberId) void supabase().from("carpool_locations").delete().eq("member_id", memberId);
  }, [memberId]);

  // Re-acquire the wake lock when the driver comes back to the tab.
  useEffect(() => {
    if (!sharing) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [sharing, requestWakeLock]);

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      void wakeRef.current?.release().catch(() => undefined);
    };
  }, []);

  return { sharing, position, error, start, stop };
}

// ---------- push notifications ----------

export type PushState = "unsupported" | "default" | "granted" | "denied" | "blocked-until-installed";

export function pushSupport(): PushState {
  if (typeof window === "undefined") return "unsupported";
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    // iOS only exposes push once the app is on the Home Screen.
    return isIOS && !standalone ? "blocked-until-installed" : "unsupported";
  }
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as PushState;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function enablePush(): Promise<{ ok: boolean; message?: string }> {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) return { ok: false, message: "Push isn't configured on the server yet." };
  const state = pushSupport();
  if (state === "blocked-until-installed") {
    return {
      ok: false,
      message: "On iPhone, tap Share → Add to Home Screen first, then turn notifications on from there."
    };
  }
  if (state === "unsupported") return { ok: false, message: "This browser can't do push notifications." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, message: "Notifications are turned off for this site." };

  const reg = await navigator.serviceWorker.register("/carpool/sw.js", { scope: "/carpool/" });
  await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource
    }));

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const res = await fetch("/api/carpool/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth
    })
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, message: body.error || "Could not save the subscription." };
  }
  return { ok: true };
}

export async function disablePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("/carpool/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/carpool/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint })
  }).catch(() => undefined);
  await sub.unsubscribe().catch(() => undefined);
}
