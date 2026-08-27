// ---------------------------------------------------------------------------
// Aventary — Work / Portfolio data
// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for shipped work + receipts. This file powers the
// /work page today and is shaped to be reused later by a pitch deck, a
// one-pager, or the Ask Aventary knowledge base.
//
// GROUND RULES (kept deliberately honest):
//   • `receipts` are factual, defensible proof points only — never invented.
//   • Client work is ANONYMIZED (no NDA-sensitive names). Own products are named.
//   • `metrics` are OMITTED unless a real number exists. See TODO(you) below.
//
// TODO(you) — to make this even stronger, hand me (or drop in) the real numbers
// and I'll wire them into the `metrics` field per project. Good candidates:
//   - Voitra:        demo calls handled, verticals live, pilot conversations
//   - Second Brain:  daily active use, tools/agents wired, waitlist signups
//   - Carpool Circle: families onboarded, rides coordinated, school(s) live
//   - TalkBoard:     children/boards created, sessions
//   - HOA MCP:       API calls/day, associations mapped, incidents caught
//   - Salesforce:    records under management, deploy cycle time saved
// TODO(you) — screenshots: drop a PNG at public/work/<slug>.png and set
//   `cover: "/work/<slug>.png"`. Until then each card renders a branded cover.
// ---------------------------------------------------------------------------

export type WorkCategory = "product" | "engagement" | "poc";

export type WorkMetric = { label: string; value: string };

export type Project = {
  slug: string;
  name: string;
  /** One-line positioning. */
  tagline: string;
  category: WorkCategory;
  /** "own product" vs anonymized client work. */
  ownership: "Aventary product" | "Client engagement";
  status: "Live" | "In production" | "Private / gated" | "Deployed POC";
  /** Live public URL, when there is one to show. */
  liveUrl?: string;
  /** Label for the primary link/button. */
  liveLabel?: string;
  /** Capability tags — drive the "many use cases" filtering/grouping. */
  tags: string[];
  /** The narrative: problem -> build -> result. */
  problem: string;
  build: string;
  result: string;
  /** Factual, defensible proof points. NEVER invented. */
  receipts: string[];
  /** Real, verifiable stats only. Omit if you don't have a true number yet. */
  metrics?: WorkMetric[];
  /** Tech underneath — the capability receipt for technical buyers. */
  stack: string[];
  /** One line: what this piece of work proves about the operator. */
  proves: string;
  /** Optional real screenshot path (public/work/<slug>.png). */
  cover?: string;
  /** Material Symbols icon name for the branded cover fallback. */
  icon: string;
};

// The capability lenses the work can be viewed through — powers grouping and
// the "one operator, many use cases" framing at the top of the page.
export const CAPABILITIES: { key: string; label: string; icon: string }[] = [
  { key: "ai-agents", label: "AI agents & orchestration", icon: "smart_toy" },
  { key: "salesforce", label: "Salesforce & RevOps", icon: "hub" },
  { key: "voice", label: "Voice AI", icon: "graphic_eq" },
  { key: "mobile", label: "Mobile & PWA", icon: "smartphone" },
  { key: "data", label: "Data & integrations", icon: "account_tree" },
  { key: "commerce", label: "E-commerce & workflow", icon: "shopping_bag" },
  { key: "compliance", label: "Compliance-grade builds", icon: "verified_user" },
];

