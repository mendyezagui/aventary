"use client";

import { useMemo, useState } from "react";

/**
 * Camp Letter setup builder. 100% client-side — the family details entered here
 * never leave the browser. It assembles a personalized, paste-anywhere prompt that
 * embeds the skill's letter-writing logic, so anyone can run Camp Letter in their
 * own Claude or ChatGPT without installing the skill.
 */

type Sib = { name: string; age: string; about: string };

const SECTIONS = [
  { key: "sports", label: "Sports score" },
  { key: "joke", label: "Dad joke / riddle" },
  { key: "sibling", label: "Note from a sibling" },
  { key: "parent", label: "Note from you" }
] as const;

export function CampLetterBuilder() {
  const [childFirst, setChildFirst] = useState("");
  const [childFull, setChildFull] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [campEmail, setCampEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [team, setTeam] = useState("");
  const [league, setLeague] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [jokeStyle, setJokeStyle] = useState("mix");
  const [senderName, setSenderName] = useState("");
  const [tone, setTone] = useState("warm with light humor");
  const [siblings, setSiblings] = useState<Sib[]>([{ name: "", age: "", about: "" }]);
  const [greeting, setGreeting] = useState("");
  const [greetingDay, setGreetingDay] = useState("");
  const [skipDay, setSkipDay] = useState("");
  const [callPolicy, setCallPolicy] = useState("");
  const [alsoMention, setAlsoMention] = useState("");
  const [on, setOn] = useState<Record<string, boolean>>({
    sports: true,
    joke: true,
    sibling: true,
    parent: true
  });
  const [copied, setCopied] = useState(false);

  const updateSib = (i: number, patch: Partial<Sib>) =>
    setSiblings((s) => s.map((sib, idx) => (idx === i ? { ...sib, ...patch } : sib)));

  const prompt = useMemo(
    () =>
      buildPrompt({
        childFirst,
        childFull,
        nickname,
        age,
        campEmail,
        startDate,
        endDate,
        team,
        league,
        hobbies,
        jokeStyle,
        senderName,
        tone,
        siblings,
        greeting,
        greetingDay,
        skipDay,
        callPolicy,
        alsoMention,
        on
      }),
    [
      childFirst,
      childFull,
      nickname,
      age,
      campEmail,
      startDate,
      endDate,
      team,
      league,
      hobbies,
      jokeStyle,
      senderName,
      tone,
      siblings,
      greeting,
      greetingDay,
      skipDay,
      callPolicy,
      alsoMention,
      on
    ]
  );

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
    a.download = `camp-letter-setup-${(childFirst || "child").toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* FORM */}
      <div className="bg-surface p-6 md:p-8 rounded-3xl soft-lift">
        <p className="text-sm text-on-surface-variant mb-6 flex items-start gap-2">
          <span className="material-symbols-outlined text-primary text-lg">lock</span>
          Everything here stays in your browser — nothing is sent or saved anywhere.
          Fill in what you like; blanks are simply skipped.
        </p>

        <Group title="Your child">
          <Field label="First name">
            <input className={inputCls} value={childFirst} onChange={(e) => setChildFirst(e.target.value)} placeholder="Eli" />
          </Field>
          <Field label="Full name (for the email subject)" hint="Most camps sort printed letters by full name.">
            <input className={inputCls} value={childFull} onChange={(e) => setChildFull(e.target.value)} placeholder="Eli Klein" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nickname (optional)">
              <input className={inputCls} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Eli-bear" />
            </Field>
            <Field label="Age">
              <input className={inputCls} value={age} onChange={(e) => setAge(e.target.value)} placeholder="9" inputMode="numeric" />
            </Field>
          </div>
        </Group>

        <Group title="Camp">
          <Field label="Camp email (where letters are sent)">
            <input className={inputCls} value={campEmail} onChange={(e) => setCampEmail(e.target.value)} placeholder="camper@yourcamp.com" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="End date">
              <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>
        </Group>

        <Group title="What makes it fun">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Favorite team (optional)">
              <input className={inputCls} value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Yankees" />
            </Field>
            <Field label="Sport / league">
              <input className={inputCls} value={league} onChange={(e) => setLeague(e.target.value)} placeholder="MLB" />
            </Field>
          </div>
          <Field label="Hobbies & favorite things">
            <input className={inputCls} value={hobbies} onChange={(e) => setHobbies(e.target.value)} placeholder="Legos, drawing, dinosaurs, pizza" />
          </Field>
          <Field label="Joke style">
            <select className={inputCls} value={jokeStyle} onChange={(e) => setJokeStyle(e.target.value)}>
              <option value="mix">A mix</option>
              <option value="dad jokes">Dad jokes</option>
              <option value="riddles">Riddles</option>
            </select>
          </Field>
        </Group>

        <Group title="The family voice">
          <div className="grid grid-cols-2 gap-3">
            <Field label="How your child addresses you">
              <input className={inputCls} value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Dad" />
            </Field>
            <Field label="Tone">
              <select className={inputCls} value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="warm with light humor">Warm with light humor</option>
                <option value="sweeter and gentler">Sweeter and gentler</option>
                <option value="sillier, more jokes">Sillier, more jokes</option>
                <option value="more banter and hype">More banter and hype</option>
              </select>
            </Field>
          </div>

          <Field label="Siblings to include (optional)" hint="Their little notes get written in their own voice.">
            <div className="space-y-2">
              {siblings.map((sib, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-start">
                  <div className="grid grid-cols-3 gap-2">
                    <input className={inputCls} value={sib.name} onChange={(e) => updateSib(i, { name: e.target.value })} placeholder="Name" />
                    <input className={inputCls} value={sib.age} onChange={(e) => updateSib(i, { age: e.target.value })} placeholder="Age" inputMode="numeric" />
                    <input className={inputCls} value={sib.about} onChange={(e) => updateSib(i, { about: e.target.value })} placeholder="silly, loves crowns" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSiblings((s) => (s.length > 1 ? s.filter((_, idx) => idx !== i) : s))}
                    className="material-symbols-outlined text-on-surface-variant hover:text-error p-1.5"
                    aria-label="Remove sibling"
                  >
                    close
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSiblings((s) => [...s, { name: "", age: "", about: "" }])}
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
              <input className={inputCls} value={greeting} onChange={(e) => setGreeting(e.target.value)} placeholder="Happy Friday!" />
            </Field>
            <Field label="…on which day">
              <input className={inputCls} value={greetingDay} onChange={(e) => setGreetingDay(e.target.value)} placeholder="Friday" />
            </Field>
          </div>
          <Field label="A day with no letter">
            <input className={inputCls} value={skipDay} onChange={(e) => setSkipDay(e.target.value)} placeholder="Saturday" />
          </Field>
          <Field label="Call policy">
            <input className={inputCls} value={callPolicy} onChange={(e) => setCallPolicy(e.target.value)} placeholder="Camp calls once a week" />
          </Field>
          <Field label="Anything else to mention" hint="A pet, grandparents, a baby at home, an inside joke.">
            <input className={inputCls} value={alsoMention} onChange={(e) => setAlsoMention(e.target.value)} placeholder="Our dog Rocky misses you!" />
          </Field>
        </Group>

        <Group title="Sections to include">
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setOn((o) => ({ ...o, [s.key]: !o[s.key] }))}
                className={`px-4 py-2 rounded-full font-label text-sm border transition-colors ${
                  on[s.key]
                    ? "bg-primary-fixed text-on-primary-fixed border-transparent"
                    : "bg-surface text-on-surface-variant border-outline-variant"
                }`}
              >
                {on[s.key] ? "✓ " : ""}
                {s.label}
              </button>
            ))}
          </div>
        </Group>
      </div>

      {/* OUTPUT */}
      <div className="lg:sticky lg:top-24 self-start">
        <div className="bg-surface-container-highest p-6 md:p-7 rounded-3xl soft-lift">
          <div className="flex items-center justify-between mb-3 gap-3">
            <h3 className="font-headline text-lg font-bold">Your setup prompt</h3>
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
            <strong className="text-on-surface">ChatGPT</strong>. Then each morning just say
            &ldquo;write today&apos;s letter.&rdquo;
          </p>
          <textarea
            readOnly
            value={prompt}
            onFocus={(e) => e.target.select()}
            className="w-full h-[26rem] bg-surface text-on-surface text-xs leading-relaxed font-mono p-4 rounded-2xl border border-outline-variant resize-none"
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- prompt assembly ---------- */

type Profile = {
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
  siblings: Sib[];
  greeting: string;
  greetingDay: string;
  skipDay: string;
  callPolicy: string;
  alsoMention: string;
  on: Record<string, boolean>;
};

function buildPrompt(p: Profile): string {
  const child = p.childFirst || "my child";
  const callName = p.nickname || p.childFirst || "them";
  const sender = p.senderName || "me";
  const sibs = p.siblings.filter((s) => s.name.trim());

  const profileLines: string[] = [
    `- Child: ${p.childFull || child}${p.nickname ? ` (call them "${p.nickname}")` : ""}${p.age ? `, age ${p.age}` : ""}`,
    p.campEmail ? `- Camp email: ${p.campEmail}` : "",
    `- Email subject line: ${p.childFull || "the child's full name"} (camps sort printed letters by full name)`,
    p.startDate || p.endDate ? `- Camp dates: ${p.startDate || "?"} to ${p.endDate || "?"}` : "",
    p.team && p.on.sports ? `- Favorite team: ${p.team}${p.league ? ` (${p.league})` : ""}` : "",
    p.hobbies ? `- Hobbies & favorite things: ${p.hobbies}` : "",
    `- Joke style: ${p.jokeStyle}`,
    `- I sign letters as: ${sender}`,
    `- Tone: ${p.tone}`,
    sibs.length
      ? `- Siblings: ${sibs.map((s) => `${s.name}${s.age ? ` (${s.age})` : ""}${s.about ? ` — ${s.about}` : ""}`).join("; ")}`
      : "",
    p.greeting ? `- Weekly greeting: include "${p.greeting}"${p.greetingDay ? ` on ${p.greetingDay}` : ""}` : "",
    p.skipDay ? `- No letter on: ${p.skipDay}` : "",
    p.callPolicy ? `- Call policy: ${p.callPolicy}` : "",
    p.alsoMention ? `- Also mention sometimes: ${p.alsoMention}` : ""
  ].filter(Boolean);

  const steps: string[] = [];
  let n = 1;
  steps.push(
    `${n++}. **Greeting** — open warm, use ${callName} and the day of camp (Day N, counting from the start date).${
      p.greeting ? ` If today is ${p.greetingDay || "the set day"}, include "${p.greeting}".` : ""
    }`
  );
  if (p.on.sports && p.team)
    steps.push(
      `${n++}. **Sports Corner** — ${p.team}'s most recent finished game: score, opponent, one fun detail, then 2–4 sentences of kid-level banter (hype a win, stay encouraging on a loss). Never invent a score — if you can't look it up, ask me or skip this part.`
    );
  if (p.on.joke)
    steps.push(
      `${n++}. **Joke of the Day** — one clean ${p.jokeStyle === "mix" ? "dad joke or riddle" : p.jokeStyle.replace(/s$/, "")}. Put any riddle answer on the very last line.`
    );
  if (p.on.sibling && sibs.length)
    steps.push(
      `${n++}. **A note from a sibling** — a few sentences in the voice of one of: ${sibs
        .map((s) => s.name)
        .join(", ")}. Rotate who writes and what they "did" that day.`
    );
  if (p.on.parent)
    steps.push(
      `${n++}. **A note from ${sender}** — something real, then ONE or two questions that fit the camp phase (never a quiz).${
        p.callPolicy ? " Add a soft nudge about our call when it fits." : ""
      } Sign off lovingly as "${sender}".`
    );

  return `You are my "Camp Letter" assistant. When I say "write today's letter," produce ONE short, warm, printable daily letter to ${child} at sleepaway camp — the kind they'll happily read out loud at lunch.

=== MY FAMILY PROFILE ===
${profileLines.join("\n")}

=== HOW TO WRITE EACH LETTER ===
${steps.join("\n")}

Camp phase steers my note: Week 1 = settling in (bunk, counselor, first friends, food, gentle homesick check); mid-summer = trips, activities, friendships, favorite moments; final ~5 days = countdown, what they'll miss, almost home.

=== RULES ===
- Plain text only. Short paragraphs, one page, no attachments — camps print these and hand them out at a meal.
- 100% clean and age-appropriate${p.age ? `; match the vocabulary to a ${p.age}-year-old` : ""}.
- Acknowledge missing them, but keep it upbeat and forward-looking — don't amplify homesickness.
- NEVER repeat a joke, riddle, or question you've already used. Before writing, look back at the letters earlier in this chat (or that I paste in) and avoid reusing anything.${
    p.skipDay ? `\n- If today is ${p.skipDay}, there's no letter — just tell me.` : ""
  }

=== DELIVERY ===
- If you have Gmail/email tools available, save the letter as a DRAFT${
    p.campEmail ? ` to ${p.campEmail}` : ""
  } with the subject set to ${p.childFull || "my child's full name"}, then tell me it's ready to review. Never send without me.
- If you don't have email tools (e.g. ChatGPT), just output the letter as plain text for me to copy into my own email.

To start: confirm you've got my profile, then I'll say "write today's letter" each morning. Tip: if you can save this as a Project (Claude) or a Custom GPT (ChatGPT), keep this profile as the instructions so it remembers between days. When I mention something new — a counselor's name, a new friend, a trip — remember it for future letters.`;
}

/* ---------- small presentational helpers ---------- */

const inputCls =
  "w-full bg-surface text-on-surface text-sm px-3 py-2 rounded-lg border border-outline-variant focus:border-primary focus:outline-none placeholder:text-on-surface-variant/50";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="font-label font-bold text-xs tracking-widest uppercase text-primary mb-3">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-on-surface mb-1">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-on-surface-variant mt-1">{hint}</span> : null}
    </label>
  );
}
