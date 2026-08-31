"use client";

import { createSupabaseBrowser } from "@/lib/supabase/client";
import { getSaved, setSaved, type Saved } from "./store";

const LS = "tehillim.v1";
const LINKED = "tehillim.linkedUser";

export type Settings = Record<string, unknown>;
export type Profile = { handle: string; saved: Saved[]; settings: Settings };

export function hasSupabase(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

let _sb: ReturnType<typeof createSupabaseBrowser> | null = null;
export function sb() {
  if (!_sb) _sb = createSupabaseBrowser();
  return _sb;
}

// ---- local settings blob (everything in tehillim.v1 except the scroll cache) ----
export function localSettings(): Settings {
  try {
    const { scroll, ...rest } = JSON.parse(localStorage.getItem(LS) || "{}");
    void scroll;
    return rest;
  } catch {
    return {};
  }
}
function writeLocalSettings(settings: Settings) {
  try {
    const cur = JSON.parse(localStorage.getItem(LS) || "{}");
    localStorage.setItem(LS, JSON.stringify({ ...cur, ...settings }));
  } catch {
    /* ignore */
  }
}

// ---- human-readable handle: three words + a number, e.g. quiet-cedar-harp-42 ----
const ADJ = [
  "quiet", "gentle", "humble", "bright", "calm", "noble", "kind", "steady",
  "radiant", "faithful", "joyful", "hidden", "golden", "ancient", "holy",
  "still", "brave", "clear", "warm", "deep",
];
const NOUN = [
  "cedar", "harp", "dove", "river", "olive", "psalm", "lamp", "crown", "gate",
  "spring", "valley", "mountain", "star", "vine", "shepherd", "meadow", "dawn",
  "ember", "willow", "brook",
];
function randomHandle(): string {
  const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${pick(ADJ)}-${pick(NOUN)}-${pick(NOUN)}-${num}`;
}

// ---- auth ----
export async function getUser() {
  if (!hasSupabase()) return null;
  try {
    const { data } = await sb().auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}
export async function signIn(email: string) {
  if (!hasSupabase()) {
    return { error: { message: "Sync isn’t configured yet." } } as {
      error: { message: string };
    };
  }
  return sb().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}/auth/callback?next=/tehillim` },
  });
}
export async function signOut() {
  if (hasSupabase()) {
    try {
      await sb().auth.signOut();
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.removeItem(LINKED);
  } catch {
    /* ignore */
  }
}

// ---- profile ----
async function loadOrCreate(userId: string): Promise<Profile> {
  const client = sb();
  const { data } = await client
    .from("tehillim_profiles")
    .select("handle,saved,settings")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data as Profile;

  // Create, seeding from whatever is on this device. Retry on a handle clash.
  const saved = getSaved();
  const settings = localSettings();
  for (let i = 0; i < 6; i++) {
    const handle = randomHandle();
    const ins = await client
      .from("tehillim_profiles")
      .insert({ user_id: userId, handle, saved, settings })
      .select("handle,saved,settings")
      .maybeSingle();
    if (!ins.error && ins.data) return ins.data as Profile;
  }
  throw new Error("Could not create your account. Please try again.");
}

export async function pushProfile(userId: string) {
  const saved = getSaved();
  const settings = localSettings();
  await sb().from("tehillim_profiles").update({ saved, settings }).eq("user_id", userId);
}

/**
 * Bring this device in line with the account.
 * - First time linking on this device: union local saved into the account
 *   (never drop anything you had saved locally) and push it up.
 * - Afterwards the account is authoritative, so removals / reorders / settings
 *   made on another device propagate here.
 * Writes the result to localStorage and returns the profile.
 */
export async function syncOnLoad(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;
  const profile = await loadOrCreate(user.id);
  let linked = "";
  try {
    linked = localStorage.getItem(LINKED) || "";
  } catch {
    /* ignore */
  }

  if (linked !== user.id) {
    const merged: Saved[] = [...profile.saved];
    for (const s of getSaved()) {
      if (!merged.some((m) => m.ch === s.ch)) merged.push(s);
    }
    const settings = { ...localSettings(), ...profile.settings };
    setSaved(merged);
    writeLocalSettings(settings);
    await sb()
      .from("tehillim_profiles")
      .update({ saved: merged, settings })
      .eq("user_id", user.id);
    try {
      localStorage.setItem(LINKED, user.id);
    } catch {
      /* ignore */
    }
    return { handle: profile.handle, saved: merged, settings };
  }

  setSaved(profile.saved);
  writeLocalSettings(profile.settings);
  return profile;
}

// ---- debounced push loop: components mark dirty; we flush every few seconds ----
let _uid: string | null = null;
let _dirty = false;
export function setSyncUser(uid: string | null) {
  _uid = uid;
}
export function queueSync() {
  _dirty = true; // flush() only pushes when a user is set
}
async function flush() {
  if (_dirty && _uid) {
    _dirty = false;
    try {
      await pushProfile(_uid);
    } catch {
      _dirty = true; // retry next tick
    }
  }
}
export function startSyncLoop(): () => void {
  const t = setInterval(flush, 3000);
  const onHide = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", onHide);
  return () => {
    clearInterval(t);
    document.removeEventListener("visibilitychange", onHide);
    flush();
  };
}
