import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export const revalidate = 3600;

const PAGE_URL = "https://aventary.com/training";
const TITLE = "Executive & Leadership AI Training | Aventary";
const DESCRIPTION =
  "Practical AI training for executives and leadership teams, built around real work, clear limits, and a person checking important work.";

export const metadata = {
  title: "Executive & Leadership AI Training",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website" as const,
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

const USE_CASES = [
  ["Gather everything still outstanding from yesterday", "Get suggested next steps without sorting through it all yourself."],
  ["Before your next call, get the key facts", "Get the client, the people, and your history with them in one place."],
  ["Find what is buried across your documents", "Get the information you need without searching through everything."],
  ["Turn rough thoughts into a clear response", "Draft an email, memo, or reply while you keep the final say."],
  ["Bring scattered information together before a decision", "See the facts, gaps, and questions in one place."],
  ["Stop repeating the same manual work", "Teach AI to help with the tasks you do again and again."]
];

const TRUST = [
  ["What you share", "Decide what you can share and what you should keep private."],
  ["Who can use it", "Only let people and AI tools that need the information use it."],
  ["How long your information is kept", "Know how long the AI tool keeps your information."],
  ["A person checks important work", "Check important answers before you use them, especially when they affect people or the business."],
  ["Share only what is needed", "Only share sensitive information when it is needed."],
  ["Choose the right AI tool", "Choose the right AI tool for what you’re working on."]
];

export default function TrainingPage() {
  return (
    <>
      <section className="px-6 md:px-8 pt-12 md:pt-16 pb-10 md:pb-14">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-5xl">
            <h1 className="font-headline text-4xl md:text-6xl lg:text-[5rem] font-bold leading-[.96] text-accent mb-4">
              Executive &amp; Leadership AI Training
            </h1>
            <h2 className="font-headline text-2xl md:text-4xl lg:text-[3.5rem] font-bold leading-[1] mb-4">
              Practical AI for <span className="text-primary italic">real work.</span>
            </h2>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-5 leading-relaxed">
              Bring a problem you have not solved. Learn how to use AI on it—by yourself or with your team.
            </p>
            <div className="border-y border-outline-variant/40 py-3 mb-5 max-w-3xl">
              <div className="font-label font-bold text-sm tracking-widest mb-1">TRUST. PRIVACY. SECURITY.</div>
              <p className="text-sm md:text-base text-on-surface-variant">
                Decide what to share, who can use it, how long it stays there, and when a person should check the answer.
              </p>
            </div>
            <Link href="/contact#book" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3.5 rounded-full font-bold">
              Book a free consultation
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-14 md:py-16 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">Real problems</div>
            <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.02] mb-4 max-w-4xl">
              Work on what still needs solving<span className="text-primary italic">.</span>
            </h2>
            <p className="text-lg text-on-surface-variant max-w-2xl mb-8">
              Bring a problem from your day. Learn how to use AI on it—and when to check the answer.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {USE_CASES.map(([title, body], i) => (
              <Reveal key={title} delay={Math.min(i, 3) * 60} className="h-full">
                <div className="bg-surface p-5 rounded-3xl soft-lift h-full">
                  <div className="text-primary font-label font-bold text-sm mb-3">0{i + 1}</div>
                  <h3 className="font-headline text-xl font-bold mb-2">{title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-14 md:py-16 bg-ink text-inverse-on-surface">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] gap-8 lg:gap-12 items-center">
            <div>
              <Reveal>
                <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">Trust, privacy &amp; security</div>
                <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.02] mb-4 max-w-4xl">Stay in control when you use AI<span className="text-primary italic">.</span></h2>
                <p className="text-base text-inverse-on-surface/70 max-w-2xl mb-8">
                  Before you use AI, decide what to share, who can use it, and when a person should check the answer.
                </p>
              </Reveal>
              <div className="grid md:grid-cols-2 gap-4">
                {TRUST.map(([title, body], i) => (
                  <Reveal key={title} delay={Math.min(i, 3) * 60} className="h-full">
                    <div className="border border-inverse-on-surface/15 p-5 rounded-3xl h-full">
                      <div className="text-primary font-label font-bold text-sm mb-3">0{i + 1}</div>
                      <h3 className="font-headline text-xl font-bold mb-2">{title}</h3>
                      <p className="text-sm text-inverse-on-surface/70 leading-relaxed">{body}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
            <Reveal delay={120}>
              <div className="rounded-3xl border border-inverse-on-surface/10 bg-inverse-on-surface/[0.04] p-5" aria-hidden="true">
                <svg viewBox="0 0 360 230" className="w-full h-auto text-primary" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M42 181.5h276" stroke="currentColor" strokeOpacity=".35" strokeWidth="2" />
                  <path d="M86 177c8-36 29-54 55-54s47 18 55 54M173 177c7-28 23-42 45-42s38 14 45 42" stroke="currentColor" strokeOpacity=".8" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="141" cy="92" r="20" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="2" />
                  <circle cx="218" cy="105" r="18" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="2" />
                  <circle cx="92" cy="113" r="17" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="2" />
                  <path d="M126 151c10-10 22-15 35-15M202 157c9-8 19-12 30-12M77 161c8-7 17-10 27-10" stroke="currentColor" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
                  <rect x="126" y="170" width="108" height="8" rx="4" fill="currentColor" fillOpacity=".2" />
                  <rect x="154" y="166" width="52" height="4" rx="2" fill="currentColor" fillOpacity=".5" />
                </svg>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-14 md:py-16">
        <Reveal className="max-w-3xl mx-auto text-center">
          <h2 className="font-headline text-4xl md:text-6xl font-bold leading-[1.02] mb-6">Book a free consultation<span className="text-primary italic">.</span></h2>
          <Link href="/contact#book" className="inline-flex items-center gap-2 bg-primary text-on-primary px-7 py-4 rounded-full font-bold">
            Book a free consultation <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </Reveal>
      </section>
    </>
  );
}
