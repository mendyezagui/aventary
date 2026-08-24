"use client";

// Root of the carpool app: sign in, then either onboarding or the dashboard.

import { useCallback, useEffect, useRef, useState } from "react";
import Dashboard from "./Dashboard";
import { createGroup, joinGroup, supabase, useCarpool, useSession } from "./store";
import { formatAge } from "@/lib/carpool/geo";
import type { CarpoolPing } from "@/lib/carpool/types";

function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/carpool` }
    });
    setBusy(false);
    if (authError) setError(authError.message);
    else setSent(true);
  };

  return (
    <div className="cp-gate">
      <h1>Carpool</h1>
      <p>See where the driver is. Know when to send the kids out.</p>
      {sent ? (
        <p className="cp-notice">
          Check <strong>{email}</strong> for a sign-in link. Open it on the phone you&apos;ll use in the car.
        </p>
      ) : (
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>
          <button type="submit" className="cp-primary" disabled={busy || !email.trim()}>
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
          {error && <p className="cp-notice cp-notice-warn">{error}</p>}
        </form>
      )}
    </div>
  );
}

function Onboard({ email, onDone }: { email: string | null; onDone: () => void }) {
  const [mode, setMode] = useState<"join" | "create">("join");
  const [name, setName] = useState(email ? email.split("@")[0] : "");
  const [code, setCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [school, setSchool] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "join") await joinGroup(code, name);
      else await createGroup(groupName, school, name);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
      setBusy(false);
    }
  };

  return (
    <div className="cp-gate">
      <h1>Set up your carpool</h1>
      <div className="cp-seg" role="group">
        <button type="button" className={mode === "join" ? "on" : ""} onClick={() => setMode("join")}>
          Join with a code
        </button>
        <button type="button" className={mode === "create" ? "on" : ""} onClick={() => setMode("create")}>
          Start a new one
        </button>
      </div>

      <form onSubmit={submit}>
        <label>
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mendy" required />
        </label>

        {mode === "join" ? (
          <label>
            Carpool code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="K7RMTD"
              autoCapitalize="characters"
              required
            />
          </label>
        ) : (
          <>
            <label>
              Carpool name
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="8th grade morning run"
                required
              />
            </label>
            <label>
              School (optional)
              <input value={school} onChange={(e) => setSchool(e.target.value)} />
            </label>
          </>
        )}

        <button type="submit" className="cp-primary" disabled={busy}>
          {busy ? "Working…" : mode === "join" ? "Join carpool" : "Create carpool"}
        </button>
        {error && <p className="cp-notice cp-notice-warn">{error}</p>}
      </form>
    </div>
  );
}

/** A banner for pings that land while the app is open — push covers the rest. */
function PingBanner({ ping, onDismiss }: { ping: CarpoolPing; onDismiss: () => void }) {
  return (
    <div className={`cp-banner cp-banner-${ping.kind}`} role="alert" onClick={onDismiss}>
      <strong>
        {ping.kind === "one_minute"
          ? "One minute away — kids outside"
          : ping.kind === "arrived"
            ? "Driver is outside now"
            : ping.kind === "heads_up"
              ? "Route started"
              : ping.kind.replace("_", " ")}
      </strong>
      {ping.message && <span>{ping.message}</span>}
      <span className="cp-sub">{formatAge(ping.created_at)}</span>
    </div>
  );
}

/** Without Supabase configured the client throws on construction; say so
 *  plainly rather than white-screening with a stack trace. */
function NotConfigured() {
  return (
    <div className="cp-gate">
      <h1>Carpool</h1>
      <p className="cp-notice cp-notice-warn">
        This app needs Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and
        NEXT_PUBLIC_SUPABASE_ANON_KEY, then rebuild.
      </p>
    </div>
  );
}

export default function CarpoolApp() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!configured) return <NotConfigured />;
  return <CarpoolAppInner />;
}

function CarpoolAppInner() {
  const session = useSession();
  const state = useCarpool(session.userId);
  const [banner, setBanner] = useState<CarpoolPing | null>(null);
  const seen = useRef<string | null>(null);

  // Buzz on a new ping addressed to my stop (or the whole group).
  useEffect(() => {
    const latest = state.pings[0];
    if (!latest || latest.id === seen.current) return;
    const first = seen.current === null;
    seen.current = latest.id;
    if (first) return; // don't announce history on load

    const myStopId = state.stops.find((s) => s.member_id === state.me?.id)?.id;
    const forMe = !latest.stop_id || latest.stop_id === myStopId;
    const fromMe = latest.from_member === state.me?.id;
    if (!forMe || fromMe) return;

    setBanner(latest);
    try {
      navigator.vibrate?.(latest.kind === "one_minute" ? [200, 80, 200] : 120);
    } catch {
      /* vibration is optional */
    }
    const timer = setTimeout(() => setBanner(null), 20000);
    return () => clearTimeout(timer);
  }, [state.pings, state.stops, state.me]);

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
    window.location.href = "/carpool";
  }, []);

  // Register the service worker so a granted push subscription keeps working.
  useEffect(() => {
    if (!session.userId || !("serviceWorker" in navigator)) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    void navigator.serviceWorker.register("/carpool/sw.js", { scope: "/carpool/" }).catch(() => undefined);
  }, [session.userId]);

  if (!session.ready) return <div className="cp-gate cp-loading">Loading…</div>;
  if (!session.userId) return <SignIn />;
  if (state.loading && state.groups.length === 0) return <div className="cp-gate cp-loading">Loading…</div>;
  if (state.groups.length === 0) return <Onboard email={session.email} onDone={() => void state.refresh()} />;

  return (
    <>
      {banner && <PingBanner ping={banner} onDismiss={() => setBanner(null)} />}
      <Dashboard state={state} onSignOut={() => void signOut()} />
      {state.error && <p className="cp-notice cp-notice-warn">{state.error}</p>}
    </>
  );
}
