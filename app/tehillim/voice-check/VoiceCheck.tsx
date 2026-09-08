"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TEXT } from "../data";

// A device-voice check for reading Tehillim aloud with the browser's built-in
// speechSynthesis (Web Speech API) — no API key, no cost, uses the voices the
// device itself has. This page just lets you *hear* each Hebrew voice on your
// phone so we know whether it's good enough to build the real reader feature.

const NIKKUD = /[֑-ׇ]/g; // Hebrew points (nikkud) + related marks
// The Tetragrammaton, letters possibly interleaved with nikkud.
const SHEM = /י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה/g;

// Two verses chosen to test the two hard questions:
// 1:1 is dense with nikkud (does the voice read the points?); 23:1 carries the
// Divine Name (does the "Hashem" substitution work?).
const SAMPLES = [
  { label: "Psalm 1:1", he: "א׳", text: TEXT["1"]?.[0] ?? "" },
  { label: "Psalm 23:1", he: "כ״ג", text: TEXT["23"]?.[0] ?? "" },
];

function transform(text: string, stripNikkud: boolean, sayHashem: boolean): string {
  let s = text;
  if (sayHashem) s = s.replace(SHEM, "הַשֵּׁם");
  if (stripNikkud) s = s.replace(NIKKUD, "");
  s = s.replace(/־/g, " "); // maqaf → space, so joined words are read apart
  return s.trim();
}

export default function VoiceCheck() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speed, setSpeed] = useState(0.85);
  const [stripNikkud, setStripNikkud] = useState(false);
  const [sayHashem, setSayHashem] = useState(true);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Load the device's voices. They can arrive asynchronously, so refresh on the
  // voiceschanged event as well as on mount.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const hebrew = voices.filter((v) => v.lang?.toLowerCase().startsWith("he"));

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeakingKey(null);
  }, []);

  // Speak both sample verses in turn through one voice (or the default when
  // `voice` is null). Cancel anything already queued first, so repeated taps
  // never stack up into double-speech.
  const speak = useCallback(
    (key: string, voice: SpeechSynthesisVoice | null) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      setSpeakingKey(key);
      SAMPLES.forEach((s, i) => {
        const u = new SpeechSynthesisUtterance(
          transform(s.text, stripNikkud, sayHashem)
        );
        if (voice) u.voice = voice;
        u.lang = voice?.lang || "he-IL";
        u.rate = speedRef.current;
        if (i === SAMPLES.length - 1) {
          u.onend = () => setSpeakingKey((k) => (k === key ? null : k));
          u.onerror = () => setSpeakingKey((k) => (k === key ? null : k));
        }
        synth.speak(u);
      });
    },
    [stripNikkud, sayHashem]
  );

  return (
    <div dir="ltr" className="home vc">
      <header className="home-head">
        <div className="home-titlewrap">
          <h1 className="home-title vc-title">Voice check</h1>
          <p className="home-sub">
            Reading Tehillim aloud with your device&rsquo;s own Hebrew voice.
          </p>
        </div>
        <a className="btn-theme" href="/tehillim" title="Home" aria-label="Home">
          ⌂
        </a>
      </header>

      <section className="card card-form">
        <div className="card-main">
          <span className="card-kicker">Controls</span>

          <label className="vc-ctrl">
            <span className="vc-ctrl-label">
              Speed <b>{speed.toFixed(2)}×</b>
            </span>
            <input
              type="range"
              min={0.5}
              max={1.2}
              step={0.05}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              aria-label="Speaking speed"
            />
            <span className="vc-hint">
              Starts slow — default TTS pace is too quick to say Tehillim along
              with.
            </span>
          </label>

          <label className="vc-toggle">
            <input
              type="checkbox"
              checked={stripNikkud}
              onChange={(e) => setStripNikkud(e.target.checked)}
            />
            <span>
              Strip nikkud
              <span className="vc-hint">
                Some engines read the vowel points properly; some choke on them.
              </span>
            </span>
          </label>

          <label className="vc-toggle">
            <input
              type="checkbox"
              checked={sayHashem}
              onChange={(e) => setSayHashem(e.target.checked)}
            />
            <span>
              Say ה׳ as &ldquo;Hashem&rdquo;
              <span className="vc-hint">
                Substitutes the Divine Name so a machine doesn&rsquo;t pronounce
                it. On by default.
              </span>
            </span>
          </label>

          <div className="vc-preview" dir="rtl" lang="he">
            {SAMPLES.map((s) => (
              <p key={s.label} className="vc-preview-line">
                {transform(s.text, stripNikkud, sayHashem)}
              </p>
            ))}
          </div>
        </div>
      </section>

      {supported === false && (
        <section className="card">
          <div className="card-main">
            <span className="card-title">No speech support</span>
            <span className="card-desc">
              This browser doesn&rsquo;t expose the Web Speech API. Try Safari on
              iPhone/iPad or Chrome on Android.
            </span>
          </div>
        </section>
      )}

      {supported && hebrew.length === 0 && (
        <section className="card">
          <div className="card-main">
            <span className="card-title">No Hebrew voice on this device</span>
            <span className="card-desc">
              On iPhone/iPad: <b>Settings → Accessibility → Spoken Content →
              Voices → Hebrew</b> and download <b>Carmit</b>. On Android, install
              the Hebrew language pack for Google Text-to-Speech. Then reopen
              this page.
            </span>
            <button
              type="button"
              className="cta cta-quiet"
              onClick={() =>
                speakingKey === "default" ? stop() : speak("default", null)
              }
            >
              {speakingKey === "default" ? "■ Stop" : "▶ Try the default voice anyway"}
            </button>
          </div>
        </section>
      )}

      {supported && hebrew.length > 0 && (
        <section className="card">
          <div className="card-main">
            <span className="card-kicker">
              {hebrew.length} Hebrew {hebrew.length === 1 ? "voice" : "voices"} on
              this device
            </span>
            <span className="card-title">Tap a voice to hear it</span>
            <div className="vc-voices">
              {hebrew.map((v) => {
                const key = `${v.name}::${v.lang}`;
                const on = speakingKey === key;
                return (
                  <div key={key} className={`vc-voice ${on ? "on" : ""}`}>
                    <span className="vc-voice-meta">
                      <b>{v.name}</b>
                      <small>
                        {v.lang}
                        {v.localService ? " · on-device" : " · network"}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="cta vc-play"
                      onClick={() => (on ? stop() : speak(key, v))}
                    >
                      {on ? "■ Stop" : "▶ Play"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="home-foot">
        Uses your device&rsquo;s built-in voices (Web Speech API) — nothing is
        sent anywhere, and the Hebrew text is already on this device. Voices are
        modern Israeli pronunciation, not Ashkenazi.
      </footer>
    </div>
  );
}
