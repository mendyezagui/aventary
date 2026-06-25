"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Camp Letter setup builder. 100% client-side — the family details and the
 * "already used" memory live only in this browser (localStorage), never on a server.
 * It assembles a personalized, paste-anywhere prompt that embeds the skill's
 * letter-writing logic + a private anti-repeat log, so anyone can run Camp Letter
 * in their own Claude or ChatGPT without installing the skill.
 */

type Sib = { name: string; age: string; about: string };
type Form = {
  childFirst: string;
  childFull: string;
  nickname: string;
  age: string;
  campEmail: string;
  startDate: string;
  endDate: string;
  team: string;
  league: string;
  hobbies: string;
  jokeStyle: string;
  senderName: string;
  tone: string;
  greeting: string;
  greetingDay: string;
  skipDay: string;
  callPolicy: string;
  alsoMention: string;
  on: Record<string, boolean>;
  siblings: Sib[];
};
type LogEntry = { id: string; joke?: string; question?: string; raw?: string };

const DEFAULTS: Form = {
  childFirst: "",
  childFull: "",
  nickname: "",
  age: "",
  campEmail: "",
  startDate: "",
  endDate: "",
  team: "",
  league: "",
  hobbies: "",
  jokeStyle: "mix",
  senderName: "",
  tone: "warm with light humor",
  greeting: "",
  greetingDay: "",
  skipDay: "",
  callPolicy: "",
  alsoMention: "",
  on: { sports: true, joke: true, sibling: true, parent: true },
  siblings: [{ name: "", age: "", about: "" }]
};

const SECTIONS = [
  { key: "sports", label: "Sports score" },
  { key: "joke", label: "Dad joke / riddle" },
  { key: "sibling", label: "Note from a sibling" },
  { key: "parent", label: "Note from you" }
] as const;

