import Link from "next/link";

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
    icon: "download",
    title: "Install the skill",
    body: "Download the file and add it to your Claude. One time."
  },
  {
    num: "02",
    icon: "checklist",
    title: "Answer a few questions",
    body:
      "Your child, the camp email, the dates, their team, who's writing, any siblings. Saved to a profile you own."
  },
  {
    num: "03",
    icon: "bolt",
    title: "Say the magic words",
    body:
      "“Write today's letter to Eli.” It pulls the score and writes the whole thing."
  },
  {
    num: "04",
    icon: "drafts",
    title: "Review & send",
    body:
      "It lands in your drafts. Read it, tweak it, send it. Nothing goes out without you."
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
              <a
                href={SKILL_HREF}
                download
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-bold"
              >
                Download the skill
                <span className="material-symbols-outlined">download</span>
              </a>
              <Link
                href="#how"
                className="inline-flex items-center gap-2 bg-surface-container-lowest text-on-surface px-6 py-3 rounded-full font-bold soft-lift"
              >
                How it works
              </Link>
              <span className="text-sm text-on-surface-variant">
                Free · runs in your own Claude
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
                label="From Abba"
                body="Thinking of you all day. How's your bunk — is your counselor cool? Counting down to our call!"
              />
              <div className="font-headline italic text-on-surface mt-4">
                Love, Abba
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
              The part that makes it feel alive: before writing, it reads the{" "}
              <strong className="text-on-surface">letters you already sent</strong> — so
              it never recycles a joke or asks the same question twice, and the themes
              shift as camp goes on, from &ldquo;settling in&rdquo; to &ldquo;what trip
              is next?&rdquo; to &ldquo;almost home.&rdquo;
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
            <strong className="text-on-surface">You&apos;ll need:</strong> Claude with
            skills enabled, and Gmail connected so it can draft for you. No Gmail? It
            still writes the letter to paste into your own mail app. Your family profile
            stays with you — nothing is uploaded.
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
