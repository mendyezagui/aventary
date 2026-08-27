"use client";

import { useState } from "react";
import { type Project, INDUSTRIES, INDUSTRY_BY_SLUG } from "@/lib/work";

type Capability = { key: string; label: string; icon: string };

const GROUPS: { key: Project["category"]; label: string }[] = [
  { key: "engagement", label: "Client engagements" },
  { key: "poc", label: "Enterprise POCs & AI systems" },
  { key: "product", label: "Products I own and run" },
];

export default function WorkExplorer({
  projects,
  capabilities,
}: {
  projects: Project[];
  capabilities: Capability[];
}) {
  const [lens, setLens] = useState<"capability" | "industry">("capability");
  const [active, setActive] = useState<string | null>(null);
  const capLabel = (k: string) => capabilities.find((c) => c.key === k)?.label ?? k;

  const lensChips = lens === "capability" ? capabilities : INDUSTRIES;
  const matches = (p: Project, key: string) =>
    lens === "capability" ? p.tags.includes(key) : INDUSTRY_BY_SLUG[p.slug] === key;
  const countFor = (key: string) => projects.filter((p) => matches(p, key)).length;

  const shown = active ? projects.filter((p) => matches(p, active)) : projects;
  const featured = shown.filter((p) => p.featured);
  const rest = shown.filter((p) => !p.featured);

  const switchLens = (next: "capability" | "industry") => {
    setLens(next);
    setActive(null);
  };

  return (
    <>
      {/* FILTERS ON TOP */}
      <section className="px-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="text-accent font-label font-bold text-xs tracking-widest uppercase">
              One operator, many use cases — filter by {lens}
            </div>
            {/* Lens toggle: capability ⇄ industry */}
            <div className="inline-flex rounded-full bg-surface-container-high p-1 font-label text-xs font-semibold">
              {(["capability", "industry"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => switchLens(l)}
                  aria-pressed={lens === l}
                  className={`px-4 py-1.5 rounded-full transition-colors ${
                    lens === l
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {l === "capability" ? "By capability" : "By industry"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <FilterChip
              label="All work"
              icon="apps"
              isActive={active === null}
              count={projects.length}
              onClick={() => setActive(null)}
            />
            {lensChips.map((c) => {
              const n = countFor(c.key);
              if (!n) return null;
              return (
                <FilterChip
                  key={c.key}
                  label={c.label}
                  icon={c.icon}
                  isActive={active === c.key}
                  count={n}
                  onClick={() => setActive(active === c.key ? null : c.key)}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURED SPOTLIGHT */}
      {featured.length ? (
        <section className="px-8 pb-14">
          <div className="max-w-7xl mx-auto space-y-6">
            {featured.map((p) => (
              <FeaturedCard key={p.slug} project={p} capLabel={capLabel} />
            ))}
          </div>
        </section>
      ) : null}

      {/* CATALOG */}
      <section className="px-8 pb-16">
        <div className="max-w-7xl mx-auto space-y-14">
          {GROUPS.map((g) => {
            const items = rest.filter((p) => p.category === g.key);
            if (!items.length) return null;
            return (
              <div key={g.key}>
                <div className="flex items-baseline justify-between gap-4 mb-6">
                  <h2 className="font-headline text-2xl md:text-3xl font-bold leading-[1.1]">
                    {g.label}
                  </h2>
                  <span className="font-label text-xs tracking-widest uppercase text-on-surface-variant">
                    {items.length}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {items.map((p) => (
                    <WorkCard key={p.slug} project={p} capLabel={capLabel} />
                  ))}
                </div>
              </div>
            );
          })}
          {!shown.length ? (
            <p className="text-on-surface-variant text-[15px]">No work under that filter yet.</p>
          ) : null}
        </div>
      </section>
    </>
  );
}

function FilterChip({
  label,
  icon,
  isActive,
  count,
  onClick,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-label font-semibold transition-colors ${
        isActive
          ? "bg-primary text-on-primary"
          : "bg-surface-container-lowest text-on-surface soft-lift hover:bg-surface-container-high"
      }`}
    >
      <span className="material-symbols-outlined text-base">{icon}</span>
      {label}
      <span className={`text-[11px] ${isActive ? "text-on-primary/70" : "text-on-surface-variant"}`}>
        {count}
      </span>
    </button>
  );
}

/** Client / delivery line, e.g. "TRIMBLE · via Toptal". */
function ClientLine({ project: p }: { project: Project }) {
  if (!p.client) return null;
  return (
    <div className="font-label text-[10px] tracking-[0.16em] uppercase text-accent font-bold">
      {p.client}
      {p.via ? <span className="text-on-surface-variant font-semibold"> · {p.via}</span> : null}
    </div>
  );
}

/** Real metrics only — renders nothing when a project has none. */
function Metrics({ project: p, size = "sm" }: { project: Project; size?: "sm" | "lg" }) {
  if (!p.metrics || !p.metrics.length) return null;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3">
      {p.metrics.map((m) => (
        <div key={m.label}>
          <div
            className={`font-headline font-bold text-primary leading-none ${
              size === "lg" ? "text-2xl md:text-3xl" : "text-xl"
            }`}
          >
            {m.value}
          </div>
          <div className="font-label text-[10px] tracking-wide uppercase text-on-surface-variant mt-1">
            {m.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Footer actions: live link + "Watch demo" video, else a tasteful on-request line. */
function CardActions({ project: p }: { project: Project }) {
  const hasLive = !!p.liveUrl;
  const hasVideo = !!p.video;

  if (!hasLive && !hasVideo) {
    return (
      <a
        href="/appointments"
        className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface font-label font-semibold text-[11px] tracking-wide uppercase transition-colors"
      >
        <span className="material-symbols-outlined text-base">lock</span>
        Walkthrough available on request
      </a>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {hasLive ? (
        <a
          href={p.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-primary font-bold text-sm"
        >
          {p.liveLabel ?? "Visit"}
          <span className="material-symbols-outlined text-base">north_east</span>
        </a>
      ) : null}
      {hasVideo ? (
        <a
          href={p.video}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-on-surface font-bold text-sm"
        >
          <span className="material-symbols-outlined text-base text-primary">play_circle</span>
          {p.videoLabel ?? "Watch demo"}
        </a>
      ) : null}
    </div>
  );
}

/** Shared expandable detail: problem / build / result / receipts / stack. */
function Details({ project: p }: { project: Project }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none font-label text-[11px] tracking-widest uppercase text-primary flex items-center gap-1 select-none">
        <span className="material-symbols-outlined text-base transition-transform group-open:rotate-90">
          chevron_right
        </span>
        Details &amp; receipts
      </summary>
      <div className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-on-surface-variant">
        {(
          [
            ["Problem", p.problem],
            ["Build", p.build],
            ["Result", p.result],
          ] as const
        ).map(([l, t]) => (
          <p key={l}>
            <span className="font-label font-bold text-[10px] tracking-widest uppercase text-accent mr-2">
              {l}
            </span>
            {t}
          </p>
        ))}
        <ul className="space-y-1.5 pt-1">
          {p.receipts.map((r) => (
            <li key={r} className="flex gap-2 text-on-surface text-[13px]">
              <span className="material-symbols-outlined text-primary text-sm leading-5 flex-shrink-0">
                check_circle
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {p.stack.map((s) => (
            <span
              key={s}
              className="font-label text-[10px] tracking-wide text-on-surface-variant border border-outline-variant rounded px-2 py-0.5"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </details>
  );
}

/** Featured spotlight — wider, metrics up front. */
function FeaturedCard({
  project: p,
  capLabel,
}: {
  project: Project;
  capLabel: (k: string) => string;
}) {
  return (
    <article className="bg-surface-container-lowest rounded-3xl soft-lift overflow-hidden grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] ring-1 ring-primary/30">
      {/* Cover */}
      <div className="relative bg-ink p-7 flex flex-col justify-between min-h-[240px]">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 w-64 h-64 rounded-full blur-2xl opacity-30"
          style={{ background: "radial-gradient(circle, #C9A66B 0%, transparent 70%)" }}
        />
        <div className="relative flex items-center justify-between">
          <span className="material-symbols-outlined text-primary text-4xl">{p.icon}</span>
          <span className="font-label text-[10px] tracking-[0.16em] uppercase text-on-primary bg-primary rounded-full px-3 py-1 font-bold">
            Featured
          </span>
        </div>
        <div className="relative">
          <div className="font-label text-[10px] tracking-[0.22em] uppercase text-white/50 mb-2">
            {p.status}
          </div>
          <div className="font-headline text-2xl md:text-3xl font-bold text-inverse-on-surface leading-tight">
            {p.client ?? p.name}
          </div>
          {p.via ? (
            <div className="font-label text-[10px] tracking-[0.18em] uppercase text-primary mt-2">
              {p.via}
            </div>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="p-7 md:p-9 flex flex-col">
        <h3 className="font-headline text-2xl md:text-3xl font-bold leading-tight">{p.name}</h3>
        <p className="font-headline italic text-on-surface-variant mt-1 mb-5">{p.tagline}</p>

        <div className="mb-6">
          <Metrics project={p} size="lg" />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {p.tags.map((t) => (
            <span
              key={t}
              className="bg-surface-container-high text-on-surface-variant rounded-full px-2.5 py-0.5 font-label text-[10px] tracking-wide"
            >
              {capLabel(t)}
            </span>
          ))}
        </div>

        <p className="text-sm text-on-surface-variant mb-5">
          <span className="text-accent font-label font-bold text-[10px] tracking-widest uppercase mr-2">
            Proves
          </span>
          {p.proves}
        </p>

        <div className="mb-5">
          <Details project={p} />
        </div>

        <div className="mt-auto pt-4 border-t border-outline-variant">
          <CardActions project={p} />
        </div>
      </div>
    </article>
  );
}

/** Compact catalog card. */
function WorkCard({
  project: p,
  capLabel,
}: {
  project: Project;
  capLabel: (k: string) => string;
}) {
  return (
    <article className="bg-surface-container-lowest rounded-3xl soft-lift overflow-hidden flex flex-col">
      {/* Compact branded cover */}
      <div className="relative bg-ink px-5 py-4 flex items-center justify-between">
        <div
          aria-hidden
          className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-2xl opacity-25"
          style={{ background: "radial-gradient(circle, #C9A66B 0%, transparent 70%)" }}
        />
        <span className="material-symbols-outlined text-primary text-3xl relative">{p.icon}</span>
        <span className="relative font-label text-[9px] tracking-[0.16em] uppercase text-white/60 border border-white/15 rounded-full px-2.5 py-1">
          {p.status}
        </span>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <ClientLine project={p} />
        <h3 className="font-headline text-xl font-bold leading-tight mt-1">{p.name}</h3>
        <p className="font-headline italic text-on-surface-variant text-sm mt-1 mb-4">{p.tagline}</p>

        {p.metrics && p.metrics.length ? (
          <div className="mb-4">
            <Metrics project={p} />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5 mb-4">
          {p.tags.map((t) => (
            <span
              key={t}
              className="bg-surface-container-high text-on-surface-variant rounded-full px-2.5 py-0.5 font-label text-[10px] tracking-wide"
            >
              {capLabel(t)}
            </span>
          ))}
        </div>

        <p className="text-sm text-on-surface-variant mb-4">
          <span className="text-accent font-label font-bold text-[10px] tracking-widest uppercase mr-2">
            Proves
          </span>
          {p.proves}
        </p>

        <div className="mb-4">
          <Details project={p} />
        </div>

        <div className="mt-auto pt-4 border-t border-outline-variant">
          <CardActions project={p} />
        </div>
      </div>
    </article>
  );
}
