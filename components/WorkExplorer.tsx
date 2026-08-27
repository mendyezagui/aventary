"use client";

import { useState } from "react";
import { type Project } from "@/lib/work";

type Capability = { key: string; label: string; icon: string };

const GROUPS: { key: Project["category"]; label: string }[] = [
  { key: "product", label: "Products I own and run" },
  { key: "engagement", label: "Client engagements" },
  { key: "poc", label: "Enterprise POCs & AI systems" },
];

export default function WorkExplorer({
  projects,
  capabilities,
}: {
  projects: Project[];
  capabilities: Capability[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const capLabel = (k: string) => capabilities.find((c) => c.key === k)?.label ?? k;
  const shown = active ? projects.filter((p) => p.tags.includes(active)) : projects;

  return (
    <>
      {/* FILTERS ON TOP */}
      <section className="px-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-accent font-label font-bold text-xs tracking-widest uppercase mb-4">
            One operator, many use cases — filter the catalog
          </div>
          <div className="flex flex-wrap gap-2.5">
            <FilterChip
              label="All work"
              icon="apps"
              isActive={active === null}
              count={projects.length}
              onClick={() => setActive(null)}
            />
            {capabilities.map((c) => {
              const n = projects.filter((p) => p.tags.includes(c.key)).length;
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

      {/* SMALLER CATALOG */}
      <section className="px-8 pb-16">
        <div className="max-w-7xl mx-auto space-y-14">
          {GROUPS.map((g) => {
            const items = shown.filter((p) => p.category === g.key);
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

function WorkCard({ project: p, capLabel }: { project: Project; capLabel: (k: string) => string }) {
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
        <h3 className="font-headline text-xl font-bold leading-tight">{p.name}</h3>
        <p className="font-headline italic text-on-surface-variant text-sm mt-1 mb-4">{p.tagline}</p>

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

        {/* Full detail on demand — keeps the catalog scannable */}
        <details className="group mb-4">
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

        <div className="mt-auto pt-4 border-t border-outline-variant">
          {p.liveUrl ? (
            <a
              href={p.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary font-bold text-sm"
            >
              {p.liveLabel ?? "Visit"}
              <span className="material-symbols-outlined text-base">north_east</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-on-surface-variant font-label font-semibold text-[11px] tracking-wide uppercase">
              <span className="material-symbols-outlined text-base">lock</span>
              Private engagement
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