const PROFILE_KEY = "camp-letter:profile:v1";
const LOG_KEY = "camp-letter:log:v1";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function CampLetterBuilder() {
  const [f, setF] = useState<Form>(DEFAULTS);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logDraft, setLogDraft] = useState("");

  // Hydrate from this browser only (after mount, to avoid SSR mismatch).
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      if (p && typeof p === "object") setF({ ...DEFAULTS, ...p, on: { ...DEFAULTS.on, ...(p.on || {}) } });
      const l = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      if (Array.isArray(l)) setLog(l);
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) try { localStorage.setItem(PROFILE_KEY, JSON.stringify(f)); } catch {}
  }, [f, loaded]);
  useEffect(() => {
    if (loaded) try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch {}
  }, [log, loaded]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const updateSib = (i: number, patch: Partial<Sib>) =>
    set("siblings", f.siblings.map((sib, idx) => (idx === i ? { ...sib, ...patch } : sib)));

  const prompt = useMemo(() => buildPrompt(f, log), [f, log]);

  // Deep-links that open a new chat with the prompt prefilled. Long prompts can
  // exceed practical URL limits, so fall back to Copy past a safe threshold.
  const encoded = useMemo(() => encodeURIComponent(prompt), [prompt]);
  const tooLong = encoded.length > 7000;
  const claudeUrl = `https://claude.ai/new?q=${encoded}`;
  const chatgptUrl = `https://chatgpt.com/?q=${encoded}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked — the textarea is selectable as a fallback */
    }
  };

  const download = () => {
    const blob = new Blob([prompt], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `camp-letter-setup-${(f.childFirst || "child").toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remember = () => {
    const entries = parseLog(logDraft);
    if (entries.length) {
      setLog((l) => [...l, ...entries]);
      setLogDraft("");
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* FORM */}
      <div className="bg-surface p-6 md:p-8 rounded-3xl soft-lift">
        <p className="text-sm text-on-surface-variant mb-6 flex items-start gap-2">
          <span className="material-symbols-outlined text-primary text-lg">lock</span>
          Everything here is saved in <strong className="text-on-surface">this browser only</strong> —
          your family details and the no-repeat memory never touch a server. Come back any day and it
          remembers.
        </p>

        <Group title="Your child">
          <Field label="First name">
            <input className={inputCls} value={f.childFirst} onChange={(e) => set("childFirst", e.target.value)} placeholder="Eli" />
          </Field>
          <Field label="Full name (for the email subject)" hint="Most camps sort printed letters by full name.">
            <input className={inputCls} value={f.childFull} onChange={(e) => set("childFull", e.target.value)} placeholder="Eli Klein" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nickname (optional)">
              <input className={inputCls} value={f.nickname} onChange={(e) => set("nickname", e.target.value)} placeholder="Eli-bear" />
            </Field>
            <Field label="Age">
              <input className={inputCls} value={f.age} onChange={(e) => set("age", e.target.value)} placeholder="9" inputMode="numeric" />
            </Field>
          </div>
        </Group>

        <Group title="Camp">
          <Field label="Camp email (where letters are sent)">
            <input className={inputCls} value={f.campEmail} onChange={(e) => set("campEmail", e.target.value)} placeholder="camper@yourcamp.com" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input type="date" className={inputCls} value={f.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            <Field label="End date">
              <input type="date" className={inputCls} value={f.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </Field>
          </div>
        </Group>

        <Group title="What makes it fun">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Favorite team (optional)">
              <input className={inputCls} value={f.team} onChange={(e) => set("team", e.target.value)} placeholder="Yankees" />
            </Field>
            <Field label="Sport / league">
              <input className={inputCls} value={f.league} onChange={(e) => set("league", e.target.value)} placeholder="MLB" />
            </Field>
          </div>
          <Field label="Hobbies & favorite things">
            <input className={inputCls} value={f.hobbies} onChange={(e) => set("hobbies", e.target.value)} placeholder="Legos, drawing, dinosaurs, pizza" />
          </Field>
          <Field label="Joke style">
            <select className={inputCls} value={f.jokeStyle} onChange={(e) => set("jokeStyle", e.target.value)}>
              <option value="mix">A mix</option>
              <option value="dad jokes">Dad jokes</option>
              <option value="riddles">Riddles</option>
            </select>
          </Field>
        </Group>

        <Group title="The family voice">
          <div className="grid grid-cols-2 gap-3">
            <Field label="How your child addresses you">
              <input className={inputCls} value={f.senderName} onChange={(e) => set("senderName", e.target.value)} placeholder="Dad" />
            </Field>
            <Field label="Tone">
              <select className={inputCls} value={f.tone} onChange={(e) => set("tone", e.target.value)}>
                <option value="warm with light humor">Warm with light humor</option>
                <option value="sweeter and gentler">Sweeter and gentler</option>
                <option value="sillier, more jokes">Sillier, more jokes</option>
                <option value="more banter and hype">More banter and hype</option>
              </select>
            </Field>
          </div>

          <Field label="Siblings to include (optional)" hint="Their little notes get written in their own voice.">
            <div className="space-y-2">
              {f.siblings.map((sib, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-start">
                  <div className="grid grid-cols-3 gap-2">
                    <input className={inputCls} value={sib.name} onChange={(e) => updateSib(i, { name: e.target.value })} placeholder="Name" />
                    <input className={inputCls} value={sib.age} onChange={(e) => updateSib(i, { age: e.target.value })} placeholder="Age" inputMode="numeric" />
                    <input className={inputCls} value={sib.about} onChange={(e) => updateSib(i, { about: e.target.value })} placeholder="silly, loves crowns" />
                  </div>
                  <button
                    type="button"
                    onClick={() => set("siblings", f.siblings.length > 1 ? f.siblings.filter((_, idx) => idx !== i) : f.siblings)}
                    className="material-symbols-outlined text-on-surface-variant hover:text-error p-1.5"
                    aria-label="Remove sibling"
                  >
                    close
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set("siblings", [...f.siblings, { name: "", age: "", about: "" }])}
                className="text-sm text-primary font-label font-bold inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">add</span> Add a sibling
              </button>
            </div>
          </Field>
        </Group>

        <Group title="Extras (all optional)">
          <div className="grid grid-cols-2 gap-3">
            <Field label="A recurring weekly greeting">
              <input className={inputCls} value={f.greeting} onChange={(e) => set("greeting", e.target.value)} placeholder="Happy Friday!" />
            </Field>
            <Field label="…on which day">
              <input className={inputCls} value={f.greetingDay} onChange={(e) => set("greetingDay", e.target.value)} placeholder="Friday" />
            </Field>
          </div>
          <Field label="A day with no letter">
            <input className={inputCls} value={f.skipDay} onChange={(e) => set("skipDay", e.target.value)} placeholder="Saturday" />
          </Field>
          <Field label="Call policy">
            <input className={inputCls} value={f.callPolicy} onChange={(e) => set("callPolicy", e.target.value)} placeholder="Camp calls once a week" />
          </Field>
          <Field label="Anything else to mention" hint="A pet, grandparents, a baby at home, an inside joke.">
            <input className={inputCls} value={f.alsoMention} onChange={(e) => set("alsoMention", e.target.value)} placeholder="Our dog Rocky misses you!" />
          </Field>
        </Group>

        <Group title="Sections to include">
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => set("on", { ...f.on, [s.key]: !f.on[s.key] })}
                className={`px-4 py-2 rounded-full font-label text-sm border transition-colors ${
                  f.on[s.key]
                    ? "bg-primary-fixed text-on-primary-fixed border-transparent"
                    : "bg-surface text-on-surface-variant border-outline-variant"
                }`}
              >
                {f.on[s.key] ? "✓ " : ""}
                {s.label}
              </button>
            ))}
          </div>
        </Group>
      </div>

      {/* OUTPUT */}
      <div className="lg:sticky lg:top-24 self-start space-y-6">
        <div className="bg-surface-container-highest p-6 md:p-7 rounded-3xl soft-lift">
          <div className="flex items-center justify-between mb-3 gap-3">
            <h3 className="font-headline text-lg font-bold">Your prompt</h3>
            <div className="flex gap-2">
              <button
                onClick={copy}
                className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-full font-label font-bold text-sm"
              >
                <span className="material-symbols-outlined text-base">{copied ? "check" : "content_copy"}</span>
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={download}
                className="inline-flex items-center gap-1.5 bg-surface text-on-surface px-4 py-2 rounded-full font-label font-bold text-sm soft-lift"
                aria-label="Download as Markdown"
              >
                <span className="material-symbols-outlined text-base">download</span>
              </button>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant mb-3">
            Paste this into a new chat in <strong className="text-on-surface">Claude</strong> or{" "}
            <strong className="text-on-surface">ChatGPT</strong> — then each morning say
            &ldquo;write today&apos;s letter.&rdquo; Saving it as a Project / Custom GPT keeps it
            handy all summer.
          </p>
          <textarea
            readOnly
            value={prompt}
            onFocus={(e) => e.target.select()}
            className="w-full h-[24rem] bg-surface text-on-surface text-xs leading-relaxed font-mono p-4 rounded-2xl border border-outline-variant resize-none"
          />

          <div className="mt-4">
            <div className="font-label text-xs tracking-widest uppercase text-on-surface-variant mb-2">
              Or open it prefilled
            </div>
            {tooLong ? (
              <p className="text-sm text-on-surface-variant">
                Your prompt&apos;s a bit long for a one-click link — hit{" "}
                <strong className="text-on-surface">Copy</strong> above and paste it into a
                new chat instead.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                <a
                  href={claudeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label font-bold text-sm"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Open in Claude
                </a>
                <a
                  href={chatgptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-surface text-on-surface px-5 py-2.5 rounded-full font-label font-bold text-sm soft-lift"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Open in ChatGPT
                </a>
              </div>
            )}
            <p className="text-xs text-on-surface-variant mt-2">
              Opens a new chat with everything filled in. Sign in if asked, then send.
            </p>
          </div>
        </div>

        {/* MEMORY — the private "already sent" repository */}
        <div className="bg-surface-container-highest p-6 md:p-7 rounded-3xl soft-lift">
          <div className="flex items-center justify-between mb-2 gap-3">
            <h3 className="font-headline text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history_edu</span>
              No-repeat memory
            </h3>
            <span className="font-label text-xs text-on-surface-variant">
              {log.length} logged
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mb-3">
            After each letter, paste it back here (or just its <code className="text-primary">LOG:</code> line).
            The builder remembers every joke and question so future prompts say
            &ldquo;never repeat these.&rdquo; Stored only in this browser.
          </p>
          <textarea
            value={logDraft}
            onChange={(e) => setLogDraft(e.target.value)}
            placeholder={'Paste the letter or its LOG line, e.g.\nLOG: joke="Why did the baseball player bring string? To tie the score!"; question="how is your bunk?"'}
            className="w-full h-24 bg-surface text-on-surface text-xs leading-relaxed p-3 rounded-2xl border border-outline-variant resize-none mb-3"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={remember}
              disabled={!logDraft.trim()}
              className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-full font-label font-bold text-sm disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-base">bookmark_add</span>
              Add to memory
            </button>
            {log.length > 0 && (
              <button
                onClick={() => { if (confirm("Clear the no-repeat memory for this child?")) setLog([]); }}
                className="text-sm text-on-surface-variant hover:text-error font-label"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- memory parsing ---------- */

function parseLog(text: string): LogEntry[] {
  const out: LogEntry[] = [];
  const logLines = text.match(/LOG:[^\n]*/gi);
  if (logLines) {
    for (const line of logLines) {
      const joke = (line.match(/joke\s*=\s*["“]([^"”]*)["”]/i) || [])[1];
      const question = (line.match(/question\s*=\s*["“]([^"”]*)["”]/i) || [])[1];
      if (joke || question) out.push({ id: uid(), joke, question });
    }
  }
  // No structured LOG line? Store a trimmed snapshot so it's still "seen".
  if (!out.length && text.trim()) out.push({ id: uid(), raw: text.trim().slice(0, 500) });
  return out;
}

/* ---------- prompt assembly ---------- */

function buildPrompt(f: Form, log: LogEntry[]): string {
  const child = f.childFirst || "my child";
  const callName = f.nickname || f.childFirst || "them";
  const sender = f.senderName || "me";
  const sibs = f.siblings.filter((s) => s.name.trim());

  const profileLines: string[] = [
    `- Child: ${f.childFull || child}${f.nickname ? ` (call them "${f.nickname}")` : ""}${f.age ? `, age ${f.age}` : ""}`,
    f.campEmail ? `- Camp email: ${f.campEmail}` : "",
    `- Email subject line: ${f.childFull || "the child's full name"} (camps sort printed letters by full name)`,
    f.startDate || f.endDate ? `- Camp dates: ${f.startDate || "?"} to ${f.endDate || "?"}` : "",
    f.team && f.on.sports ? `- Favorite team: ${f.team}${f.league ? ` (${f.league})` : ""}` : "",
    f.hobbies ? `- Hobbies & favorite things: ${f.hobbies}` : "",
    `- Joke style: ${f.jokeStyle}`,
    `- I sign letters as: ${sender}`,
    `- Tone: ${f.tone}`,
    sibs.length
      ? `- Siblings: ${sibs.map((s) => `${s.name}${s.age ? ` (${s.age})` : ""}${s.about ? ` — ${s.about}` : ""}`).join("; ")}`
      : "",
    f.greeting ? `- Weekly greeting: include "${f.greeting}"${f.greetingDay ? ` on ${f.greetingDay}` : ""}` : "",
    f.skipDay ? `- No letter on: ${f.skipDay}` : "",
    f.callPolicy ? `- Call policy: ${f.callPolicy}` : "",
    f.alsoMention ? `- Also mention sometimes: ${f.alsoMention}` : ""
  ].filter(Boolean);

  const steps: string[] = [];
  let n = 1;
  steps.push(
    `${n++}. **Greeting** — open warm, use ${callName} and the day of camp (Day N, counting from the start date).${
      f.greeting ? ` If today is ${f.greetingDay || "the set day"}, include "${f.greeting}".` : ""
    }`
  );
  if (f.on.sports && f.team)
    steps.push(
      `${n++}. **Sports Corner** — ${f.team}'s most recent finished game: score, opponent, one fun detail, then 2–4 sentences of kid-level banter (hype a win, stay encouraging on a loss). Never invent a score — if you can't look it up, ask me or skip this part.`
    );
  if (f.on.joke)
    steps.push(
      `${n++}. **Joke of the Day** — one clean ${f.jokeStyle === "mix" ? "dad joke or riddle" : f.jokeStyle.replace(/s$/, "")}. Put any riddle answer on the very last line.`
    );
  if (f.on.sibling && sibs.length)
    steps.push(
      `${n++}. **A note from a sibling** — a few sentences in the voice of one of: ${sibs.map((s) => s.name).join(", ")}. Rotate who writes and what they "did" that day.`
    );
  if (f.on.parent)
    steps.push(
      `${n++}. **A note from ${sender}** — something real, then ONE or two questions that fit the camp phase (never a quiz).${
        f.callPolicy ? " Add a soft nudge about our call when it fits." : ""
      } Sign off lovingly as "${sender}".`
    );

  const used = log.slice(-40);
  const memoryBlock = used.length
    ? `\n=== ALREADY USED — NEVER REPEAT THESE ===
Do not reuse any joke, riddle, or question below in today's letter:
${used
  .map((e) =>
    e.joke || e.question
      ? `- ${[e.joke && `joke: ${e.joke}`, e.question && `question: ${e.question}`].filter(Boolean).join(" · ")}`
      : `- ${e.raw}`
  )
  .join("\n")}
`
    : "";

  return `You are my "Camp Letter" assistant. When I say "write today's letter," produce ONE short, warm, printable daily letter to ${child} at sleepaway camp — the kind they'll happily read out loud at lunch.

=== MY FAMILY PROFILE ===
${profileLines.join("\n")}

=== HOW TO WRITE EACH LETTER ===
${steps.join("\n")}

Camp phase steers my note: Week 1 = settling in (bunk, counselor, first friends, food, gentle homesick check); mid-summer = trips, activities, friendships, favorite moments; final ~5 days = countdown, what they'll miss, almost home.

=== RULES ===
- Plain text only. Short paragraphs, one page, no attachments — camps print these and hand them out at a meal.
- 100% clean and age-appropriate${f.age ? `; match the vocabulary to a ${f.age}-year-old` : ""}.
- Acknowledge missing them, but keep it upbeat and forward-looking — don't amplify homesickness.
- For the sibling note and my note, give me a short FIRST DRAFT as a starting point I can edit — not a finished final.
- NEVER repeat a joke, riddle, or question you've used before (see the list below, and anything earlier in this chat).${
    f.skipDay ? `\n- If today is ${f.skipDay}, there's no letter — just tell me.` : ""
  }
${memoryBlock}
=== KEEP A MEMORY (important) ===
At the very end of every letter, add ONE line in exactly this format so I can track what's been used:
LOG: joke="<the joke or riddle you used>"; question="<the main question you asked>"
I save these between days so you never repeat yourself.

=== DELIVERY ===
- If you have Gmail/email tools available, save the letter as a DRAFT${
    f.campEmail ? ` to ${f.campEmail}` : ""
  } with the subject set to ${f.childFull || "my child's full name"}, then tell me it's ready to review. Never send without me.
- If you don't have email tools (e.g. ChatGPT), just output the letter as plain text for me to copy into my own email.

To start: confirm you've got my profile, then I'll say "write today's letter" each morning. When I mention something new — a counselor's name, a new friend, a trip — remember it for future letters.`;
}

/* ---------- small presentational helpers ---------- */

const inputCls =
  "w-full bg-surface text-on-surface text-sm px-3 py-2 rounded-lg border border-outline-variant focus:border-primary focus:outline-none placeholder:text-on-surface-variant/50";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="font-label font-bold text-xs tracking-widest uppercase text-primary mb-3">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-on-surface mb-1">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-on-surface-variant mt-1">{hint}</span> : null}
    </label>
  );
}
