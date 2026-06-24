import Link from "next/link";
import { CampLetterBuilder } from "@/components/CampLetterBuilder";

export const revalidate = 3600;

const PAGE_URL = "https://www.aventary.com/camp-letter";
const TITLE = "Camp Letter — a daily note to your kid, written for you | Aventary";
const DESCRIPTION =
  "A free Claude skill that writes a warm, personalized letter to your child at sleepaway camp every day — yesterday's ballgame, a dad joke, a note from a sibling, and a real message from you. A free build from Aventary Lab.";

export const metadata = {
  title: "Camp Letter",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "article" as const,
    url: PAGE_URL,
    siteName: "Aventary",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: DESCRIPTION
  }
};

const SKILL_HREF = "/downloads/camp-letter.skill";

const INGREDIENTS = [
  {
    icon: "sports_baseball",
    title: "The game",
    body:
      "Their team's latest score, with trash-talk-lite they'll repeat to the whole bunk."
  },
  {
    icon: "sentiment_very_satisfied",
    title: "The joke",
    body: "A clean dad joke or riddle — never the same one twice in two weeks."
  },
  {
    icon: "favorite",
    title: "The sibling",
    body:
      "A few sweet lines in your little one's voice. You set their name and personality."
  },
  {
    icon: "edit_note",
    title: "You",
    body:
      "A real note, with one or two questions that fit where they are in the summer."
  }
];

const STEPS = [
  {
    num: "01",
    icon: "edit_note",
    title: "Describe your family",
    body:
      "Fill in the quick form below — your child, the camp email, their team, who's writing, any siblings. It all stays in your browser."
  },
  {
    num: "02",
    icon: "content_copy",
    title: "Copy your prompt",
    body:
      "One tap copies a personalized setup prompt, built from your answers. No account, no install."
  },
  {
    num: "03",
    icon: "forum",
    title: "Paste into Claude or ChatGPT",
    body:
      "Start a new chat and paste it in. Tip: save it as a Project or Custom GPT so it remembers between days."
  },
  {
    num: "04",
    icon: "bolt",
    title: "Say “write today's letter”",
    body:
      "Each morning, one line. Review the draft, tweak it, send it. Nothing goes out without you."
  }
];

const STICK = [
  {
    icon: "auto_awesome",
    tool: "In Claude",
    how: "Save it as a Project",
    steps: [
      "Open Claude → Projects → new project, name it “Camp Letters — [child].”",
      "Paste your prompt into the project's instructions.",
      "Each morning, open the project, start a chat, and say “write today's letter.”"
    ],
    note: "Turn on the Google/Gmail connector and it can drop the letter straight into your drafts."
  },
  {
    icon: "smart_toy",
    tool: "In ChatGPT",
    how: "Save it as a Custom GPT",
    steps: [
      "ChatGPT → Explore GPTs → Create (or use a Project).",
      "Paste your prompt into the Instructions, keep it private.",
      "Open it each morning and say “write today's letter.”"
    ],
    note: "ChatGPT's Tasks can even nudge you at the same time each day to run it."
  }
];

const RUN_MODES = [
  {
    icon: "chat",
    title: "Chat mode",
    where: "Claude or ChatGPT · any phone, free",
    points: [
      "Paste your prompt into a new chat — save it as a Project (Claude) or Custom GPT (ChatGPT) so it sticks all summer.",
      "Each morning, say “write today's letter,” then copy it into your email.",
      "Log each letter back into the builder above so it never repeats a joke or question.",
      "Nothing to install. Works on the bus, in the carpool line, anywhere."
    ]
  },
  {
    icon: "smart_toy",
    title: "Auto mode",
    where: "Cowork or Claude Code · hands-off",
    points: [
      "Install the skill and connect your email — it drafts the letter straight into your inbox.",
      "It pulls last night's real score and keeps its own log file, so no-repeats are automatic.",
      "You just open your drafts, glance, and hit send.",
      "Best if you want it to mostly run itself each day."
    ]
  }
];

