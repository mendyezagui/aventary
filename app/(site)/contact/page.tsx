import Link from "next/link";
import { marked } from "marked";
import CalendlyEmbed from "@/components/Calendly";
import ContactForm from "@/components/ContactForm";
import { getPage } from "@/lib/cms";
import { SEED } from "@/lib/seed";

export const revalidate = 60;

const PAGE_URL = "https://aventary.com/contact";
const OG_IMAGE = "https://aventary.com/opengraph-image.png";
const TITLE = "Contact — Aventary";
const DESCRIPTION =
  "Book a 30-minute strategy call with Aventary, or send a note and we'll reply within one business day. Fractional CPO/CTO leadership, AI product strategy, and RevOps systems.";

export const metadata = {
  title: "Contact",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website" as const,
    url: PAGE_URL,
    siteName: "Aventary",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Contact Aventary" }],
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE]
  }
};

function firstBlockData(page: { blocks: { type: string; data: any }[] } | null, type: string) {
  return page?.blocks.find((b) => b.type === type)?.data ?? null;
}

/**
 * The single "talk to us" page. Booking, the message form, and who we are, in
 * that order — /about and /appointments 301 here, to #about and #book.
 *
 * Copy still comes from the CMS (the `contact` and `about` pages), so it stays
 * editable in /admin; only the layout is code. That's why the old pages' rows
 * are left in place rather than deleted.
 */
export default async function ContactPage() {
  const [contactPage, aboutPage] = await Promise.all([getPage("contact"), getPage("about")]);

  const contact = contactPage ?? SEED.contact;
  const about = aboutPage ?? SEED.about;

  const hero = firstBlockData(contact, "hero") ?? {};
  const aboutMd: string = firstBlockData(about, "rich_text")?.md ?? "";
  const aboutHtml = aboutMd ? ((await marked.parse(aboutMd)) as string) : "";

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-ink px-8 text-inverse-on-surface">
        <div className="mx-auto max-w-5xl py-24 md:py-32">
          {hero.eyebrow ? (
            <div className="mb-8 inline-flex items-center rounded-[2px] border border-primary/25 bg-primary/5 px-4 py-1.5 font-label text-xs uppercase tracking-[0.22em] text-primary">
              <span className="mr-2.5 flex h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              {hero.eyebrow}
            </div>
          ) : null}

          <h1 className="editorial-gap mb-8 font-headline text-5xl font-medium leading-[1.08] md:text-7xl">
            {hero.headline ?? "Let's"}
            {hero.accent ? (
              <> <span className="font-normal italic text-primary">{hero.accent}</span></>
            ) : null}
          </h1>

          {hero.sub ? (
            <p className="mb-12 max-w-2xl text-lg leading-relaxed text-white/55">{hero.sub}</p>
          ) : null}

          <div className="flex flex-wrap gap-4">
            <a
              href="#book"
              className="inline-flex items-center gap-2 rounded-[2px] bg-primary px-9 py-4 font-label text-xs font-semibold uppercase tracking-[0.16em] text-on-primary transition-all hover:opacity-90"
            >
              Book a call
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                arrow_forward
              </span>
            </a>
            <a
              href="#message"
              className="rounded-[2px] border border-white/25 px-9 py-4 font-label text-xs font-semibold uppercase tracking-[0.16em] text-inverse-on-surface transition-all hover:bg-white/5"
            >
              Send a message
            </a>
          </div>
        </div>
      </section>

      {/* ---------- Book ---------- */}
      <section id="book" className="scroll-mt-24 px-8 pt-20 pb-4">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 font-label text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Book a call
          </div>
          <h2 className="editorial-gap font-headline text-3xl font-medium md:text-4xl">
            Pick a time that works<span className="text-primary italic">.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-on-surface-variant">
            Thirty focused minutes. No slides, no pitch — we map where your pipeline is leaking
            and you leave with concrete next steps.
          </p>
        </div>
      </section>

      <CalendlyEmbed url="https://calendly.com/mendy-aventary" messageHref="#message" />

      {/* ---------- Message ---------- */}
      <section id="message" className="scroll-mt-24 bg-surface-container-low px-8 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="mb-3 font-label text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Prefer to write
            </div>
            <h2 className="editorial-gap font-headline text-3xl font-medium md:text-4xl">
              Send a message<span className="text-primary italic">.</span>
            </h2>
            <p className="mt-4 text-on-surface-variant leading-relaxed">
              Tell us where you are and what you&apos;re working toward. We reply within one
              business day.
            </p>
            <p className="mt-6 text-sm text-on-surface-variant">
              Or email{" "}
              <a href="mailto:hello@aventary.com" className="text-accent underline">
                hello@aventary.com
              </a>
              .
            </p>
          </div>
          <div className="lg:col-span-7">
            <ContactForm source="contact" />
          </div>
        </div>
      </section>

      {/* ---------- About ---------- */}
      {aboutHtml ? (
        <section id="about" className="scroll-mt-24 px-8 py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-3 font-label text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              About Aventary
            </div>
            <h2 className="editorial-gap mb-10 font-headline text-3xl font-medium md:text-4xl">
              Who we are<span className="text-primary italic">.</span>
            </h2>
            <div
              className="columns-1 gap-12 text-on-surface md:columns-2 [&_a]:text-accent [&_a]:underline [&_p]:mb-5 [&_p]:break-inside-avoid [&_p]:leading-relaxed [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: aboutHtml }}
            />
            <div className="mt-12">
              <a
                href="#book"
                className="inline-flex items-center gap-2 rounded-[2px] bg-primary px-9 py-4 font-label text-xs font-semibold uppercase tracking-[0.16em] text-on-primary transition hover:opacity-90"
              >
                Book a call
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </a>
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-8 pb-24">
        <div className="mx-auto max-w-5xl border-t border-outline-variant/40 pt-8">
          <Link
            href="/work"
            className="font-label text-xs font-bold uppercase tracking-widest text-primary"
          >
            See the work →
          </Link>
        </div>
      </section>
    </>
  );
}
