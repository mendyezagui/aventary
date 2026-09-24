import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import TrainingInquiryForm from "@/components/TrainingInquiryForm";

export const revalidate = 3601;

const PAGE_URL = "https://aventary.com/training";
const TITLE = "Executive AI Training | Aventary";
const DESCRIPTION =
  "Bring the thing you're stuck on. Work it through with AI on your files, then leave with a setup you can run again.";

export const metadata = {
  title: { absolute: TITLE },
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
  ["It's 7:40. My 8:00 is someone I last spoke to in March.", "Get the full history from email and notes before you dial."],
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
            <h1 className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-4">
              Executive AI Training
            </h1>
            <h2 className="font-headline text-4xl md:text-6xl lg:text-[5rem] font-bold leading-[.96] mb-5">
              Bring the thing you&apos;re stuck on<span className="text-primary italic">.</span>
            </h2>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-5 leading-relaxed">
              We work it with AI, on your files, with you in the chair. You leave with it moving and a setup you can run again without us.
            </p>
            <p className="text-base text-on-surface-variant mb-6">
              No course. No homework. 60 minutes, in person or online, one-on-one or with your team.
            </p>
            <Link href="#training-inquiry" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3.5 rounded-full font-bold">
              Tell me what you&apos;re stuck on
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
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

      <section className="px-6 md:px-8 py-8 md:py-10">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <h2 className="font-headline text-3xl md:text-5xl font-bold leading-[1.02] mb-6">What this looks like.</h2>
          </Reveal>
          <Reveal>
            <p className="text-on-surface-variant mb-8 max-w-3xl leading-relaxed">
              <strong className="text-on-surface">Mendy Ezagui.</strong> I built PwC&apos;s first AI SDR agent on Agentforce. Now I sit next to executives and make AI do the work.
            </p>
          </Reveal>
          <div className="grid lg:grid-cols-4 gap-4">
            <Reveal>
              <div className="border border-outline-variant/50 p-4 md:p-5 rounded-3xl">
                <h3 className="font-headline text-2xl font-bold mb-3">Scott Management</h3>
                <p className="text-base leading-relaxed">
                  Scott Management got a request for information. The answers were scattered across every tool they use. We pulled it together across all of them in minutes, then showed them how to do it next time without us.
                </p>
              </div>
            </Reveal>
            <Reveal delay={60}>
              <div className="border border-outline-variant/50 p-4 md:p-5 rounded-3xl">
                <h3 className="font-headline text-2xl font-bold mb-3">A family office</h3>
                <p className="text-base leading-relaxed">
                  A family office had thousands of documents. Nobody had time to catalogue them, let alone categorize them. AI read every one, named it, and filed it by category. We can&apos;t tell you which office.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="border border-outline-variant/50 p-4 md:p-5 rounded-3xl">
                <h3 className="font-headline text-2xl font-bold mb-3">Abraham C., COO, LCLA</h3>
                <p className="text-base leading-relaxed">
                  A stale website and software nobody wanted to touch. The website is updated. Once the team knew how to use the tools, a long list of other tasks got streamlined too.
                </p>
              </div>
            </Reveal>
            <Reveal delay={180}>
              <div className="border border-outline-variant/50 p-4 md:p-5 rounded-3xl">
                <h3 className="font-headline text-2xl font-bold mb-3">Simcha S.</h3>
                <p className="text-base leading-relaxed mb-4">Rebuilt a Shopify store by talking to ChatGPT.</p>
                <a href="https://aventary.com/videos/rebuilding-a-shopify-store-by-talking-to-chatgpt" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-accent font-bold">
                  Watch the video <span className="material-symbols-outlined">arrow_outward</span>
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="training-inquiry" className="scroll-mt-24 px-6 md:px-8 py-12 md:py-16 bg-surface-container-low">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-headline text-3xl md:text-5xl font-bold leading-[1.02] mb-8">
            What&apos;s the one thing you&apos;d hand off tomorrow?
          </h2>
          <TrainingInquiryForm />
        </div>
      </section>
    </>
  );
}