export default function CampLetterPage() {
  return (
    <>
      {/* HERO */}
      <section className="px-8 pt-24 pb-12">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label text-sm mb-8">
              <span className="material-symbols-outlined text-base">science</span>
              A free build from Aventary Lab
            </div>
            <h1 className="font-headline text-5xl md:text-7xl font-bold editorial-gap leading-[1.05] mb-8">
              A daily letter to your kid at camp,{" "}
              <span className="text-primary italic">written for you</span>.
            </h1>
            <p className="text-xl text-on-surface-variant max-w-xl mb-4">
              Set it up once. Then every morning, one sentence turns into a real
              letter your child can&apos;t wait to read at lunch.
            </p>
            <p className="text-lg text-on-surface-variant max-w-xl mb-10">
              Yesterday&apos;s ballgame with bunk-worthy banter, a dad joke, a note
              from a little sibling, and a message from you — fresh every day, never
              the same twice.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <Link
                href="#build"
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-bold"
              >
                Build my setup
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center gap-2 bg-surface-container-lowest text-on-surface px-6 py-3 rounded-full font-bold soft-lift"
              >
                How it works
              </Link>
              <span className="text-sm text-on-surface-variant">
                Free · works in Claude or ChatGPT
              </span>
            </div>
          </div>

          {/* The signature: a printed camp letter on the lunch table */}
          <div className="flex justify-center lg:justify-end">
            <div className="bg-surface-container-lowest soft-lift rounded-2xl p-7 md:p-8 max-w-sm w-full rotate-[-1.5deg]">
              <div className="font-label text-xs text-on-surface-variant border-b border-outline-variant pb-3 mb-4 leading-relaxed">
                <span className="text-on-surface font-bold">To:</span>{" "}
                camper@yourcamp.com
                <br />
                <span className="text-on-surface font-bold">Subject:</span> Eli Klein
              </div>
              <div className="font-headline text-2xl font-bold mb-3">Hey Eli!!</div>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                Day 5 already — you&apos;ve got your bunk, your counselor, and you know
                which lunch to show up early for. So proud of you!
              </p>
              <LetterSection
                icon="sports_baseball"
                label="Sports Corner"
                body="Walk-off win, 4–3 in the 9th! Tell your bunk the good guys don't quit. 😎"
              />
              <LetterSection
                icon="sentiment_very_satisfied"
                label="Joke of the Day"
                body="Why'd the player bring string to the game? To tie the score!"
              />
              <LetterSection
                icon="favorite"
                label="From Goldie"
                body="Eli!!! I miss you a MILLION. I made you a purple crown. Come home soon!! 💜"
              />
              <LetterSection
                icon="edit_note"
                label="From Dad"
                body="Thinking of you all day. How's your bunk — is your counselor cool? Counting down to our call!"
              />
              <div className="font-headline italic text-on-surface mt-4">
                Love, Dad
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INGREDIENTS */}
      <section className="px-8 py-20 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
            What&apos;s inside every letter
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-6 max-w-2xl">
            Four ingredients a kid actually wants to read
            <span className="text-primary italic">.</span>
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {INGREDIENTS.map((it) => (
              <div key={it.title} className="bg-surface p-7 rounded-3xl soft-lift">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-container mb-5">
                  <span className="material-symbols-outlined text-on-primary-container">
                    {it.icon}
                  </span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-2">{it.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  {it.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-surface p-6 md:p-7 rounded-3xl soft-lift border-l-4 border-primary max-w-3xl">
            <p className="text-on-surface-variant leading-relaxed">
              The part that makes it feel alive: it keeps a{" "}
              <strong className="text-on-surface">private log of every letter</strong> — so
              it never recycles a joke or asks the same question twice, and the themes
              shift as camp goes on, from &ldquo;settling in&rdquo; to &ldquo;what trip
              is next?&rdquo; to &ldquo;almost home.&rdquo; That memory lives on your
              device (or in the skill&apos;s own log file) — never on our servers.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-8 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
            How it works
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-6 max-w-2xl">
            Two minutes to set up. Ten seconds a day after that
            <span className="text-primary italic">.</span>
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className="bg-surface-container-lowest p-7 rounded-3xl soft-lift"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed font-label font-bold text-sm">
                    {s.num}
                  </span>
                  <span className="material-symbols-outlined text-primary">
                    {s.icon}
                  </span>
                </div>
                <h3 className="font-headline text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          <p className="text-on-surface-variant mt-12 pt-6 border-t border-outline-variant max-w-3xl">
            <strong className="text-on-surface">You&apos;ll need:</strong> a free Claude or
            ChatGPT account. In Claude with Gmail connected it can drop the letter straight
            into your drafts; anywhere else it writes the letter for you to copy into your
            own email. Your family details never leave your device.
          </p>
        </div>
      </section>

      {/* BUILDER */}
      <section id="build" className="px-8 py-24 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
            Build your setup
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-6 max-w-2xl">
            Tell it about your family. Get a prompt you can paste anywhere
            <span className="text-primary italic">.</span>
          </h2>
          <p className="text-lg text-on-surface-variant max-w-3xl mb-12">
            Fill in as much as you like below — it builds a personalized prompt on the
            right. Copy it into Claude or ChatGPT and you&apos;re running. No skill to
            install, no account with us, nothing saved on our end.
          </p>

          <CampLetterBuilder />

          <div className="mt-10 bg-surface p-6 md:p-7 rounded-3xl soft-lift max-w-3xl flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
            <div>
              <h3 className="font-headline text-lg font-bold mb-1">
                Prefer Claude on a computer?
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Install the packaged skill instead — it saves your profile to a file and
                runs every day with one sentence.
              </p>
            </div>
            <a
              href={SKILL_HREF}
              download
              className="shrink-0 inline-flex items-center gap-2 bg-surface-container-highest text-on-surface px-5 py-3 rounded-full font-bold soft-lift"
            >
              <span className="material-symbols-outlined">download</span>
              Download the skill
            </a>
          </div>
        </div>
      </section>

      {/* MAKE IT STICK */}
      <section className="px-8 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
            Make it stick
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-6 max-w-2xl">
            Save it once so it&apos;s ready every morning
            <span className="text-primary italic">.</span>
          </h2>
          <p className="text-lg text-on-surface-variant max-w-3xl mb-12">
            Don&apos;t paste the prompt fresh each day — park it somewhere it&apos;ll wait for
            you. Then your whole morning is one sentence.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {STICK.map((s) => (
              <div key={s.tool} className="bg-surface p-8 rounded-3xl soft-lift">
                <div className="flex items-center gap-3 mb-5">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-container">
                    <span className="material-symbols-outlined text-on-primary-container">{s.icon}</span>
                  </div>
                  <div>
                    <div className="font-label text-xs tracking-widest uppercase text-primary">{s.tool}</div>
                    <h3 className="font-headline text-xl font-bold">{s.how}</h3>
                  </div>
                </div>
                <ol className="space-y-3 mb-5">
                  {s.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-on-surface-variant text-sm leading-relaxed">
                      <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed font-label font-bold text-xs">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <p className="text-sm text-on-surface-variant border-t border-outline-variant pt-4 flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-base shrink-0">tips_and_updates</span>
                  {s.note}
                </p>
              </div>
            ))}
          </div>

          <p className="text-sm text-on-surface-variant mt-8 max-w-3xl">
            A saved Project or Custom GPT also remembers your past letters in its own thread —
            a nice backstop to the no-repeat memory in the builder above.
          </p>
        </div>
      </section>

      {/* WHERE TO RUN IT */}
      <section className="px-8 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
            Where to run it
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-6 max-w-2xl">
            Two ways to run it — pick how hands-off you want to be
            <span className="text-primary italic">.</span>
          </h2>
          <p className="text-lg text-on-surface-variant max-w-3xl mb-12">
            The prompt above works in any AI chat. If you want it fully automated —
            drafting straight into your inbox — run it in an AI agent that can connect to
            your email. Either way, you only ever press send.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {RUN_MODES.map((m) => (
              <div key={m.title} className="bg-surface-container-lowest p-8 rounded-3xl soft-lift">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-container mb-5">
                  <span className="material-symbols-outlined text-on-primary-container">{m.icon}</span>
                </div>
                <h3 className="font-headline text-2xl font-bold mb-1">{m.title}</h3>
                <div className="font-label text-sm text-primary mb-4">{m.where}</div>
                <ul className="space-y-2.5">
                  {m.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-on-surface-variant text-sm leading-relaxed">
                      <span className="material-symbols-outlined text-primary text-lg shrink-0">check</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-sm text-on-surface-variant mt-8 max-w-3xl">
            <strong className="text-on-surface">You don&apos;t need a coding tool</strong> for any of
            this — Camp Letter is for a parent, not a programmer. A normal AI chat (Claude or ChatGPT)
            covers the everyday case; an AI assistant with email access does the rest.
          </p>
        </div>
      </section>

      {/* BRIDGE TO AVENTARY */}
      <section className="px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="bg-surface-container-highest rounded-3xl p-10 md:p-14 relative overflow-hidden">
            <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
              Why a RevOps consultant built a camp app
            </div>
            <h2 className="font-headline text-3xl md:text-4xl font-bold leading-[1.1] mb-6 max-w-2xl">
              Because this is exactly what I do — just usually for revenue teams.
            </h2>
            <p className="text-lg text-on-surface-variant max-w-2xl mb-5">
              I build small, sharp AI tools that take a fiddly human job and make it one
              sentence. A daily camp letter is a charming version of the same thing I
              build for go-to-market teams every week: capture the workflow, kill the
              repetition, ship something people actually use.
            </p>
            <p className="text-lg text-on-surface-variant max-w-2xl mb-8">
              If your company&apos;s revenue engine feels held together with manual steps
              and spreadsheets, that&apos;s my day job.
            </p>
            <Link
              href="/diagnostics"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-bold"
            >
              See the RevOps diagnostic
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <p className="font-headline italic text-on-surface-variant mt-8">
              Made for my own kids first. Then opened up for yours. — Mendy
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function LetterSection({
  icon,
  label,
  body
}: {
  icon: string;
  label: string;
  body: string;
}) {
  return (
    <div className="mb-3">
      <span className="flex items-center gap-1.5 font-label font-bold text-xs text-primary mb-0.5">
        <span className="material-symbols-outlined text-sm">{icon}</span>
        {label}
      </span>
      <span className="block text-sm text-on-surface-variant leading-snug">
        {body}
      </span>
    </div>
  );
}
