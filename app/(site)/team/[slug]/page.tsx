import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/Reveal";
import { TEAM, memberBySlug } from "@/lib/team";

export const revalidate = 3600;

/**
 * /team/<slug> — an individual profile.
 *
 * Unlisted on purpose: `noindex, nofollow`, not in the header nav, not in the
 * sitemap. Anyone holding the URL can read it, which is what makes it useful to
 * send; nothing on the open web points at it except the one link on /work.
 *
 * Slugs are matched case-insensitively so /team/Mendy and /team/mendy both land
 * here rather than one of them 404ing on a capital letter.
 */

export function generateStaticParams() {
  return TEAM.filter((m) => m.profile).map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = memberBySlug(slug);
  if (!member?.profile) return { title: "Not found", robots: { index: false, follow: false } };

  return {
    title: `${member.name} — ${member.role}`,
    description: member.blurb,
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      type: "profile" as const,
      siteName: "Aventary",
      title: `${member.name} — ${member.role} | Aventary`,
      description: member.blurb,
      locale: "en_US"
    }
  };
}

export default async function TeamMemberPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = memberBySlug(slug);
  if (!member?.profile) notFound();

  const p = member.profile;

  return (
    <>
      {/* HERO */}
      <section className="px-8 pt-20 pb-20 bg-ink text-inverse-on-surface">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/team"
            className="inline-flex items-center gap-2 text-white/40 hover:text-primary transition-colors font-label text-xs tracking-[0.18em] uppercase mb-12"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Our Team
          </Link>

          <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-12">
            <div
              aria-hidden="true"
              className="shrink-0 w-24 h-24 rounded-full bg-primary text-on-primary font-headline font-bold text-3xl flex items-center justify-center"
            >
              {member.initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-primary font-label font-bold text-xs tracking-[0.18em] uppercase mb-4">
                {member.role}
              </div>
              <h1 className="font-headline text-4xl md:text-6xl font-bold editorial-gap leading-[1.05] mb-6">
                {member.name}
                <span className="text-primary italic">.</span>
              </h1>
              <p className="text-xl md:text-2xl text-white/70 leading-relaxed max-w-3xl mb-8">
                {p.lede}
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-label font-semibold text-xs tracking-[0.16em] uppercase hover:opacity-90 transition-opacity"
                  >
                    LinkedIn
                    <span className="material-symbols-outlined text-base">north_east</span>
                  </a>
                )}
                <Link
                  href="/contact#book"
                  className="inline-flex items-center gap-2 border border-white/25 text-white px-6 py-3 rounded-full font-label font-semibold text-xs tracking-[0.16em] uppercase hover:border-white/60 transition-colors"
                >
                  Book a call
                </Link>
                {member.location && (
                  <span className="font-label text-xs tracking-[0.16em] uppercase text-white/35">
                    {member.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className="px-8 py-20 md:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-accent font-label font-bold text-xs tracking-[0.18em] uppercase mb-4">
            The long version
          </div>
          <h2 className="font-headline text-3xl md:text-4xl font-bold editorial-gap leading-[1.1] mb-10">
            How I got here<span className="text-primary italic">.</span>
          </h2>

          <div className="space-y-6">
            {p.story.map((para, i) => (
              <Reveal key={i} delay={i * 60}>
                <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed">{para}</p>
              </Reveal>
            ))}
          </div>

          {p.pull && (
            <Reveal>
              <blockquote className="mt-14 border-l-2 border-primary pl-6 md:pl-8">
                <p className="font-headline text-2xl md:text-3xl font-bold leading-[1.25] editorial-gap text-on-surface">
                  &ldquo;{p.pull}&rdquo;
                </p>
              </blockquote>
            </Reveal>
          )}
        </div>
      </section>

      {/* THE RECORD */}
      {p.chapters && p.chapters.length > 0 && (
      <section className="px-8 py-20 md:py-24 bg-surface-container">
        <div className="max-w-5xl mx-auto">
          <div className="text-accent font-label font-bold text-xs tracking-[0.18em] uppercase mb-4">
            The record
          </div>
          <h2 className="font-headline text-3xl md:text-4xl font-bold editorial-gap leading-[1.1] mb-12 max-w-2xl">
            Fifteen years, in order<span className="text-primary italic">.</span>
          </h2>

          <div className="space-y-5">
            {p.chapters.map((c, i) => (
              <Reveal key={`${c.org}-${c.period}`} delay={i * 50}>
                <article className="bg-surface-container-lowest rounded-3xl p-7 md:p-10 soft-lift">
                  <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 mb-4">
                    <h3 className="font-headline text-2xl md:text-3xl font-bold leading-tight">
                      {c.org}
                    </h3>
                    <div className="font-label text-xs tracking-[0.16em] uppercase text-on-surface-variant shrink-0">
                      {c.period}
                    </div>
                  </div>

                  <div className="text-accent font-label font-bold text-sm mb-4">{c.role}</div>
                  <p className="text-on-surface-variant text-base md:text-lg leading-relaxed mb-6">
                    {c.summary}
                  </p>

                  <ul className="space-y-3">
                    {c.points.map((pt) => (
                      <li key={pt} className="flex gap-3 text-on-surface-variant leading-relaxed">
                        <span
                          aria-hidden="true"
                          className="mt-[0.6em] shrink-0 w-1.5 h-1.5 rounded-full bg-primary"
                        />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* WORK OF THEIR OWN — things that live elsewhere */}
      {p.links && p.links.length > 0 && (
        <section className="px-8 pb-20 md:pb-24">
          <div className="max-w-3xl mx-auto">
            <div className="text-accent font-label font-bold text-xs tracking-[0.18em] uppercase mb-6">
              Elsewhere
            </div>
            <div className="space-y-4">
              {p.links.map((l) => (
                <Reveal key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block bg-surface-container-lowest rounded-3xl p-7 md:p-8 soft-lift"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {l.role && (
                          <div className="text-accent font-label font-bold text-xs tracking-[0.16em] uppercase mb-2">
                            {l.role}
                          </div>
                        )}
                        <h3 className="font-headline text-2xl font-bold leading-tight mb-2">
                          {l.label}
                        </h3>
                        <p className="text-on-surface-variant leading-relaxed">{l.description}</p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-accent shrink-0 mt-1"
                      >
                        north_east
                      </span>
                    </div>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SELECTED CLIENT WORK */}
      {p.engagements && p.engagements.length > 0 && (
        <section className="px-8 py-20 md:py-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-accent font-label font-bold text-xs tracking-[0.18em] uppercase mb-4">
              Selected client work
            </div>
            <h2 className="font-headline text-3xl md:text-4xl font-bold editorial-gap leading-[1.1] mb-6 max-w-3xl">
              The problem, the build, the receipts<span className="text-primary italic">.</span>
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed max-w-3xl mb-12">
              Work done under a previous firm is described by vertical and scale rather than by
              name — those confidentiality obligations do not expire. Aventary&rsquo;s own clients
              are named, and the full catalog lives on{" "}
              <Link href="/work" className="text-accent font-semibold link-underline">
                the work page
              </Link>
              .
            </p>

            <div className="grid md:grid-cols-2 gap-5">
              {p.engagements.map((e, i) => (
                <Reveal key={`${e.under}-${e.year}-${e.descriptor}`} delay={(i % 2) * 60}>
                  <article className="h-full flex flex-col bg-surface-container-lowest rounded-3xl p-7 md:p-9 soft-lift">
                    <div className="flex items-center gap-2 flex-wrap mb-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label text-[11px] font-bold tracking-[0.1em] uppercase">
                        {e.vertical}
                      </span>
                      <span className="font-label text-[11px] tracking-[0.14em] uppercase text-on-surface-variant">
                        {e.under} · {e.year}
                      </span>
                    </div>

                    <h3 className="font-headline text-2xl font-bold leading-tight mb-2">
                      {e.client ?? e.descriptor}
                    </h3>
                    {e.client && (
                      <div className="text-on-surface-variant text-sm mb-4">{e.descriptor}</div>
                    )}
                    {!e.client && <div className="mb-4" />}

                    <div className="space-y-4 flex-1">
                      <div>
                        <div className="font-label text-[11px] tracking-[0.14em] uppercase text-on-surface-variant mb-1">
                          The problem
                        </div>
                        <p className="text-on-surface-variant leading-relaxed">{e.problem}</p>
                      </div>
                      <div>
                        <div className="font-label text-[11px] tracking-[0.14em] uppercase text-on-surface-variant mb-1">
                          The build
                        </div>
                        <p className="text-on-surface-variant leading-relaxed">{e.build}</p>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mt-7 pt-6 border-t border-outline-variant">
                      {e.outcomes.map((o) => (
                        <div key={o.label}>
                          <dt className="sr-only">{o.label}</dt>
                          <dd className="font-headline text-xl font-bold text-accent leading-none">
                            {o.value}
                          </dd>
                          <div className="text-on-surface-variant text-xs mt-1.5 leading-snug">
                            {o.label}
                          </div>
                        </div>
                      ))}
                    </dl>

                    <div className="flex flex-wrap gap-2 mt-6">
                      {e.capabilities.map((c) => (
                        <span
                          key={c}
                          className="font-label text-[11px] tracking-[0.08em] uppercase text-on-surface-variant border border-outline-variant rounded-full px-3 py-1"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW I WORK */}
      {p.principles && p.principles.length > 0 && (
      <section className="px-8 py-20 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-accent font-label font-bold text-xs tracking-[0.18em] uppercase mb-4">
            How I work
          </div>
          <h2 className="font-headline text-3xl md:text-4xl font-bold editorial-gap leading-[1.1] mb-12 max-w-2xl">
            Four things I will not negotiate<span className="text-primary italic">.</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            {p.principles.map((pr, i) => (
              <Reveal key={pr.title} delay={i * 60}>
                <div className="h-full bg-surface-container-lowest rounded-3xl p-7 md:p-9 soft-lift">
                  <div className="font-headline text-xl md:text-2xl font-bold mb-3 leading-snug">
                    {pr.title}
                  </div>
                  <p className="text-on-surface-variant leading-relaxed">{pr.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CREDENTIALS */}
      {((p.education && p.education.length > 0) ||
        (p.certifications && p.certifications.length > 0)) && (
      <section className="px-8 py-20 md:py-24 bg-ink text-inverse-on-surface">
        <div className="max-w-5xl mx-auto">
          <div className="text-primary font-label font-bold text-xs tracking-[0.18em] uppercase mb-4">
            Credentials
          </div>
          <h2 className="font-headline text-3xl md:text-4xl font-bold leading-[1.1] mb-12 max-w-2xl">
            Paper, for the people who ask<span className="text-primary italic">.</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-x-14 gap-y-12">
            {p.education && p.education.length > 0 && (
            <div>
              <div className="font-label text-xs tracking-[0.16em] uppercase text-white/35 mb-5">
                Education
              </div>
              <ul className="space-y-5">
                {p.education.map((c) => (
                  <li key={c.label}>
                    <div className="font-headline text-xl font-bold text-white">{c.label}</div>
                    {c.detail && <div className="text-white/55 mt-1">{c.detail}</div>}
                  </li>
                ))}
              </ul>
            </div>

            )}

            {p.certifications && p.certifications.length > 0 && (
            <div>
              <div className="font-label text-xs tracking-[0.16em] uppercase text-white/35 mb-5">
                Certifications
              </div>
              <ul className="space-y-5">
                {p.certifications.map((c) => (
                  <li key={c.label}>
                    <div className="font-headline text-xl font-bold text-white">{c.label}</div>
                    {c.detail && <div className="text-white/55 mt-1">{c.detail}</div>}
                  </li>
                ))}
              </ul>
            </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* CTA */}
      <section className="px-8 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-headline text-3xl md:text-5xl font-bold editorial-gap leading-[1.1] mb-6">
            Want to put this to work
            <span className="text-primary italic">?</span>
          </h2>
          <p className="text-lg md:text-xl text-on-surface-variant mb-10">
            Thirty focused minutes. No slides, no pitch — we scope the smallest complete build
            that moves a real outcome.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/contact#book"
              className="inline-flex items-center gap-2 bg-ink text-inverse-on-surface px-8 py-4 rounded-full font-bold"
            >
              Book a working session
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link
              href="/work"
              className="inline-flex items-center gap-2 bg-surface-container-lowest text-on-surface px-8 py-4 rounded-full font-bold soft-lift"
            >
              See the work
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
