import type { Page } from "./cms";

const HERO_IMG = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80&auto=format&fit=crop";
const BENTO_BG = "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=900&q=80&auto=format&fit=crop";
const ABOUT_SQ = "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&q=80&auto=format&fit=crop";
const TEAM_IMG = "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80&auto=format&fit=crop";

/**
 * Seed content used when Supabase isn't configured yet (e.g. local `next dev`
 * before the first DB migration). Mirrors supabase/migrations/0002_seed.sql.
 */
export const SEED: Record<string, Page> = {
  home: {
    id: "seed-home",
    slug: "home",
    title: "Aventary | AI-Driven Leadership & Strategy",
    description:
      "AI-first product strategy, fractional CPO/CTO leadership, and RevOps systems for non-tech companies.",
    blocks: [
      { id: "h", type: "hero", position: 0, data: {
        eyebrow: "AI-First Fractional Leadership",
        headline: "30% of Your Leads Aren't Being",
        accent: "Contacted.",
        sub: "Aventary builds AI-first product strategies, fractional CPO/CTO leadership, and RevOps systems for non-tech companies — every lead contacted, every time.",
        ctaLabel: "Book a Call", ctaHref: "/appointments",
        secondaryLabel: "Our Approach", secondaryHref: "/about",
        image: { src: HERO_IMG, alt: "Strategic Leadership" },
        chip: { icon: "monitoring", title: "RevOps Insight",
                body: "AI-driven lead routing keeps every inbound contacted within minutes." }
      }},
      { id: "s", type: "services", position: 1, data: {
        heading: "What We Do",
        sub: "Executive-level product, technology, and revenue leadership — without the full-time overhead.",
        leadership: {
          eyebrow: "Leadership",
          title: "Fractional CPO & Product Leadership",
          body: "We deliver technology leadership, so your team never has to figure out the tech stack alone.",
          bullets: ["Product roadmap acceleration", "GTM strategy & execution"],
          bgImage: BENTO_BG,
          ctaLabel: "Explore CPO services", ctaHref: "/contact"
        },
        ai: {
          eyebrow: "Innovation",
          title: "AI Strategy & RevOps",
          body: "AI-driven revenue operations and lead routing systems. Every lead contacted. Every time.",
          icon: "neurology",
          ctaLabel: "Build Your Pipeline", ctaHref: "/appointments"
        },
        technology: {
          eyebrow: "Technology",
          title: "Fractional CTO for Non-Tech Companies",
          body: "Executive-level clarity and execution — without the full-time overhead.",
          tiles: [
            { label: "Cloud infra", icon: "cloud" },
            { label: "Tech audit", icon: "fact_check" }
          ]
        }
      }},
      { id: "st", type: "stats", position: 2, data: {
        left:  { metric: "30%", label: "of inbound leads are never contacted at most companies. We close that gap.",
                 quote: "Aventary didn't just patch our pipeline — they rebuilt our revenue engine." },
        right: { metric: "24h", label: "Typical first response. We reply to every inquiry within one business day.",
                 ctaLabel: "Read our insights", ctaHref: "/insights" }
      }},
      { id: "w", type: "why", position: 3, data: {
        heading: "Why Aventary?",
        image: { src: ABOUT_SQ, alt: "Boardroom" },
        items: [
          { icon: "psychology", title: "AI-First by Design",
            body: "Every engagement starts with one question: where is your business losing leverage? Most of the time, the answer involves AI." },
          { icon: "speed", title: "Operator Experience",
            body: "Roots at PwC and deep experience leading product and technology initiatives across industries. Executive clarity, embedded with your team." },
          { icon: "shield_with_heart", title: "Built to Last",
            body: "We bring structure, speed, and strategy — and leave systems your team can run long after we're gone." }
        ]
      }},
      { id: "c", type: "cta", position: 4, data: {
        headline: "Ready to fix your", accent: "lead pipeline?",
        sub: "Book a confidential strategy call. We reply within 24 hours.",
        ctaLabel: "Book a Call Now", ctaHref: "/appointments"
      }}
    ]
  },

  about: {
    id: "seed-about",
    slug: "about",
    title: "Who We Are",
    description: "Aventary helps non-tech companies compete like tech companies — AI-first by design.",
    blocks: [
      { id: "h", type: "hero", position: 0, data: {
        eyebrow: "About Aventary",
        headline: "Who We", accent: "Are.",
        sub: "Executive-level product and technology leadership for companies ready to grow.",
        image: { src: TEAM_IMG, alt: "Team at work" }
      }},
      { id: "r", type: "rich_text", position: 1, data: {
        md: `Mendy Ezagui founded Aventary with one mission: help non-tech companies compete like tech companies. He assembled a team of operators, strategists, and technologists to make that happen at scale.

With roots at PwC and deep experience leading product and technology initiatives across industries, our team brings executive-level clarity and execution — without the full-time overhead.

We serve as Fractional CPO and Fractional CTO for founders and operators who need real leadership, not just another vendor. Every engagement starts with one question: where is your business losing leverage? Most of the time, the answer involves AI.

Aventary is AI-first by design. Whether it's fixing a broken lead pipeline, streamlining operations, or building a product roadmap that actually ships — we bring structure, speed, and strategy to companies ready to grow.`
      }},
      { id: "c", type: "cta", position: 2, data: {
        headline: "Interested in working", accent: "together?",
        sub: "Fill out some info and we will be in touch shortly.",
        ctaLabel: "Contact us", ctaHref: "/contact"
      }}
    ]
  },

  contact: {
    id: "seed-contact",
    slug: "contact",
    title: "Let's Talk",
    description: "Ready to fix your lead pipeline or explore what AI can do for your business?",
    blocks: [
      { id: "h", type: "hero", position: 0, data: {
        eyebrow: "Reply within 24 hours",
        headline: "Let's", accent: "Talk.",
        sub: "Ready to fix your lead pipeline or explore what AI can do for your business? Share a bit about where you are and what you're working toward."
      }},
      { id: "f", type: "form_anchor", position: 1, data: { source: "contact" } }
    ]
  },

  appointments: {
    id: "seed-appointments",
    slug: "appointments",
    title: "Secure your spot",
    description: "Transform your business landscape with our cutting-edge consulting approach.",
    blocks: [
      { id: "h", type: "hero", position: 0, data: {
        eyebrow: "Schedule a Call",
        headline: "Secure your", accent: "spot.",
        sub: "Transform your business landscape with our cutting-edge consulting approach. Schedule an appointment today and unlock insight-driven strategies tailored to reach new heights."
      }},
      { id: "f", type: "form_anchor", position: 1, data: { source: "appointments" } }
    ]
  }
};
