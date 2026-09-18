import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { TeamAvatar } from "@/components/TeamAvatar";
import { TEAM } from "@/lib/team";

/**
 * The roster grid, shared by /team and the bottom of /contact.
 *
 * One component so the two can never drift: /team is the link that gets shared
 * directly, /contact is where someone lands who has not been sent it, and both
 * should show the same people described the same way.
 *
 * `headingLevel` exists because the card's name is the page's second-level
 * heading on /team, where the roster is the page, but a third-level one on
 * /contact, where it sits under a section heading. Getting that wrong breaks
 * the outline for anyone reading with a screen reader.
 */
export function TeamRoster({
  headingLevel = "h2"
}: {
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {TEAM.map((m, i) => {
        const card = (
          <article className="h-full flex flex-col bg-surface-container-lowest rounded-3xl p-8 md:p-10 soft-lift">
            <TeamAvatar member={m} size="w-16 h-16" className="text-xl mb-6" />
            <div className="text-accent font-label font-bold text-xs tracking-[0.16em] uppercase mb-2">
              {m.role}
            </div>
            <Heading className="font-headline text-2xl md:text-3xl font-bold leading-tight mb-4">
              {m.name}
            </Heading>
            <p className="text-on-surface-variant leading-relaxed flex-1">{m.blurb}</p>

            {m.profile ? (
              <span className="inline-flex items-center gap-2 mt-7 text-accent font-label font-bold text-sm">
                Read the full background
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 mt-7 font-label text-xs tracking-[0.14em] uppercase text-on-surface-variant">
                Profile coming soon
              </span>
            )}
          </article>
        );

        return (
          <Reveal key={m.slug} delay={i * 60}>
            {m.profile ? (
              <Link href={`/team/${m.slug}`} className="block h-full group">
                {card}
              </Link>
            ) : (
              card
            )}
          </Reveal>
        );
      })}
    </div>
  );
}
