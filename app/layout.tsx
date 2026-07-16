import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const headline = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-headline",
  display: "swap"
});
const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.aventary.com"),
  title: { default: "Aventary | AI-Driven Leadership & Strategy", template: "%s — Aventary" },
  description:
    "Aventary builds AI-first product strategies, fractional CPO/CTO leadership, and RevOps systems for non-tech companies — every lead contacted, every time.",
  openGraph: {
    title: "Aventary",
    description:
      "Fractional CPO/CTO leadership, AI-first product strategy, and RevOps systems for non-tech companies that need to ship the AI bet without rebuilding the team.",
    url: "https://www.aventary.com",
    siteName: "Aventary",
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: "Aventary",
    description:
      "Fractional CPO/CTO leadership, AI-first product strategy, and RevOps systems. Every lead contacted, every time."
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Aventary",
  url: "https://aventary.com",
  logo: "https://aventary.com/icon.svg",
  image: "https://aventary.com/opengraph-image.png",
  slogan: "Strategy. AI. Impact.",
  description:
    "Aventary is an AI-first advisory firm providing fractional CPO/CTO leadership, AI product strategy, and revenue operations (RevOps) systems for non-tech and growth-stage companies.",
  email: "hello@aventary.com",
  founder: {
    "@type": "Person",
    name: "Mendy Ezagui",
    jobTitle: "Founder & Principal",
    sameAs: "https://www.toptal.com/product-managers/resume/mendy-ezagui"
  },
  areaServed: "US",
  knowsAbout: [
    "Revenue Operations",
    "Salesforce",
    "Agentforce",
    "AI strategy",
    "Fractional CPO",
    "Fractional CTO",
    "Lead routing",
    "Pipeline diagnostics",
    "Generative AI"
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Aventary offerings",
    itemListElement: [
      { "@type": "Offer", url: "https://aventary.com/lead-to-opp", itemOffered: { "@type": "Service", name: "Lead-to-Opportunity Framework" } },
      { "@type": "Offer", url: "https://aventary.com/command", itemOffered: { "@type": "Service", name: "RevOps Command Center" } },
      { "@type": "Offer", url: "https://aventary.com/diagnostics", itemOffered: { "@type": "Service", name: "Revenue Leak Detection Kit" } }
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${headline.variable} ${body.variable}`}>
      <body className="bg-background text-on-background font-body selection:bg-primary-fixed selection:text-on-primary-fixed">
        <script
          defer
          data-domain="aventary.com"
          src="https://plausible.io/js/script.outbound-links.file-downloads.js"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
