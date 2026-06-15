"use client";

import Script from "next/script";

/**
 * Inline Calendly embed, themed to the Aventary brand (gold primary on
 * off-white). Calendly's widget.js auto-initializes any `.calendly-inline-widget`
 * element it finds via the `data-url` attribute once it loads.
 */
export default function CalendlyEmbed({ url }: { url?: string }) {
  const base = url || "https://calendly.com/mendy-aventary";
  const themed =
    `${base}?hide_gdpr_banner=1&background_color=f7f7f7&text_color=1a1a1a&primary_color=c9a66b`;

  return (
    <section className="px-8 pb-24">
      <div className="max-w-5xl mx-auto">
        <div
          className="calendly-inline-widget rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-container-lowest"
          data-url={themed}
          style={{ minWidth: "320px", height: "760px" }}
        />
      </div>
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
      />
    </section>
  );
}
