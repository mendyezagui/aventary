"use client";

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
 * Inline Calendly embed, themed to the Aventary brand (gold primary on
 * off-white). We call initInlineWidget explicitly so it works reliably on
 * client-side navigation and regardless of script-load timing.
 */
export default function CalendlyEmbed({ url }: { url?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const base = url || "https://calendly.com/mendy-aventary";
  const themed =
    `${base}?hide_gdpr_banner=1&background_color=f7f7f7&text_color=1a1a1a&primary_color=c9a66b`;

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
    <section className="px-8 pb-24">
      <div className="max-w-5xl mx-auto">
        <div
          ref={ref}
          className="rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-container-lowest"
          style={{ minWidth: "320px", height: "760px" }}
        />
      </div>
    </section>
  );
}
