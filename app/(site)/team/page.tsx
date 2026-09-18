import Link from "next/link";
import { TeamRoster } from "@/components/TeamRoster";

export const revalidate = 3600;

/**
 * /team — the roster.
 *
 * A public page: indexable, canonical, in the sitemap. It began life unlisted
 * and stayed that way until /contact started linking it, at which point
 * telling Google not to index a page advertised on the contact page was a
 * contradiction rather than a privacy measure.
 *
 * Still absent from the header nav — being findable and being in the primary
 * navigation are different decisions.
 *
 * A member without a `profile` in lib/team.ts renders as a card with no link,
 * rather than as a link to an empty page.
 */
const PAGE_URL = "https://aventary.com/team";
const DESCRIPTION =
  "The people behind Aventary. A deliberately small team \u2014 you work with the people who build the thing.";

export const metadata = {
  title: "Our Team",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website" as const,
    url: PAGE_URL,
    siteName: "Aventary",
    title: "Our Team | Aventary",
    description: DESCRIPTION,
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Our Team | Aventary",
    description: DESCRIPTION
  }
};

export default function TeamPage() {
  return (
    <>
      <section className="px-8 pt-24 pb-16 bg-ink text-inverse-on-surface">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary text-on-primary font-label text-xs font-bold tracking-[0.14em] uppercase mb-8">
            <span className="material-symbols-outlined text-base">groups</span>
            Our Team
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-bold editorial-gap leading-[1.05] mb-8 max-w-4xl">
            Small team. <span className="text-primary italic">Long receipts.</span>
          </h1>
          <p className="text-xl text-white/70 max-w-2xl">
            Aventary is deliberately small. You work with the people who build the thing, not with
            an account manager who relays your questions to someone you never meet.
          </p>
        </div>
      </section>

      <section className="px-8 py-20 md:py-24">
        <div className="max-w-5xl mx-auto">
          <TeamRoster />
        </div>
      </section>

      <section className="px-8 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-bold editorial-gap leading-[1.1] mb-6">
            Rather see the work than the bios
            <span className="text-primary italic">?</span>
          </h2>
          <Link
            href="/work"
            className="inline-flex items-center gap-2 bg-ink text-inverse-on-surface px-8 py-4 rounded-full font-bold"
          >
            See the work
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </section>
    </>
  );
}
