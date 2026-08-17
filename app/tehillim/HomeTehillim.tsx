"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  seasonalAddition,
  nameLetters,
  hasValidNameLetters,
  hebNumberPunct,
} from "./data";
import { getSaved, removeSaved, type Saved } from "./store";

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
        <button
          type="button"
          className="btn-theme"
          onClick={toggleTheme}
          title="Day / night"
          aria-label="Toggle day / night"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </header>

      {/* Daily Tehillim */}
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

      {/* Tehillim for a name */}
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
                { k: "kera", label: "+ קרע שטן", hint: "refuah" },
                { k: "neshama", label: "+ נשמה", hint: "memory" },
                { k: "none", label: "Name only", hint: "" },
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
              {nameOk ? `Open — ${stanzaCount} stanza${stanzaCount === 1 ? "" : "s"}` : "Type a Hebrew name"}
            </button>
          </form>
        </div>
      </section>

      {/* Saved Psalms */}
      <section className="card">
        <div className="card-main">
          <span className="card-kicker">Kept for kaddish &amp; family</span>
          <span className="card-title">Saved Psalms</span>
          {ready && saved.length === 0 ? (
            <span className="card-desc">
              None yet. While reading, tap the ☆ on any Psalm to keep it here.
            </span>
          ) : (
            <>
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
              <a className="cta cta-quiet" href="/tehillim/read?mode=saved">
                Read all saved →
              </a>
            </>
          )}
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
