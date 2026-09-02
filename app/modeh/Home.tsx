"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildStations,
  estimateMinutes,
  NUSACH_LABEL,
  CLOSING,
  type Length,
  type Nusach,
} from "./blessings";
import {
  DEFAULT_SETTINGS,
  intentionOf,
  englishDateLabel,
  getJournal,
  getSettings,
  greeting,
  hebrewDateLabel,
  saveSettings,
  stats,
  todayKey,
  type Entry,
  type Settings,
  type Stats,
} from "./store";
import { applyTheme, effectiveDark } from "./theme";

export default function Home() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [journal, setJournal] = useState<Entry[]>([]);
  const [st, setSt] = useState<Stats>({ streak: 0, total: 0, longest: 0 });
  const [hebDate, setHebDate] = useState("");
  const [hello, setHello] = useState("Good morning");
  const [showSettings, setShowSettings] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const s = getSettings();
    setSettings(s);
    applyTheme(s.theme);
    const list = getJournal();
    setJournal(list);
    setSt(stats(list));
    setHebDate(hebrewDateLabel());
    setHello(greeting());
    setDark(effectiveDark(s.theme));
    setReady(true);
  }, []);

  function patch(p: Partial<Settings>) {
    const next = saveSettings(p);
    setSettings(next);
    if (p.theme) {
      applyTheme(next.theme);
      setDark(effectiveDark(next.theme));
    }
  }

  const stations = useMemo(
    () =>
      buildStations(
        { voice: settings.voice, nusach: settings.nusach, nameStyle: settings.nameStyle },
        settings.length,
        settings.longForm
      ),
    [settings]
  );

  const today = journal.find((e) => e.date === todayKey());
  const doneToday = !!today?.completed;

  // A couple of lines from earlier mornings, to read back over.
  const recent = useMemo(() => {
    const out: { date: string; text: string }[] = [];
    for (const e of journal) {
      if (e.date === todayKey()) continue;
      const line = intentionOf(e.notes) || e.notes.modeh || Object.values(e.notes)[0];
      if (line) out.push({ date: e.date, text: line });
      if (out.length === 2) break;
    }
    return out;
  }, [journal]);

  return (
    <div className="wrap">
      <header className="head">
        <div className="head-l">
          <p className="greet">{ready ? hello : " "}</p>
          <h1 className="brand he" lang="he">
            {settings.voice === "female" ? "מוֹדָה אֲנִי" : "מוֹדֶה אֲנִי"}
          </h1>
          <p className="dateline">{ready && hebDate ? hebDate : " "}</p>
        </div>
        <div className="head-r">
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Settings"
            aria-expanded={showSettings}
            onClick={() => setShowSettings((v) => !v)}
            title="Settings"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
              <circle cx="16" cy="7" r="2.1" />
              <circle cx="10" cy="17" r="2.1" />
            </svg>
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Light or dark"
            title="Light / dark"
            onClick={() => patch({ theme: dark ? "light" : "dark" })}
          >
            {dark ? "☀" : "☾"}
          </button>
        </div>
      </header>

      {showSettings && <SettingsPanel s={settings} patch={patch} />}

      <div className="streak" aria-hidden={!ready}>
        <div className={`stat ${st.streak > 0 ? "stat-on" : ""}`}>
          <b>{ready ? st.streak : "—"}</b>
          <span>day streak</span>
        </div>
        <div className="stat">
          <b>{ready ? st.total : "—"}</b>
          <span>mornings</span>
        </div>
        <div className="stat">
          <b>{ready ? st.longest : "—"}</b>
          <span>longest run</span>
        </div>
      </div>

      <Link className="begin" href="/modeh/session">
        <p className="begin-he he" lang="he">
          בִּרְכוֹת הַשַּׁחַר
        </p>
        <p className="begin-title">
          {doneToday ? "Sit again" : "Begin this morning"}
        </p>
        <p className="begin-desc">
          {settings.length === "short"
            ? "The short sit — the blessings that name what your body and your night just did for you."
            : "The morning blessings, one at a time, with room to notice what each one is actually pointing at."}
        </p>
        <span className="begin-go">
          {doneToday ? "Open again" : "Start"} <span aria-hidden>→</span>
        </span>
        <p className="begin-meta">
          {stations.length} blessings · about {estimateMinutes(stations.length)} minutes
          {doneToday ? " · done today ✓" : ""}
        </p>
      </Link>

      <div className="seg" role="radiogroup" aria-label="Length of the sit">
        {(
          [
            ["short", "Short sit"],
            ["full", "Full morning"],
          ] as [Length, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={settings.length === k}
            className={settings.length === k ? "on" : ""}
            onClick={() => patch({ length: k })}
          >
            {label}
          </button>
        ))}
      </div>

      {today && Object.keys(today.notes).length > 0 && (
        <section className="card">
          <div className="card-h">
            <h2 className="card-t">What you wrote this morning</h2>
            <Link className="card-link" href="/modeh/journal">
              All of it →
            </Link>
          </div>
          {intentionOf(today.notes) ? (
            <blockquote className="quote">
              {intentionOf(today.notes)}
              <cite>{CLOSING.title}</cite>
            </blockquote>
          ) : (
            <blockquote className="quote">{Object.values(today.notes)[0]}</blockquote>
          )}
        </section>
      )}

      <section className="card">
        <div className="card-h">
          <h2 className="card-t">Journal</h2>
          <Link className="card-link" href="/modeh/journal">
            Open →
          </Link>
        </div>
        {ready && recent.length === 0 ? (
          <p className="card-p">
            Whatever you write during a sit is kept here — on this device only —
            so you can read back what you were grateful for a month ago.
          </p>
        ) : (
          recent.map((r) => (
            <blockquote className="quote" key={r.date}>
              {r.text}
              <cite>{englishDateLabel(r.date)}</cite>
            </blockquote>
          ))
        )}
      </section>

      <p className="foot">
        Birchot HaShachar, the blessings said on waking. Nothing you write leaves
        this device.
        <br />
        Add it to your home screen — Share → Add to Home Screen on an iPhone,
        Install app on Android — and it opens like any other app.
        <br />
        <Link className="card-link" href="/modeh/about">
          Where the text and the questions come from →
        </Link>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SettingsPanel({
  s,
  patch,
}: {
  s: Settings;
  patch: (p: Partial<Settings>) => void;
}) {
  return (
    <div className="settings">
      <Row
        label="Nusach"
        help={
          <>
            Sets both the wording and the order. Ari (Chabad) opens with{" "}
            <He>הַנּוֹתֵן לַשְּׂכְוִי</He> and says the three blessings of
            identity late, just before <He>הַמַּעֲבִיר שֵׁנָה</He>; Ashkenaz and
            Sefard open with <He>אֲשֶׁר נָתַן לַשֶּׂכְוִי</He> and say them
            second.
          </>
        }
      >
        <Chips
          value={s.nusach}
          onPick={(nusach) => patch({ nusach })}
          options={(["ari", "ashkenaz", "sefard"] as Nusach[]).map((n) => [
            n,
            NUSACH_LABEL[n],
          ])}
        />
      </Row>

      <Row
        label="Who is saying it"
        help={
          <>
            Sets <He>מוֹדֶה</He> / <He>מוֹדָה</He>, and swaps the third blessing
            of identity to <He>שֶׁעָשַׂנִי כִּרְצוֹנוֹ</He> for a woman.
          </>
        }
      >
        <Chips
          value={s.voice}
          onPick={(voice) => patch({ voice })}
          options={[
            ["male", <><He>מוֹדֶה</He> — masculine</>],
            ["female", <><He>מוֹדָה</He> — feminine</>],
          ]}
        />
      </Row>

      <Row
        label="The Name"
        help={
          <>
            Full is what a siddur prints, for actually davening. Substituted
            writes <He>ה׳</He> and <He>אֱלֹקֵינוּ</He>, for a screen you are only
            reading from.
          </>
        }
      >
        <Chips
          value={s.nameStyle}
          onPick={(nameStyle) => patch({ nameStyle })}
          options={[
            ["full", <>Full — <He>יְיָ</He></>],
            ["reverent", <>Substituted — <He>ה׳</He></>],
          ]}
        />
      </Row>

      <Row label="Length" help="The short sit keeps the blessings about the body and the night.">
        <Chips
          value={s.length}
          onPick={(length) => patch({ length })}
          options={[
            ["short", "Short"],
            ["full", "Full"],
          ]}
        />
      </Row>

      <Toggle
        label="Include Vihi Ratzon and Birchot HaTorah"
        checked={s.longForm}
        onChange={(longForm) => patch({ longForm })}
      />
      <Toggle
        label="Show transliteration"
        checked={s.showTranslit}
        onChange={(showTranslit) => patch({ showTranslit })}
      />
      <Toggle
        label="Show English"
        checked={s.showEnglish}
        onChange={(showEnglish) => patch({ showEnglish })}
      />
      <Toggle
        label="Breathing pacer"
        checked={s.breath}
        onChange={(breath) => patch({ breath })}
      />
    </div>
  );
}

/** An inline Hebrew fragment inside English prose — <bdi> keeps the surrounding
 *  punctuation from being dragged around by the bidi algorithm. */
function He({ children }: { children: React.ReactNode }) {
  return (
    <bdi className="he" lang="he">
      {children}
    </bdi>
  );
}

function Row({
  label,
  help,
  children,
}: {
  label: string;
  help: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="set-row">
      <span className="set-label">{label}</span>
      <span className="set-help">{help}</span>
      {children}
    </div>
  );
}

function Chips<T extends string>({
  value,
  options,
  onPick,
}: {
  value: T;
  options: [T, React.ReactNode][];
  onPick: (v: T) => void;
}) {
  return (
    <div className="chips" role="radiogroup">
      {options.map(([k, label]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          className={`chip ${value === k ? "on" : ""}`}
          onClick={() => onPick(k)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="set-row">
      <label className="switch">
        <span className="set-label" style={{ marginBottom: 0 }}>
          {label}
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="switch-box" aria-hidden />
      </label>
    </div>
  );
}