export const PROJECTS: Project[] = [
  // ------------------------------------------------------------------ PRODUCTS
  {
    slug: "voitra",
    name: "Voitra",
    tagline: "AI voice agents for operations-heavy verticals.",
    category: "product",
    ownership: "Aventary product",
    status: "Live",
    liveUrl: "https://voitra.ai",
    liveLabel: "Visit voitra.ai",
    tags: ["ai-agents", "voice", "data"],
    problem:
      "Operations-heavy businesses — dispatch, NEMT, home services — lose revenue to missed and after-hours calls, and the humans who answer burn out on repetitive intake.",
    build:
      "A voice-AI product with per-vertical demo agents you can call from the site, a gated agent map that routes each industry to the right configuration, and a marketing site migrated entirely onto the same modern stack.",
    result:
      "Live at voitra.ai with callable vertical demos, fully off the old Webflow site and serving every route from one Next.js Worker codebase.",
    receipts: [
      "Live and callable at voitra.ai",
      "100% migrated off Webflow — all routes serve from the Next.js Worker",
      "Per-vertical demo agents wired to a gated agent map",
    ],
    stack: ["Next.js", "Cloudflare Workers", "Retell voice AI", "Supabase"],
    proves: "Can take an AI product from concept to a live, callable, self-serve demo.",
    icon: "graphic_eq",
  },
  {
    slug: "second-brain",
    name: "Second Brain",
    tagline: "An operating system for solo founders and operators.",
    category: "product",
    ownership: "Aventary product",
    status: "Live",
    liveUrl: "https://secondbrain-os.pages.dev",
    liveLabel: "See the product",
    tags: ["ai-agents", "data"],
    problem:
      "Solo operators run their whole business across a dozen tools with no system of record — context, tasks, and decisions leak everywhere and nothing compounds.",
    build:
      "A modular operator OS: a morning intelligence sweep, agent activity logs, a voice lab that records and transcribes, and control surfaces for connected systems — backed by Supabase, with a validate-first landing page and waitlist to demand-test the productized version.",
    result:
      "A daily-driver app plus a live productization test that turns a personal tool into a repeatable product motion.",
    receipts: [
      "Live app used as a daily driver, refactored from a single file into modular views",
      "Productization demand-test live with an insert-only waitlist",
      "Morning sweep + agent logs running against a real Supabase backend",
    ],
    stack: ["React", "Supabase", "Cloudflare Pages", "MCP", "Anthropic API"],
    proves: "Can design and ship a stateful, multi-surface app — and demand-test the business around it.",
    icon: "network_intelligence",
  },
  {
    slug: "carpool-circle",
    name: "Carpool Circle",
    tagline: "Live school-run coordination for five families, in daily use.",
    category: "product",
    ownership: "Aventary product",
    status: "Live",
    liveUrl: "https://carpoolcircle.com",
    liveLabel: "Visit carpoolcircle.com",
    tags: ["mobile", "data"],
    problem:
      "Five families coordinate a school run over group chat. Nobody knows who is driving, where the car is, or whether to send a child outside yet. A wrong guess means a child waiting alone on a pavement.",
    build:
      "A carpool app on Cloudflare Workers and D1, delivered as a website and as an Android app on Play internal testing. Alerts go over Web Push and Firebase Cloud Messaging together, so one person is reached whether they use the site on a laptop or the app on a phone. Pickups complete themselves when the car reaches the house, and each driver sees the route in the order they actually drive it.",
    result:
      "In use every school morning by the families it was built for, with the route, the alerts and the data model all shaped by what went wrong in real runs.",
    receipts: [
      "Live at carpoolcircle.com, driven every school morning",
      "Android app on Google Play internal testing; iOS built and verified on simulator, pending Apple enrollment",
      "Alerts delivered over both Web Push (RFC 8291) and FCM, reaching Apple and Android devices from one send",
      "Background location on Android via a foreground service, which a browser cannot do",
      "Pickups complete on arrival, with a radius derived from the route's own geometry",
      "Migrated live off a hosted builder onto owned infrastructure with two independent restore paths",
      "Push built against RFC 8291 directly, after finding that two edge libraries ship a pre-standard scheme Apple rejects",
      "FCM v1 spoken over a WebCrypto-signed JWT rather than pulling a server SDK into a Worker",
    ],
    stack: [
      "Cloudflare Workers",
      "D1",
      "Drizzle",
      "Capacitor",
      "Firebase Cloud Messaging",
      "Web Push",
      "Google Maps Platform",
    ],
    proves:
      "Can run a product that real families depend on daily, and repair it in production without breaking the morning run.",
    icon: "directions_car",
  },
  {
    slug: "talkboard",
    name: "TalkBoard",
    tagline: "An AAC communication board for kids who need a voice.",
    category: "product",
    ownership: "Aventary product",
    status: "Live",
    liveUrl: "https://talkboard-one.vercel.app",
    liveLabel: "Open TalkBoard",
    tags: ["mobile", "compliance"],
    problem:
      "Augmentative & alternative communication (AAC) tools for nonverbal children are often expensive, clunky, and locked to a device.",
    build:
      "A progressive web app with configurable board sets and per-child profiles, installable on any device, backed by Supabase.",
    result: "A live, installable AAC board that works across devices at no hardware lock-in.",
    receipts: [
      "Live PWA, installable on any device",
      "Configurable board sets + per-child profiles on a real backend",
    ],
    stack: ["Vite", "React", "PWA", "Supabase"],
    proves: "Builds accessible, human-centered software, not just business tooling.",
    icon: "record_voice_over",
  },
  {
    slug: "aventary-intelligence",
    name: "Aventary Intelligence",
    tagline: "An AI intelligence feed and operator diagnostic tools — this site.",
    category: "product",
    ownership: "Aventary product",
    status: "Live",
    liveUrl: "https://aventary.com/intelligence",
    liveLabel: "See the feed",
    tags: ["ai-agents", "data", "salesforce"],
    problem:
      "Operators want a point of view they can act on, plus a fast way to see where their own operation is leaking — without booking a consultant first.",
    build:
      "A publishing + intelligence platform: an automated morning-brief Worker that writes to a Supabase CMS, an 'Ask Aventary' retrieval assistant over a knowledge base, and interactive diagnostic tools (lead-to-opp, operating diagnostic) — all on the site you're reading.",
    result:
      "A living asset that generates content on a schedule and lets prospects self-diagnose before the first call.",
    receipts: [
      "Automated morning-brief Worker publishing to a live CMS",
      "'Ask Aventary' retrieval assistant grounded in a curated knowledge base",
      "Self-serve diagnostic tools live on the site",
    ],
    stack: ["Next.js", "Supabase", "Cloudflare Workers", "Anthropic API"],
    proves: "The consulting method runs as software — the site is its own case study.",
    icon: "insights",
  },
  // --------------------------------------------------------------- ENGAGEMENTS
  {
    slug: "hoa-mcp",
    name: "HOA platform — AI access & monitoring layer",
    tagline: "A production MCP + monitoring layer over an HOA management platform's API.",
    category: "engagement",
    ownership: "Client engagement",
    status: "In production",
    tags: ["ai-agents", "data"],
    problem:
      "Property managers needed programmatic and AI-driven access to an HOA/community-management system of record — safely, without runaway automations quietly hammering the API.",
    build:
      "A Standard-API MCP server on a hardened cloud host (systemd + secure tunnel), a manager-to-association mapping tool, connectivity into workflow automation and an AI connector, and Datadog monitors that alert on runaway loops — surfaced back in an operator control view.",
    result:
      "A monitored, production MCP endpoint that lets both automations and AI assistants act against the platform with guardrails and observability.",
    receipts: [
      "MCP server running in production behind a secure tunnel",
      "Runaway-loop monitoring wired to Datadog and surfaced in an ops dashboard",
      "Connected to workflow automation and an AI assistant connector",
    ],
    stack: ["MCP", "Node.js", "DigitalOcean", "Cloudflare Tunnel", "Datadog", "n8n"],
    proves: "Can put AI on top of an enterprise system of record with real governance.",
    icon: "monitoring",
  },
  {
    slug: "fulfillment-os",
    name: "Medical-logistics operator — Fulfillment operating system",
    tagline: "A warehouse-aware Salesforce operating system — from supply request through shipment.",
    category: "engagement",
    ownership: "Client engagement",
    status: "In production",
    tags: ["salesforce", "data"],
    problem:
      "Inventory, driver kits, allocation, picking, receiving, and shipping operated across disconnected Salesforce records and interfaces, with limited shortage visibility and risky production changes.",
    build:
      "A complete fulfillment lifecycle connecting Contacts, kits, Supply Requests, warehouse inventory, automatic allocation, shortage replacement, receipts, pick slips, UPS rates, Work Orders, labels, tracking, and exception dashboards — released through a guarded nine-stage deployment.",
    result:
      "Fulfillment teams can move an order from request to shipment inside one traceable Salesforce workflow, while preserving allocation history and production-only capabilities.",
    receipts: [
      "Warehouse-level inventory, adjustments, receipts, thresholds, and allocation",
      "Bulk and individual pick-slip generation",
      "Partial-allocation visibility and unavailable-item replacement",
      "UPS rates, labels, tracking, carrier, and service level returned to the request",
      "Cancellation releases inventory without deleting allocation history",
      "Nine-stage production rollout with focused validation",
      "22 historical shipping-label links repaired",
    ],
    stack: ["Salesforce", "Apex", "LWC", "Flow", "Experience Cloud", "UPS API", "SFDX", "GitHub"],
    proves: "Can redesign and safely deploy an operational Salesforce system — not merely customize screens.",
    icon: "local_shipping",
  },
  {
    slug: "telephony-scheduler",
    name: "Medical-transport company — AI call-routing control",
    tagline: "Operator-controlled scheduling for enterprise telephony, with a reliability harness.",
    category: "engagement",
    ownership: "Client engagement",
    status: "In production",
    tags: ["ai-agents", "voice", "data"],
    problem:
      "A medical-transport operator routes inbound calls between live queues and an AI voice agent across several business lines — and was flipping that routing by hand, line by line, every day. Easy to forget, easy to leave a line on the AI overnight, and invisible once it had drifted.",
    build:
      "An in-app control page that toggles each phone line between its normal queue and its AI-forward queue three ways: manually, on recurring day-and-time schedules, and with one-off fail-safe triggers that force a line to a known state at a set time — a safety net that fires even when the scheduler is off. Every switch, human or automated, is written to a persistent activity log. The scheduler is event-driven: it only touches the phone system at real transitions, and it never acts on a state it cannot read.",
    result:
      "Set-and-forget call routing across every line, with a master switch that defaults OFF, a full audit trail, and the operator still in control — including two live production outages diagnosed and fixed along the way.",
    receipts: [
      "Recurring day/time schedules plus one-off fail-safe triggers across four business lines",
      "Event-driven scheduler (per-minute cron + edge-function tick) that makes near-zero vendor API calls between transitions",
      "Persistent activity log capturing every manual and automatic switch, with source and actor",
      "Diagnosed and fixed live outages — vendor rate-limiting and stale-token invalidation — with a shared token cache and automatic re-auth",
      "Master switch defaults OFF; an unreadable line state is never blindly switched",
      "Consolidated onto a single backend and retired a stale duplicate to remove split-brain risk",
    ],
    stack: ["React", "Supabase", "Edge Functions", "pg_cron", "Cloudflare Pages", "RingCentral"],
    proves: "Automates a live enterprise phone system without taking the operator out of the loop — and keeps it running when the vendor API fights back.",
    icon: "schedule",
  },
  {
    slug: "clinical-logging",
    name: "Solo clinician — HIPAA-aligned session log",
    tagline: "A compliance-grade session-logging PWA for a healthcare practice.",
    category: "engagement",
    ownership: "Client engagement",
    status: "Private / gated",
    tags: ["compliance", "mobile", "data"],
    problem:
      "A solo speech-language pathologist needed to log sessions on a phone or laptop while staying aligned with HIPAA — without an enterprise EHR's cost or overhead.",
    build:
      "A private PWA on self-hosted infrastructure the owner controls, with a green CI pipeline and an explicit runbook + auditor gate that must clear before any real patient data flows.",
    result:
      "A clinician-grade logging app built to a compliance bar, with real patient data deliberately gated behind an infrastructure sign-off.",
    receipts: [
      "HIPAA-aligned design on owner-controlled, self-hosted infrastructure",
      "Green CI pipeline; shipped in defined milestones",
      "Real patient data gated behind a written runbook + auditor sign-off",
    ],
    stack: ["PWA", "Self-hosted Supabase", "AWS", "CI/CD"],
    proves: "Can build to a regulatory bar and hold the line on compliance before go-live.",
    icon: "verified_user",
  },
  {
    slug: "haus-of-lark",
    name: "Haus of Lark",
    tagline: "An editorial Shopify rental experience built around quoting — not checkout.",
    category: "engagement",
    ownership: "Client engagement",
    status: "Private / gated",
    tags: ["commerce", "data"],
    problem:
      "An event-rental business needed more than a standard storefront. Customers had to explore a large visual inventory, assemble coordinated looks, and request a quote without the experience feeling like retail checkout.",
    build:
      "A custom-branded Shopify experience with curated rental collections, shoppable lookbooks, product recommendations, quote-request workflows, hidden public pricing, and operational tooling for managing catalog content, inventory structure, policies, and rental agreements.",
    result:
      "A cohesive digital showroom that turns inspiration into a structured rental inquiry, with a maintainable Shopify operating system behind it.",
    receipts: [
      "Custom Shopify theme and responsive editorial homepage",
      "Catalog model covering 42 rental products across 8 collections",
      "Metaobject-powered lookbook connecting styled scenes to quoteable products",
      "Request-a-quote flow in place of conventional checkout",
      "Catalog publishing, cleanup, collection, and recommendation automation",
      "Six branded delivery, pickup, and vehicle-use agreement PDFs",
    ],
    stack: ["Shopify", "Liquid", "JavaScript", "GraphQL", "Metaobjects", "Dropbox Sign"],
    proves: "Can translate a service-heavy, visually led business into a maintainable commerce workflow without forcing it into a conventional shopping-cart model.",
    icon: "shopping_bag",
  },
  // ------------------------------------------------ ENTERPRISE POCs & AI SYSTEMS
  {
    slug: "credit-policy-intelligence",
    name: "Commercial-lending platform — Credit Policy Intelligence",
    tagline: "Salesforce-native policy intelligence that translates lending policy into clear application guidance.",
    category: "poc",
    ownership: "Client engagement",
    status: "Deployed POC",
    tags: ["salesforce", "ai-agents", "compliance"],
    problem:
      "Lending policies live in long documents containing hard eligibility rules, exceptions, risk tolerances, institutional priorities, and mission-level guidance. Underwriters must interpret those policies consistently for every application.",
    build:
      "A Salesforce-native workspace where administrators upload and activate credit policies, review extracted policy interpretations, and evaluate applications against the active policy. Results include pass, attention, and outside-policy findings, policy citations, concise guidance, missing evidence, and recommended next actions.",
    result:
      "A governed underwriting-assistance experience embedded directly in Salesforce, with policy versions, evidence provenance, human review, and repeatable application analysis.",
    receipts: [
      "Policy-document upload and activation workflow deployed in Salesforce",
      "Application analysis available through both a record action and embedded workspace",
      "Findings include policy references, missing evidence, and human-readable guidance",
      "Permission-controlled access and Salesforce-native record storage",
      "Active-policy provenance preserved with every analysis",
    ],
    stack: ["Salesforce", "Apex", "Lightning Web Components", "Salesforce Files", "Flow-ready architecture"],
    proves: "Can transform institutional policy into governed, explainable decision support without turning AI guidance into an uncontrolled credit decision.",
    icon: "policy",
  },
  {
    slug: "credit-memo-intelligence",
    name: "Commercial-lending platform — Credit Memo Intelligence",
    tagline: "Program-specific credit memo generation from Salesforce application and underwriting evidence.",
    category: "poc",
    ownership: "Client engagement",
    status: "Deployed POC",
    tags: ["salesforce", "data", "compliance"],
    problem:
      "Credit memos are not one-size-fits-all. A construction loan requires project budgets, timelines, collateral, leverage, completion risk, and exit analysis. A working-capital facility requires bank activity, cash flow, DSCR, leverage, and repayment-capacity analysis.",
    build:
      "A Salesforce-native Credit Memo generator with governed configurations for different loan programs. Users select the program, generate an editable draft from available application and policy evidence, review missing information, refine every section, and generate a formatted PDF stored in Salesforce Files.",
    result:
      "A repeatable memo-generation workflow that adapts document structure and evidence requirements to the selected loan program while preserving configuration, policy, and source provenance.",
    receipts: [
      "Working Capital and Construction memo configurations deployed",
      "Program-specific document sections and evidence requirements",
      "Editable Salesforce Credit Memo records with complete Details pages",
      "PDF generation with automatic Salesforce Files storage",
      "Configuration version, policy version, and evidence provenance recorded",
      "Permission-controlled administration and user access",
    ],
    stack: ["Salesforce", "Apex", "Lightning Web Components", "Visualforce PDF", "Salesforce Files"],
    proves: "Can turn structured lending data and governed underwriting rules into reviewable, program-specific credit documentation inside the system of record.",
    icon: "description",
  },
  {
    slug: "agentforce-decision-desk",
    name: "Commercial-lending platform — Agentforce decision desk",
    tagline: "A real-time broker-submission decisioning agent that keeps the human on the risk call.",
    category: "poc",
    ownership: "Client engagement",
    status: "Deployed POC",
    tags: ["ai-agents", "salesforce", "compliance"],
    problem:
      "A broker submission normally kicks off days of back-and-forth — pull the file, check it against the credit box, go back for clarification, wait on an underwriter — before anyone can give the broker an answer.",
    build:
      "An Agentforce decision desk that reads the submission and returns a first-pass call on the spot: approve or decline, a confidence score, and the maximum amount it would approve, all grounded in the real underwriting criteria. Change an input — time in business, credit score, monthly revenue — and it re-runs the decision live; the broker can ask follow-up questions and pull up the underwriter analysis behind the number.",
    result:
      "Seconds-not-days first-pass decisions in front of the broker — with a hard line: when an input crosses into risk (a low-enough credit score), the agent flags the submission for human review instead of rubber-stamping it.",
    receipts: [
      "Reads a broker submission and returns approve/decline + confidence score + max approvable amount",
      "Live re-run when inputs change, with follow-up Q&A and drill-down to the underwriter analysis",
      "Every call grounded in the actual underwriting criteria",
      "Risk-crossing submissions flagged for human review, never auto-finalized",
    ],
    stack: ["Salesforce", "Agentforce", "Apex", "Lightning Web Components"],
    proves: "Puts an agent on the assembly and first-pass call in seconds while the human still owns the decision that carries the risk.",
    icon: "balance",
  },
];
