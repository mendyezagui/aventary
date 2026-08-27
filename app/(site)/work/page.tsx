import Link from "next/link";
import { PROJECTS, CAPABILITIES, type Project } from "@/lib/work";

export const revalidate = 3600;

const PAGE_URL = "https://aventary.com/work";
const TITLE = "Work | Aventary";
const DESCRIPTION =
  "Shipped products and production engagements — with the receipts. Live software, enterprise integrations, and AI systems built by an operator, not a slide deck.";

export const metadata = {
  title: "Work",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website" as const,
    url: PAGE_URL,
    siteName: "Aventary",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: DESCRIPTION,
  },
};

const capLabel = (key: string) => CAPABILITIES.find((c) => c.key === key)?.label ?? key;

function Cover({ project }: { project: Project }) {
  if (project.cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={project.cover}
        alt={`${project.name} screenshot`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    );
  }
  // Branded fallback cover — on-brand ink→gold, no external asset needed.
  return (
    <div className="relative w-full h-full min-h-[220px] bg-ink overflow-hidden flex flex-col justify-between p-7">
      <div
        aria-hidden
        className="absolute -right-16 -top-16 w-64 h-64 rounded-full blur-2xl opacity-25"
        style={{ background: "radial-gradient(circle, #C9A66B 0%, transparent 70%)" }}
      />
      <div className="relative flex items-center justify-between">
        <span className="material-symbols-outlined text-primary text-4xl">{project.icon}</span>
        <span className="font-label text-[10px] tracking-[0.18em] uppercase text-white/50 border border-white/15 rounded-full px-3 py-1">
          {project.status}
        </span>
      </div>
      <div className="relative">
        <div className="font-headline text-3xl md:text-4xl font-bold text-inverse-on-surface leading-tight">
          {project.name}
        </div>
        <div className="font-label text-[10px] tracking-[0.22em] uppercase text-primary mt-3">
          {project.ownership}
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <article className="bg-surface-container-lowest rounded-3xl soft-lift overflow-hidden grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
      {/* Cover */}
      <div className="min-h-[220px]">
        <Cover project={project} />
      </div>

      {/* Body */}
      <div className="p-7 md:p-9">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {project.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 bg-surface-container-high text-on-surface-variant rounded-full px-3 py-1 font-label text-[11px] tracking-wide"
            >
              {capLabel(t)}
            </span>
          ))}
        </div>

        <h3 className="font-headline text-2xl md:text-3xl font-bold leading-tight">
          {project.name}
        </h3>
        <p className="font-headline italic text-on-surface-variant mt-1 mb-5">{project.tagline}</p>

        {/* Problem -> Build -> Result */}
        <div className="space-y-3 mb-6">
          {(
            [
              ["Problem", project.problem],
              ["Build", project.build],
              ["Result", project.result],
            ] as const
          ).map(([label, text]) => (
            <div key={label} className="grid grid-cols-[5.5rem_1fr] gap-3">
              <div className="font-label font-bold text-[11px] tracking-widest uppercase text-accent pt-0.5">
                {label}
              </div>
              <p className="text-on-surface-variant text-[15px] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Metrics — only rendered when real numbers exist */}
        {project.metrics && project.metrics.length ? (
          <div className="flex flex-wrap gap-6 mb-6">
            {project.metrics.map((m) => (
              <div key={m.label}>
                <div className="font-headline text-2xl font-bold text-primary">{m.value}</div>
                <div className="font-label text-[11px] tracking-wide uppercase text-on-surface-variant">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Receipts */}
        <div className="mb-6">
          <div className="font-label font-bold text-[11px] tracking-widest uppercase text-accent mb-2">
            Receipts
          </div>
          <ul className="space-y-1.5">
            {project.receipts.map((r) => (
              <li key={r} className="flex gap-2.5 text-on-surface text-sm">
                <span className="material-symbols-outlined text-primary text-base leading-5 flex-shrink-0">
                  check_circle
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Stack */}
        <div className="flex flex-wrap gap-2 mb-6">
          {project.stack.map((s) => (
            <span
              key={s}
              className="font-label text-[11px] tracking-wide text-on-surface-variant border border-outline-variant rounded px-2.5 py-1"
            >
              {s}
            </span>
          ))}
        </div>

        {/* Proves + link */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-outline-variant">
          <p className="text-sm text-on-surface-variant max-w-md">
            <span className="text-accent font-label font-bold text-[11px] tracking-widest uppercase mr-2">
              Proves
            </span>
            {project.proves}
          </p>
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap"
            >
              {project.liveLabel ?? "Visit"}
              <span className="material-symbols-outlined text-base">north_east</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 bg-surface-container-high text-on-surface-variant px-5 py-2.5 rounded-full font-label font-semibold text-xs tracking-wide uppercase whitespace-nowrap">
              <span className="material-symbols-outlined text-base">lock</span>
              Enterprise engagement
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function WorkPage() {
  const products = PROJECTS.filter((p) => p.category === "product");
  const engagements = PROJECTS.filter((p) => p.category === "engagement");
  const pocs = PROJECTS.filter((p) => p.category === "poc");

  return (
    <>
      {/* HERO */}
      <section className="px-8 pt-24 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label text-sm mb-8">
            <span className="material-symbols-outlined text-base">deployed_code</span>
            Work &amp; Receipts
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-bold editorial-gap leading-[1.08] mb-8 max-w-5xl">
            Shipped software, not slideware.{" "}
            <span className="text-primary italic">With the receipts.</span>
          </h1>
          <p className="text-xl text-on-surface-variant max-w-3xl mb-10">
            Products live in the app stores and on the open web. Enterprise integrations running in
            production. AI systems with governance, not demos. Every item below links to something
            real — or names exactly what was built and what it proves.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/appointments"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-bold"
            >
              Book a call
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link
              href="/method"
              className="inline-flex items-center gap-2 bg-surface-container-lowest text-on-surface px-6 py-3 rounded-full font-bold soft-lift"
            >
              See the method
            </Link>
          </div>
        </div>
      </section>

      {/* CAPABILITIES STRIP */}
      <section className="px-8 pb-14">
        <div className="max-w-7xl mx-auto">
          <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-5">
            One operator, many use cases
          </div>
          <div className="flex flex-wrap gap-3">
            {CAPABILITIES.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-2 bg-surface-container-lowest text-on-surface px-5 py-3 rounded-full soft-lift text-sm font-label font-semibold"
              >
                <span className="material-symbols-outlined text-primary text-base">{c.icon}</span>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between gap-4 mb-8">
            <h2 className="font-headline text-3xl md:text-4xl font-bold leading-[1.1]">
              Products <span className="text-primary italic">I own and run</span>
            </h2>
            <span className="font-label text-xs tracking-widest uppercase text-on-surface-variant">
              {products.length} live
            </span>
          </div>
          <div className="space-y-6">
            {products.map((p) => (
              <ProjectRow key={p.slug} project={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ENGAGEMENTS */}
      <section className="px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="font-headline text-3xl md:text-4xl font-bold leading-[1.1]">
              Client engagements <span className="text-primary italic">in production</span>
            </h2>
            <span className="font-label text-xs tracking-widest uppercase text-on-surface-variant">
              {engagements.length} shipped
            </span>
          </div>
          <p className="text-on-surface-variant max-w-2xl mb-8 text-[15px]">
            Most client names are withheld by agreement. The work, the stack, and the guardrails
            are described exactly as built.
          </p>
          <div className="space-y-6">
            {engagements.map((p) => (
              <ProjectRow key={p.slug} project={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ENTERPRISE POCs & AI SYSTEMS */}
      {pocs.length ? (
        <section className="px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <h2 className="font-headline text-3xl md:text-4xl font-bold leading-[1.1]">
                Enterprise POCs <span className="text-primary italic">&amp; AI systems</span>
              </h2>
              <span className="font-label text-xs tracking-widest uppercase text-on-surface-variant">
                {pocs.length} deployed
              </span>
            </div>
            <p className="text-on-surface-variant max-w-2xl mb-8 text-[15px]">
              Governed, deployed proofs-of-concept built inside enterprise systems of record — AI
              assistance with provenance, permissions, and human review, never an uncontrolled
              decision.
            </p>
            <div className="space-y-6">
              {pocs.map((p) => (
                <ProjectRow key={p.slug} project={p} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="px-8 py-24 bg-ink text-inverse-on-surface">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-3">
            Have something that needs building
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold leading-[1.1] mb-6">
            The next receipt could be yours
            <span className="text-primary italic">.</span>
          </h2>
          <p className="text-xl text-white/70 mb-10">
            Products, Salesforce and RevOps systems, AI with a harness, enterprise integrations.
            Book a working session and we&apos;ll scope the smallest complete build that moves a real
            outcome.
          </p>
          <Link
            href="/appointments"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-full font-bold text-lg"
          >
            Book a Working Session
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </section>
    </>
  );
}
