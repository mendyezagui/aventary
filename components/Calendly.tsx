"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const SRC = "https://assets.calendly.com/assets/external/widget.js";
const CSS = "https://assets.calendly.com/assets/external/widget.css";

/** Load Calendly's widget script once, resolving when window.Calendly is ready. */
function loadCalendly(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    if ((window as any).Calendly) return resolve();

    if (!document.querySelector(`link[href="${CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(
      `script[src="${SRC}"]`
    ) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).Calendly) resolve();
      else existing.addEventListener("load", () => resolve());
      return;
    }

    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    document.body.appendChild(s);
  });
}

/**
 * Inline Calendly embed, framed in the Aventary brand system: the scheduler
 * sits in a clean card alongside a branded "what to expect" aside, mirroring
 * the contact page. Colors are themed via embed params (gold primary); the
 * in-widget account brand color is set in Calendly's own settings.
 */
export default function CalendlyEmbed({ url }: { url?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const base = url || "https://calendly.com/mendy-aventary";
  const themed =
    `${base}?hide_gdpr_banner=1&background_color=ffffff&text_color=1a1a1a&primary_color=c9a66b`;

  useEffect(() => {
    let cancelled = false;
    loadCalendly().then(() => {
      const C = (window as any).Calendly;
      if (cancelled || !C || !ref.current) return;
      ref.current.innerHTML = "";
      C.initInlineWidget({ url: themed, parentElement: ref.current });
    });
    return () => {
      cancelled = true;
    };
  }, [themed]);

  return (
    <section className="px-8 pb-28">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
          <div
            ref={ref}
            className="rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-container-lowest soft-lift"
            style={{ minWidth: "320px", height: "720px" }}
          />
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-ink text-inverse-on-surface rounded-xl p-8">
            <div className="text-primary font-label text-xs font-semibold tracking-[0.22em] uppercase mb-6">
              What to expect
            </div>
            <ul className="space-y-5">
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-primary text-xl shrink-0">schedule</span>
                <span className="text-white/70 text-sm leading-relaxed">A focused 30-minute strategy call — no slides, no pitch.</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-primary text-xl shrink-0">troubleshoot</span>
                <span className="text-white/70 text-sm leading-relaxed">We map where your pipeline and forecast are leaking revenue.</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                <span className="text-white/70 text-sm leading-relaxed">You leave with concrete next steps you can act on.</span>
              </li>
            </ul>
          </div>

          <div className="bg-surface-container-high rounded-xl p-8">
            <div className="font-label text-xs font-semibold tracking-[0.22em] uppercase text-on-surface-variant mb-3">
              Prefer email?
            </div>
            <p className="text-on-surface text-sm mb-6 leading-relaxed">
              Not ready to book? Send a note and we&apos;ll reply within one business day.
            </p>
            <Link
              href="/contact"
              className="bg-ink text-inverse-on-surface px-6 py-3 rounded-[2px] font-label font-semibold text-xs tracking-[0.16em] uppercase inline-block hover:opacity-90 transition"
            >
              Contact us
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
