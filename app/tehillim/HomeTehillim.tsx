"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  seasonalAddition,
  nameLetters,
  hasValidNameLetters,
  hebNumberPunct,
} from "./data";
import {
  getSaved,
  removeSaved,
  moveSaved,
  setSaved as writeSaved,
  type Saved,
} from "./store";
import {
  getUser,
  signIn,
  signOut,
  syncOnLoad,
  setSyncUser,
  startSyncLoop,
  queueSync,
} from "./account";

type Theme = "light" | "dark";
type Addition = "none" | "kera" | "neshama";
const LS = "tehillim.v1";

function hebField(base: Date, opt: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-u-ca-hebrew", opt).format(base);
}

export default function HomeTehillim() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const [today, setToday] = useState<{ day: number; month: string } | null>(null);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [name, setName] = useState("");
  const [add, setAdd] = useState<Addition>("kera");
  const [theme, setTheme] = useState<Theme>("light");
  const [picking, setPicking] = useState(false);
  const [pick, setPick] = useState<Set<number>>(new Set());
  const [reordering, setReordering] = useState(false);
  const [account, setAccount] = useState<{ email?: string } | null>(null);
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [acctOpen, setAcctOpen] = useState(false);

  useEffect(() => {
    const now = new Date();
    const day = parseInt(hebField(now, { day: "numeric" }), 10);
    const month = hebField(now, { month: "long" });
    setToday({ day, month });
    try {
      setDateLabel(
        new Intl.DateTimeFormat("he-u-ca-hebrew", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(now)
      );
    } catch {
      setDateLabel("");
    }
    setSaved(getSaved());
    try {
      const s = JSON.parse(localStorage.getItem(LS) || "{}");
      const t: Theme =
        s.theme ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      setTheme(t);
      document.documentElement.setAttribute("data-theme", t);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // Account / cross-device sync
  useEffect(() => {
    let stop: (() => void) | undefined;
    (async () => {
      const u = await getUser();
      if (!u) return;
      setAccount(u);
      setSyncUser(u.id);
      try {
        const prof = await syncOnLoad();
        if (prof) {
          setHandle(prof.handle);
          setSaved(getSaved());
          const t = (prof.settings as { theme?: Theme }).theme;
          if (t === "light" || t === "dark") {
            setTheme(t);
            document.documentElement.setAttribute("data-theme", t);
          }
        }
      } catch {
        /* offline / error — stay on local */
      }
      stop = startSyncLoop();
    })();
    return () => stop?.();
  }, []);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setAuthErr(null);
    const { error } = await signIn(email.trim());
    if (error) setAuthErr(error.message);
    else setLinkSent(true);
  }
  async function doSignOut() {
    await signOut();
    setSyncUser(null);
    setAccount(null);
    setHandle("");
    setLinkSent(false);
  }

  function toggleTheme() {
    const t: Theme = theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    try {
      const s = JSON.parse(localStorage.getItem(LS) || "{}");
      localStorage.setItem(LS, JSON.stringify({ ...s, theme: t }));
    } catch {
      /* ignore */
    }
  }

  const season = useMemo(
    () => (today ? seasonalAddition(today.month, today.day) : null),
    [today]
  );

  const nameOk = hasValidNameLetters(name);
  const stanzaCount = useMemo(() => nameLetters(name).length, [name]);

  function openName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameOk) return;
    const q = new URLSearchParams({ mode: "name", name: name.trim(), add });
    router.push(`/tehillim/read?${q.toString()}`);
  }

  function removeOne(ch: number) {
    setSaved(removeSaved(ch));
    queueSync();
  }

  // ---- multi-select picker ----
  function openPicker() {
    setPick(new Set(saved.map((s) => s.ch)));
    setPicking(true);
  }
  function togglePick(n: number) {
    setPick((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }
  function commitPicker() {
    // Keep the user's existing order; append newly-chosen chapters at the end.
    const kept = saved.filter((s) => pick.has(s.ch));
    const added: Saved[] = [...pick]
      .filter((ch) => !saved.some((s) => s.ch === ch))
      .sort((a, b) => a - b)
      .map((ch) => ({ ch }));
    const list = [...kept, ...added];
    writeSaved(list);
    setSaved(list);
    setPicking(false);
    queueSync();
  }

  function move(ch: number, dir: -1 | 1) {
    setSaved(moveSaved(ch, dir));
    queueSync();
  }

  return (
    <div dir="ltr" className="home">
      <header className="home-head">
        <div className="home-titlewrap">
          <h1 className="home-title" lang="he" dir="rtl">
            תְּהִלִּים
          </h1>
          <p className="home-sub">{ready && dateLabel ? dateLabel : "Tehillim"}</p>
        </div>
        <div className="home-head-btns">
          <button
            type="button"
            className={`btn-theme acct-btn ${account ? "on" : ""}`}
            onClick={() => setAcctOpen((o) => !o)}
            title={account ? "Your account" : "Sign in to sync (optional)"}
            aria-label={account ? "Your account" : "Sign in"}
            aria-expanded={acctOpen}
          >
            <svg
              className="acct-ic"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="3.4" />
              <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
            </svg>
          </button>
          <button
            type="button"
            className="btn-theme"
            onClick={toggleTheme}
            title="Day / night"
            aria-label="Toggle day / night"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      {acctOpen && (
        <div className="acct-panel">
          {account ? (
            <>
              <span className="acct-line">
                Signed in as <b>{account.email}</b> — saved Psalms &amp; settings
                sync across your devices.
              </span>
              <span className="acct-line">
                Handle: <code className="handle">{handle || "…"}</code>
              </span>
              <button type="button" className="cta cta-quiet" onClick={doSignOut}>
                Sign out
              </button>
            </>
          ) : linkSent ? (
            <span className="acct-line">
              Check your inbox for a sign‑in link, then open it on any device.
            </span>
          ) : (
            <form className="acct-form" onSubmit={submitEmail}>
              <span className="acct-line">
                Optional — sign in with your email to sync saved Psalms across
                devices. No password.
              </span>
              <div className="acct-row">
                <input
                  className="emailinput"
                  type="email"
                  required
                  inputMode="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email address"
                />
                <button type="submit" className="cta" disabled={!email.trim()}>
                  Send link
                </button>
              </div>
              {authErr && <span className="auth-err">{authErr}</span>}
            </form>
          )}
        </div>
      )}

      {/* 1 — Daily Tehillim */}
      <a className="card card-primary" href="/tehillim/read?mode=today">
        <div className="card-main">
          <span className="card-kicker">Every day</span>
          <span className="card-title">Daily Tehillim</span>
          <span className="card-desc">
            Today&rsquo;s portion by the Hebrew day of the month
            {ready && today ? ` · day ${today.day}` : ""}.
          </span>
          {season && (
            <span className={`badge badge-${season.kind}`}>
              {season.kind === "yomkippur"
                ? "Yom Kippur — completes the Tehillim (115–150)"
                : `+ ${season.kind === "elul" ? "Elul" : "Ten Days"} chapters ${season.chapters[0]}–${season.chapters[season.chapters.length - 1]}`}
            </span>
          )}
        </div>
        <span className="card-arrow" aria-hidden>
          →
        </span>
      </a>

      {/* 2 — Saved Psalms */}
      <section className="card">
        <div className="card-main">
          <span className="card-kicker">Kept for kaddish &amp; family</span>
          <span className="card-title">Saved Psalms</span>

          {ready && saved.length === 0 ? (
            <span className="card-desc">
              None yet — tap <b>Add Psalms</b> to pick a few, or the ☆ while reading.
              They join your Daily Tehillim.
            </span>
          ) : reordering ? (
            <div className="saved-list">
              {saved.map((s, i) => (
                <div className="saved-row" key={s.ch}>
                  <span className="saved-row-label">
                    <b lang="he" dir="rtl">
                      {hebNumberPunct(s.ch)}
                    </b>
                    <small>Psalm {s.ch}</small>
                  </span>
                  <div className="saved-row-btns">
                    <button
                      type="button"
                      className="move-btn"
                      disabled={i === 0}
                      onClick={() => move(s.ch, -1)}
                      aria-label={`Move Psalm ${s.ch} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="move-btn"
                      disabled={i === saved.length - 1}
                      onClick={() => move(s.ch, 1)}
                      aria-label={`Move Psalm ${s.ch} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="savedx savedx-row"
                      onClick={() => removeOne(s.ch)}
                      aria-label={`Remove Psalm ${s.ch}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="savedchips">
              {saved.map((s) => (
                <span className="savedchip" key={s.ch}>
                  <a href={`/tehillim/read?mode=chapter&ch=${s.ch}`}>
                    <b lang="he" dir="rtl">
                      {hebNumberPunct(s.ch)}
                    </b>
                    <small>{s.ch}</small>
                  </a>
                  <button
                    type="button"
                    className="savedx"
                    onClick={() => removeOne(s.ch)}
                    title="Remove"
                    aria-label={`Remove Psalm ${s.ch}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="saved-actions">
            {reordering ? (
              <button
                type="button"
                className="cta cta-quiet"
                onClick={() => setReordering(false)}
              >
                ✓ Done
              </button>
            ) : (
              <>
                <button type="button" className="cta cta-quiet" onClick={openPicker}>
                  ＋ Add Psalms
                </button>
                {saved.length > 1 && (
                  <button
                    type="button"
                    className="cta cta-quiet"
                    onClick={() => {
                      setPicking(false);
                      setReordering(true);
                    }}
                  >
                    ↕ Reorder
                  </button>
                )}
                {saved.length > 0 && (
                  <a className="cta cta-quiet" href="/tehillim/read?mode=saved">
                    Read all →
                  </a>
                )}
              </>
            )}
          </div>

          {picking && (
            <div className="picker">
              <div className="picker-head">
                <span className="picker-count">
                  Tap to select · {pick.size} chosen
                </span>
                <div className="picker-btns">
                  <button
                    type="button"
                    className="picker-cancel"
                    onClick={() => setPicking(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="picker-save"
                    onClick={commitPicker}
                  >
                    Save
                  </button>
                </div>
              </div>
              <div className="picker-grid">
                {Array.from({ length: 150 }, (_, i) => i + 1).map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={`picker-cell ${pick.has(n) ? "on" : ""}`}
                    aria-pressed={pick.has(n)}
                    onClick={() => togglePick(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3 — Tehillim for a name */}
      <section className="card card-form">
        <div className="card-main">
          <span className="card-kicker">Psalm 119</span>
          <span className="card-title">Tehillim for a Name</span>
          <span className="card-desc">
            The stanzas of Psalm 119 that spell a Hebrew name — the custom for a
            refuah or in memory.
          </span>
          <form className="nameform" onSubmit={openName}>
            <input
              className="nameinput"
              lang="he"
              dir="rtl"
              inputMode="text"
              placeholder="שֵׁם בְּעִבְרִית"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Hebrew name"
            />
            <div className="addrow" role="radiogroup" aria-label="Additional stanzas">
              {[
                { k: "kera", label: "+ קרע שטן" },
                { k: "neshama", label: "+ נשמה" },
                { k: "none", label: "Name only" },
              ].map((o) => (
                <button
                  type="button"
                  key={o.k}
                  role="radio"
                  aria-checked={add === o.k}
                  className={`addchip ${add === o.k ? "on" : ""}`}
                  onClick={() => setAdd(o.k as Addition)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button type="submit" className="cta" disabled={!nameOk}>
              {nameOk
                ? `Open — ${stanzaCount} stanza${stanzaCount === 1 ? "" : "s"}`
                : "Type a Hebrew name"}
            </button>
          </form>
        </div>
      </section>

      {/* Browse */}
      <a className="card card-slim" href="/tehillim/read?mode=chapter&ch=1">
        <div className="card-main">
          <span className="card-title">Browse all 150</span>
          <span className="card-desc">Open any Psalm and read onward.</span>
        </div>
        <span className="card-arrow" aria-hidden>
          →
        </span>
      </a>

      <footer className="home-foot">
        Hebrew text: Miqra according to the Masorah (public domain). Saved Psalms are
        kept on this device.
      </footer>
    </div>
  );
}
