import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export const revalidate = 3601;

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

const EXAMPLES = [
  ["What is stuck because it still depends on me?", "Find the work, decisions, and follow-ups waiting on you — then turn them into clear owners and next steps before they become bottlenecks."],
["What are we about to drop?", "Surface overdue decisions, unanswered follow-ups, and unfinished work before something important gets missed."],
["We need to respond. Where is the information?", "Pull together the emails, files, and conversations you need from a specific period without losing hours searching for them."],
["Why are we still doing this manually?", "Find repetitive work consuming your team's time and use AI to dramatically reduce the manual effort."]
];

const TRUST = [
  ["What can be shared", "Decide what information is appropriate for AI and what should remain private before sensitive work ever reaches a model."],
  ["Which AI setup to use", "Choose the right enterprise AI environment based on the sensitivity of the work, data handling, retention, and security controls."],
  ["Who can access it", "Control who can access sensitive information and use the right permissions for the people and systems involved."],
  ["When a person needs to check", "Keep human review in the loop for important decisions and work where accuracy, privacy, or judgment matters."]
];

export default function TrainingPage() {
  return (
    <>
      <section className="px-6 md:px-8 pt-7 md:pt-9 pb-8 md:pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <h1 className="font-headline text-4xl md:text-6xl lg:text-[5rem] font-bold leading-[.96] text-accent mb-4">
              Executive &amp; Leadership AI Training
            </h1>
            <h2 className="font-headline text-2xl md:text-4xl lg:text-[3.5rem] font-bold leading-[1] mb-4">
              Use AI to get actual work done<span className="text-primary italic">.</span>
            </h2>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-5 leading-relaxed">
              Bring us something you&apos;re stuck on. We&apos;ll show you how to use AI to work through it yourself.
            </p>
            <p className="text-base text-on-surface-variant mb-5">One-on-one or with your team.</p>
            <Link href="/contact#book" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3.5 rounded-full font-bold">
              Book a free consultation
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>
      <section className="px-6 md:px-8 py-8 md:py-10 bg-ink text-inverse-on-surface">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] gap-6 lg:gap-8 items-center">
            <div>
              <Reveal>
                <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">TRUST, PRIVACY &amp; SECURITY</div>
                <h2 className="font-headline text-3xl md:text-5xl font-bold leading-[1.02] mb-4">
                  Use AI without being careless with your information<span className="text-primary italic">.</span>
                </h2>
                <p className="text-base text-inverse-on-surface/70 max-w-2xl mb-6 leading-relaxed">
                  Not every AI tool is right for sensitive work. We help you decide what can be shared, which AI setup makes sense, who can access the information, how long it is kept, and when a person needs to check the result.
                </p>
              </Reveal>
              <div className="grid md:grid-cols-2 gap-4">
                {TRUST.map(([title, body], i) => (
                  <Reveal key={title} delay={i * 60}>
                    <div className="border border-inverse-on-surface/15 p-4 rounded-3xl">
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
<section className="px-6 md:px-8 py-8 md:py-10 bg-surface-container-lowest">
  <div className="max-w-7xl mx-auto">
    <Reveal>
      <div className="border border-outline-variant/50 rounded-3xl p-5 md:p-7">
       <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
  Example: Amazon Connect
</div>
<h2 className="font-headline text-2xl md:text-3xl font-bold mb-3">
  Sensitive work needs the right AI environment.
</h2>
<p className="text-base text-on-surface-variant leading-relaxed max-w-3xl">
  Amazon Connect is one example of how organizations can use AI while keeping tighter control over sensitive information. Access can be limited, recordings and transcripts can be protected, and retention can be managed based on the needs of the organization.
</p>
<p className="text-sm text-on-surface-variant mt-4 max-w-3xl">
  The point is not to use one AI tool for everything. We help teams choose the right setup for the work, the information involved, and the level of privacy and human oversight required.
</p>
      </div>
    </Reveal>
  </div>
</section>
      <section className="px-6 md:px-8 py-8 md:py-10 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <h2 className="font-headline text-3xl md:text-5xl font-bold leading-[1.02] mb-3 max-w-3xl">
              Start with a problem you actually have<span className="text-primary italic">.</span>
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {EXAMPLES.map(([title, body], i) => (
              <Reveal key={title} delay={Math.min(i, 3) * 60}>
                <div className="bg-surface p-4 md:p-5 rounded-3xl soft-lift">
                  <div className="text-primary font-label font-bold text-sm mb-2">0{i + 1}</div>
                  <h3 className="font-headline text-xl md:text-2xl font-bold mb-2">{title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-8 py-8 md:py-10">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-3">Testimonials</div>
          </Reveal>
          <div className="grid lg:grid-cols-4 gap-4">
            <Reveal>
              <div className="border border-outline-variant/50 p-4 md:p-5 rounded-3xl">
                <h2 className="font-headline text-2xl font-bold mb-1">Abraham C.</h2>
                <p className="text-sm text-on-surface-variant mb-3">Chief Operating Officer, LCLA</p>
                <p className="text-base leading-relaxed">
                  A problem had been stuck for a long time. A short AI training session helped them work through it.
                </p>
              </div>
            </Reveal>
            <Reveal delay={60}>
              <div className="border border-outline-variant/50 p-4 md:p-5 rounded-3xl">
                <h2 className="font-headline text-2xl font-bold mb-1">Simcha S.</h2>
                <p className="text-base font-bold mt-2 mb-4">Rebuilding a Shopify Store by Talking to ChatGPT</p>
                <a
                  href="https://aventary.com/videos/rebuilding-a-shopify-store-by-talking-to-chatgpt"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-accent font-bold"
                >
                  Watch the video <span className="material-symbols-outlined">arrow_outward</span>
                </a>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="border border-outline-variant/50 p-4 md:p-5 rounded-3xl">
                <h2 className="font-headline text-2xl font-bold mb-1">Scott Management</h2>
                <p className="text-sm text-on-surface-variant mb-3">Hundreds of documents to organize</p>
                <p className="text-base leading-relaxed">
                  We showed them how AI could read, identify, name, and organize hundreds of PDFs and scans.
                </p>
              </div>
            </Reveal>
            <Reveal delay={180}>
              <div className="border border-outline-variant/50 p-4 md:p-5 rounded-3xl">
                <h2 className="font-headline text-2xl font-bold mb-1">A family office</h2>
                <p className="text-sm text-on-surface-variant mb-3">Finding information for requests</p>
                <p className="text-base leading-relaxed">
                  We showed them how AI could find information across places like Drive and Gmail and help prepare the requested material.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      

      <section className="px-6 md:px-8 py-8 md:py-10">
        <Reveal className="max-w-3xl mx-auto text-center">
          <h2 className="font-headline text-3xl md:text-5xl font-bold leading-[1.02] mb-5">
            Want to see what AI could help you with<span className="text-primary italic">?</span>
          </h2>
          <Link href="/contact#book" className="inline-flex items-center gap-2 bg-primary text-on-primary px-7 py-4 rounded-full font-bold">
            Book a free consultation
          </Link>
        </Reveal>
      </section>
    </>
  );
}
