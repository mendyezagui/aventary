"use client";

// The two modal sheets: editing your own stop, and settings.

import { useEffect, useState } from "react";
import {
  disablePush,
  enablePush,
  pushSupport,
  saveStop,
  supabase,
  type CarpoolState,
  type PushState
} from "./store";

function Sheet({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="cp-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="cp-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function StopSheet({ state, onClose }: { state: CarpoolState; onClose: () => void }) {
  const { group, me, stops } = state;
  const mine = stops.find((s) => s.member_id === me?.id) ?? null;

  const [label, setLabel] = useState(mine?.label ?? (me ? `${me.display_name}'s house` : "Home"));
  const [riders, setRiders] = useState(mine?.riders ?? "");
  const [address, setAddress] = useState(mine?.address ?? "");
  const [lat, setLat] = useState<number | null>(mine?.lat ?? null);
  const [lng, setLng] = useState<number | null>(mine?.lng ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const useCurrentPosition = () => {
    if (!navigator.geolocation) {
      setMsg("This device can't read a location.");
      return;
    }
    setMsg("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setMsg("Pinned to where you are now.");
      },
      (err) => setMsg(err.message),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const lookupAddress = async () => {
    if (!address.trim()) return;
    setBusy(true);
    setMsg("Looking up that address…");
    try {
      const res = await fetch(`/api/carpool/geocode?q=${encodeURIComponent(address)}`);
      const json = (await res.json()) as { lat?: number; lng?: number; label?: string; error?: string };
      if (!res.ok || json.lat == null || json.lng == null) {
        setMsg(json.error || "Couldn't find that address. Stand outside and use your location instead.");
      } else {
        setLat(json.lat);
        setLng(json.lng);
        setMsg(`Found: ${json.label ?? address}`);
      }
    } catch {
      setMsg("Address lookup failed.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!group || !me) return;
    setBusy(true);
    setMsg(null);
    try {
      await saveStop({
        id: mine?.id,
        group_id: group.id,
        member_id: me.id,
        label: label.trim() || "Home",
        riders: riders.trim() || null,
        address: address.trim() || null,
        lat,
        lng,
        position: mine?.position ?? 0
      });
      await state.refresh();
      onClose();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save.");
      setBusy(false);
    }
  };

  return (
    <Sheet title="My stop" onClose={onClose}>
      <label>
        Name this stop
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="The Cohens" />
      </label>
      <label>
        Kids riding
        <input value={riders} onChange={(e) => setRiders(e.target.value)} placeholder="Chaya, Moshe" />
      </label>
      <label>
        Address
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="12 Maple Ave"
        />
      </label>

      <div className="cp-row">
        <button type="button" onClick={useCurrentPosition}>
          Use my location
        </button>
        <button type="button" onClick={() => void lookupAddress()} disabled={busy || !address.trim()}>
          Find address
        </button>
      </div>

      <p className="cp-sub">
        {lat != null && lng != null
          ? `Pinned at ${lat.toFixed(5)}, ${lng.toFixed(5)}`
          : "No location pinned yet — drivers won't get an ETA for you."}
      </p>
      {msg && <p className="cp-notice">{msg}</p>}

      <button type="button" className="cp-primary" onClick={() => void save()} disabled={busy}>
        {busy ? "Saving…" : "Save stop"}
      </button>
    </Sheet>
  );
}

export function SettingsSheet({
  state,
  onClose,
  onSignOut
}: {
  state: CarpoolState;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const { group, groups, me } = state;
  const [name, setName] = useState(me?.display_name ?? "");
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [push, setPush] = useState<PushState>("unsupported");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPush(pushSupport()), []);

  const saveProfile = async () => {
    if (!me) return;
    setBusy(true);
    const { error } = await supabase()
      .from("carpool_members")
      .update({ display_name: name.trim() || me.display_name, phone: phone.trim() || null })
      .eq("id", me.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      await state.refresh();
      setMsg("Saved.");
    }
  };

  const toggleNotifications = async () => {
    if (push === "granted") {
      await disablePush();
      setPush(pushSupport());
      setMsg("Notifications off on this device.");
      return;
    }
    const result = await enablePush();
    setPush(pushSupport());
    setMsg(result.ok ? "Notifications on for this device." : result.message ?? "Could not turn those on.");
  };

  const leave = async () => {
    if (!me || !group) return;
    if (!confirm(`Leave ${group.name}? Your stop stays for the group to reuse.`)) return;
    setBusy(true);
    await supabase().from("carpool_members").delete().eq("id", me.id);
    await state.refresh();
    setBusy(false);
    onClose();
  };

  return (
    <Sheet title="Settings" onClose={onClose}>
      <label>
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Phone (so parents can call you)
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
      </label>
      <button type="button" onClick={() => void saveProfile()} disabled={busy}>
        Save
      </button>

      <hr />

      <h3>Notifications</h3>
      <p className="cp-sub">
        {push === "granted"
          ? "This device gets a buzz when a driver is a minute out."
          : push === "blocked-until-installed"
            ? "On iPhone: tap Share → Add to Home Screen, open it from there, then turn these on."
            : push === "denied"
              ? "Blocked in your browser settings for this site."
              : "Get a buzz when a driver is a minute from your door."}
      </p>
      <button type="button" onClick={() => void toggleNotifications()}>
        {push === "granted" ? "Turn off on this device" : "Turn on notifications"}
      </button>

      <hr />

      <h3>Carpool</h3>
      <p className="cp-sub">
        Share code <strong>{group?.join_code}</strong> with the other parents — they enter it to join.
      </p>
      {groups.length > 1 && (
        <label>
          Switch carpool
          <select value={group?.id ?? ""} onChange={(e) => state.selectGroup(e.target.value)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {msg && <p className="cp-notice">{msg}</p>}

      <hr />
      <div className="cp-row">
        <button type="button" onClick={() => void leave()} disabled={busy}>
          Leave carpool
        </button>
        <button type="button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </Sheet>
  );
}
