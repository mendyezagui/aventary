
import { marked } from "marked";import Link from "next/link";
import type { Block } from "@/lib/cms";
import ContactForm from "./ContactForm";

export function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":         return <Hero {...(block.data as any)} />;
    case "services":     return <ServicesBento {...(block.data as any)} />;
    case "stats":        return <StatsStrip {...(block.data as any)} />;
    case "why":          return <WhyAventary {...(block.data as any)} />;
    case "rich_text":    return <RichText md={block.data.md} />;
    case "cta":          return <BigCta {...(block.data as any)} />;
    case "form_anchor":  return <FormAnchor source={block.data?.source} />;
    default:             return null;
  }
}

/* ---------------------------- HERO ---------------------------- */
function Hero({
  eyebrow, headline, accent, sub, ctaLabel, ctaHref, secondaryLabel, secondaryHref, image, chip
}: any) {
  return (
    <section className="relative min-h-[760px] flex items-center px-8 overflow-hidden bg-ink text-inverse-on-surface">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-24">
        <div className="lg:col-span-7 z-10">
          {eyebrow ? (
            <div className="inline-flex items-center px-4 py-1.5 rounded-[2px] border border-primary/25 bg-primary/5 font-label text-xs tracking-[0.22em] uppercase text-primary mb-8">
              <span className="mr-2.5 flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
              {eyebrow}
            </div>
          ) : null}
          <h1 className="font-headline text-5xl md:text-7xl font-medium text-inverse-on-surface editorial-gap leading-[1.08] mb-8">
            {headline}
            {accent ? <> <span className="text-primary italic font-normal">{accent}</span></> : null}
          </h1>
          {sub ? (
            <p className="text-lg text-white/55 max-w-xl mb-12 leading-relaxed">{sub}</p>
          ) : null}
          <div className="flex flex-wrap gap-4">
            {ctaLabel && ctaHref ? (
              <Link
                href={ctaHref}
                className="bg-primary text-on-primary px-9 py-4 rounded-[2px] font-label font-semibold text-xs tracking-[0.16em] uppercase hover:opacity-90 transition-all inline-flex items-center gap-2"
              >
                {ctaLabel}
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            ) : null}
            {secondaryLabel && secondaryHref ? (
              <Link
                href={secondaryHref}
                className="border border-white/25 text-inverse-on-surface px-9 py-4 rounded-[2px] font-label font-semibold text-xs tracking-[0.16em] uppercase hover:bg-white/5 transition-all"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
        {image ? (
          <div className="lg:col-span-5 relative">
            <div className="aspect-[4/5] rounded-xl overflow-hidden relative lg:translate-x-12 ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={image.alt ?? ""} src={image.src} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
            </div>
            {chip ? (
              <div className="absolute -bottom-6 -left-12 bg-ink/90 backdrop-blur border border-white/10 p-6 rounded-lg max-w-xs hidden md:block">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-[2px] bg-primary/15 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">{chip.icon ?? "monitoring"}</span>
                  </div>
                  <span className="font-headline font-medium text-lg text-inverse-on-surface">{chip.title}</span>
                </div>
                <p className="text-sm text-white/55">{chip.body}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ---------------------------- SERVICES BENTO ---------------------------- */
function ServicesBento({ heading, sub, tiles, leadership, ai, technology }: any) {
  return (
    <section className="py-32 px-8 bg-surface-container-low">
      <div className="max-w-7xl mx-auto">
        <div className="mb-20">
          <h2 className="font-headline text-4xl md:text-5xl font-bold mb-6">{heading}</h2>
          {sub ? <p className="text-lg text-on-surface-variant max-w-2xl">{sub}</p> : null}
        </div>

        {(leadership || ai || technology) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          {leadership ? (
            <div className="md:col-span-2 group relative bg-surface-container-lowest p-10 rounded-xl soft-lift border border-outline-variant/40 flex flex-col justify-between overflow-hidden">
              <div className="z-10 relative">
                <div className="text-accent font-label font-semibold text-xs tracking-[0.22em] uppercase mb-4">
                  {leadership.eyebrow ?? "Leadership"}
                </div>
                <h3 className="font-headline text-3xl font-bold mb-6">{leadership.title}</h3>
                <p className="text-on-surface-variant max-w-md mb-8">{leadership.body}</p>
                {leadership.bullets?.length ? (
                  <ul className="space-y-3 mb-12">
                    {leadership.bullets.map((b: string, i: number) => (
                      <li key={i} className="flex items-center gap-3 text-on-surface font-medium">
                        <span className="material-symbols-outlined text-accent text-base">check_circle</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {leadership.bgImage ? (
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 group-hover:opacity-20 transition-opacity">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" className="w-full h-full object-cover grayscale" src={leadership.bgImage} />
                </div>
              ) : null}
              {leadership.ctaHref ? (
                <Link
                  href={leadership.ctaHref}
                  className="w-fit text-on-surface font-semibold text-sm flex items-center gap-2 group/btn relative z-10"
                >
                  {leadership.ctaLabel ?? "Learn more"}
                  <span className="material-symbols-outlined text-accent text-lg transition-transform group-hover/btn:translate-x-1">
                    arrow_right_alt
                  </span>
                </Link>
              ) : null}
            </div>
          ) : null}

          {ai ? (
            <div className="bg-ink text-inverse-on-surface p-10 rounded-xl flex flex-col justify-between relative overflow-hidden">
              <div className="z-10 relative">
                <div className="text-primary font-label font-semibold text-xs tracking-[0.22em] uppercase mb-4">
                  {ai.eyebrow ?? "Innovation"}
                </div>
                <h3 className="font-headline text-3xl font-medium mb-6">{ai.title}</h3>
                <p className="text-white/65 mb-8">{ai.body}</p>
              </div>
              <div className="absolute -right-10 -bottom-10 text-primary/10">
                <span className="material-symbols-outlined text-[12rem]">{ai.icon ?? "neurology"}</span>
              </div>
              {ai.ctaHref ? (
                <Link
                  href={ai.ctaHref}
                  className="bg-primary text-on-primary px-6 py-3 rounded-[2px] font-label font-semibold text-xs tracking-[0.16em] uppercase w-full text-center hover:opacity-90 transition-opacity relative z-10"
                >
                  {ai.ctaLabel ?? "Get started"}
                </Link>
              ) : null}
            </div>
          ) : null}

          {technology ? (
            <div className="bg-surface-container-highest p-10 rounded-xl soft-lift flex flex-col justify-between">
              <div>
                <div className="text-on-surface-variant font-label font-bold text-sm tracking-widest uppercase mb-4">
                  {technology.eyebrow ?? "Technology"}
                </div>
                <h3 className="font-headline text-3xl font-bold mb-6">{technology.title}</h3>
                <p className="text-on-surface-variant mb-8">{technology.body}</p>
              </div>
              {technology.tiles?.length ? (
                <div className="space-y-4">
                  {technology.tiles.map((t: any, i: number) => (
                    <div key={i} className="p-4 bg-surface-container rounded-xl flex items-center justify-between">
                      <span className="font-bold">{t.label}</span>
                      <span className="material-symbols-outlined text-on-surface-variant">{t.icon}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

        </div>
        ) : null}

        {tiles?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tiles.map((t: any, i: number) => (
              <Link
                key={i}
                href={t.href ?? "#"}
                className="group relative bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/40 flex flex-col hover:-translate-y-1 hover:border-primary/40 transition-all"
              >
                <div className="w-11 h-11 rounded-[2px] bg-primary-fixed flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-accent">{t.icon ?? "bolt"}</span>
                </div>
                {t.eyebrow ? (
                  <div className="text-accent font-label font-semibold text-[11px] tracking-[0.22em] uppercase mb-3">
                    {t.eyebrow}
                  </div>
                ) : null}
                <h3 className="font-headline text-xl font-semibold mb-3">{t.title}</h3>
                {t.body ? <p className="text-on-surface-variant text-sm mb-8 flex-1 leading-relaxed">{t.body}</p> : null}
                <span className="mt-auto text-on-surface font-semibold text-sm flex items-center gap-2">
                  {t.ctaLabel ?? "Explore"}
                  <span className="material-symbols-outlined text-accent text-lg transition-transform group-hover:translate-x-1">
                    arrow_right_alt
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ---------------------------- STATS STRIP ---------------------------- */
function StatsStrip({ left, right }: any) {
  if (!left && !right) return null;
  return (
    <section className="px-8 pb-32 bg-surface-container-low -mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="bg-inverse-surface text-inverse-on-surface p-12 rounded-xl flex flex-col md:flex-row items-center gap-12 overflow-hidden">
          {left ? (
            <div className="flex-1">
              <div className="text-5xl font-headline font-bold mb-2">{left.metric}</div>
              <div className="text-lg font-medium text-surface-variant mb-6">{left.label}</div>
              {left.quote ? <p className="text-surface-variant/70 italic">"{left.quote}"</p> : null}
            </div>
          ) : null}
          {left && right ? <div className="h-48 w-px bg-outline-variant/20 hidden md:block" /> : null}
          {right ? (
            <div className="flex-1">
              <div className="text-5xl font-headline font-bold mb-2">{right.metric}</div>
              <div className="text-lg font-medium text-surface-variant mb-6">{right.label}</div>
              {right.ctaHref ? (
                <Link href={right.ctaHref} className="text-primary font-semibold border-b border-primary/60 pb-0.5 hover:border-primary transition-colors">
                  {right.ctaLabel ?? "Learn more"}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- WHY AVENTARY ---------------------------- */
function WhyAventary({ heading, items, image }: any) {
  return (
    <section className="py-32 px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        {image ? (
          <div className="relative">
            <div className="relative z-10 rounded-xl overflow-hidden soft-lift">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="w-full aspect-square object-cover" src={image.src} alt={image.alt ?? ""} />
            </div>
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl" />
          </div>
        ) : null}
        <div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold mb-10 editorial-gap">{heading}</h2>
          <div className="space-y-12">
            {(items ?? []).map((it: any, i: number) => (
              <div key={i} className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-[2px] bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-accent">{it.icon ?? "psychology"}</span>
                </div>
                <div>
                  <h4 className="font-headline text-xl font-bold mb-2">{it.title}</h4>
                  <p className="text-on-surface-variant leading-relaxed">{it.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- RICH TEXT ---------------------------- */
function RichText({ md }: { md: string }) {
  const html = marked.parse(md ?? "", { async: false }) as string;
  return (
    <section className="px-8 py-12">
      <div
        className="max-w-3xl mx-auto text-lg leading-relaxed text-on-surface-variant [&_h2]:font-headline [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-bold [&_h2]:text-on-surface [&_h2]:pt-8 [&_h2]:mb-3 [&_h3]:font-headline [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-on-surface [&_h3]:pt-6 [&_h3]:mb-3 [&_p]:my-5 [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-5 [&_ul>li]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-5 [&_ol>li]:my-2 [&_strong]:font-bold [&_strong]:text-on-surface [&_em]:italic"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

/* ---------------------------- BIG CTA ---------------------------- */
function BigCta({ headline, accent, sub, ctaLabel, ctaHref }: any) {
  return (
    <section className="py-24 px-8">
      <div className="max-w-5xl mx-auto bg-ink text-inverse-on-surface rounded-2xl p-12 md:p-20 text-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="font-headline text-4xl md:text-6xl font-medium mb-8 editorial-gap">
            {headline}
            {accent ? <> <span className="text-primary italic font-normal">{accent}</span></> : null}
          </h2>
          {sub ? (
            <p className="text-lg text-white/60 mb-12 max-w-2xl mx-auto">{sub}</p>
          ) : null}
          {ctaLabel && ctaHref ? (
            <Link
              href={ctaHref}
              className="bg-primary text-on-primary px-10 py-4 rounded-[2px] font-label font-semibold text-sm tracking-[0.16em] uppercase hover:opacity-90 transition-opacity inline-block"
            >
              {ctaLabel}
            </Link>
          ) : null}
        </div>
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute top-10 right-10 w-96 h-96 border-[40px] border-primary rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 border-[20px] border-primary rounded-full" />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- FORM ANCHOR ---------------------------- */
function FormAnchor({ source }: { source?: string }) {
  return (
    <section id="contact-form" className="px-8 pb-24">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 bg-surface-container-lowest p-10 rounded-xl soft-lift">
          <ContactForm source={source ?? "contact"} />
        </div>
        <aside className="lg:col-span-5 space-y-6">
          <div className="bg-primary text-on-primary p-8 rounded-xl">
            <div className="font-label text-xs tracking-widest uppercase opacity-80 mb-4">Direct</div>
            <p className="font-headline text-2xl font-bold mb-2">hello@aventary.com</p>
            <p className="opacity-80 text-sm">We reply to every inquiry within one business day.</p>
          </div>
          <div className="bg-surface-container-high p-8 rounded-xl">
            <div className="font-label text-xs tracking-widest uppercase text-on-surface-variant mb-4">
              Prefer a call?
            </div>
            <p className="text-on-surface mb-6">
              Skip the form and book a 30-minute strategy call directly.
            </p>
            <Link
              href="/appointments"
              className="bg-ink text-inverse-on-surface px-6 py-3 rounded-[2px] font-label font-semibold text-xs tracking-[0.16em] uppercase inline-block hover:opacity-90 transition"
            >
              Book now
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
