"use client";

import Link from "next/link";
import { useState } from "react";

const TRACK_LABEL: Record<string, string> = {
  exclusive: "Aventary Exclusive",
  external: "From the Field"
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return "";
  }
}

function PostCard({
  p,
  featured = false,
  hidden = false
}: {
  p: any;
  featured?: boolean;
  hidden?: boolean;
}) {
  return (
    <Link
      href={`/insights/${p.slug}`}
      className={`group bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/40 hover:border-primary/40 hover:-translate-y-1 transition-all ${
        hidden ? "hidden" : "block"
      }`}
    >
      {p.cover_url ? (
        <div className="aspect-[16/9] rounded-lg overflow-hidden mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.cover_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : null}
      <div className="text-accent font-label font-semibold text-[11px] tracking-[0.22em] uppercase mb-3 flex items-center gap-2">
        <span>{TRACK_LABEL[p.track] ?? "Insights"}</span>
        {p.published_at ? (
          <>
            <span aria-hidden="true">·</span>
            <time dateTime={p.published_at}>{formatDate(p.published_at)}</time>
          </>
        ) : null}
      </div>
      <h2 className={`font-headline ${featured ? "text-3xl" : "text-2xl"} font-semibold mb-3`}>
        {p.title}
      </h2>
      {p.excerpt ? (
        <p className="text-on-surface-variant text-sm leading-relaxed">{p.excerpt}</p>
      ) : null}
    </Link>
  );
}

type Filter = "all" | "exclusive" | "external";

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "exclusive", label: "Aventary Exclusive" },
  { key: "external", label: "From the Field" }
];

/**
 * Client-side track filter, defaulting to Aventary Exclusive so our own work
 * leads. Every post is still rendered into the DOM and merely hidden with CSS
 * when filtered out, so crawlers and AI engines keep seeing (and following)
 * the full list rather than only the default track.
 */
export default function InsightsFilter({ posts }: { posts: any[] }) {
  const [filter, setFilter] = useState<Filter>("exclusive");

  const featured = posts.filter((p) => p.pinned);
  const rest = posts.filter((p) => !p.pinned);

  const counts: Record<Filter, number> = {
    all: rest.length,
    exclusive: rest.filter((p) => p.track !== "external").length,
    external: rest.filter((p) => p.track === "external").length
  };

  const matches = (p: any) =>
    filter === "all" || (filter === "external" ? p.track === "external" : p.track !== "external");

  return (
    <>
      {featured.length ? (
        <section className="px-8 pb-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-accent font-label font-semibold text-xs tracking-[0.22em] uppercase mb-6">
              Featured
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {featured.map((p) => (
                <PostCard key={p.slug} p={p} featured />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <div
            role="tablist"
            aria-label="Filter insights by track"
            className="flex flex-wrap items-center gap-2 mb-10 border-b border-outline-variant/40 pb-6"
          >
            {TABS.map((t) => {
              const active = filter === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(t.key)}
                  className={`font-label text-xs font-semibold tracking-[0.16em] uppercase px-5 py-2.5 rounded-[2px] border transition-colors ${
                    active
                      ? "bg-ink text-inverse-on-surface border-ink"
                      : "border-outline-variant/60 text-on-surface-variant hover:text-on-surface hover:border-on-surface/40"
                  }`}
                >
                  {t.label}
                  <span className={`ml-2 ${active ? "text-primary" : "text-on-surface-variant/60"}`}>
                    {counts[t.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {rest.map((p) => (
              <PostCard key={p.slug} p={p} hidden={!matches(p)} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
