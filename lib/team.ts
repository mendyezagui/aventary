/**
 * The Aventary roster.
 *
 * This feeds /team (the index) and /team/<slug> (a full profile). Both began
 * unlisted and are public now: indexed, canonical, in the sitemap, linked from
 * /work and /contact. Still absent from the header nav, because being findable
 * and being in the primary navigation are separate decisions.
 *
 * Two fields hold back a person who is not ready, and they are independent:
 *
 *   no `profile`  — the card renders on /team with no link, which is how a new
 *                   person joins the roster before their write-up exists rather
 *                   than shipping a paragraph nobody wrote.
 *   `noindex`     — the page exists and is linked, but stays out of search.
 */

export type Credential = {
  label: string;
  detail?: string;
};

export type Chapter = {
  /** Org name as it should read on the page. */
  org: string;
  role: string;
  /** Human span, e.g. "2021 — 2026". Omit when nobody supplied dates. */
  period?: string;
  /** One line on what the job actually was. */
  summary: string;
  /** The receipts. Each one should be traceable to something real. */
  points?: string[];
};

/**
 * A named piece of client work.
 *
 * `client` is deliberately optional and deliberately empty for everything done
 * under a previous employer. Consulting confidentiality obligations survive the
 * engagement and do not expire with time, and client identity is usually itself
 * confidential — so an engagement is described by vertical and scale until
 * there is a published case study, the client has gone public themselves, or
 * there is written permission to name them. When that arrives, fill in
 * `client` and the card names them. Nothing else has to change.
 */
export type Engagement = {
  /** Named client. Omit until naming them is cleared — see the note above. */
  client?: string;
  /** How the work is described while the client is unnamed. */
  descriptor: string;
  /** Industry vertical — what people actually search by. */
  vertical: string;
  /** Where the work was done: "Aventary", "PwC", etc. */
  under: string;
  year: string;
  /** Capability tags, mirroring the language used on /work. */
  capabilities: string[];
  problem: string;
  build: string;
  /** The receipts. Short label/value pairs. */
  outcomes: { label: string; value: string }[];
};

/** Something of this person's that lives elsewhere on the web. */
export type ExternalLink = {
  /** How it should be named on the page. */
  label: string;
  url: string;
  /** One or two sentences on what it is. */
  description: string;
  /** Their relationship to it, e.g. "Founder". */
  role?: string;
};

/**
 * A profile, which is allowed to start small.
 *
 * Only `lede` and `story` are required. Everything else is optional and its
 * section is skipped when absent, so somebody can go up with the two things
 * that are actually known about them rather than waiting for a full CV — and
 * so nobody is tempted to pad the gap with invented history. Fill a field in
 * later and its section appears; nothing else has to change.
 */
export type Profile = {
  /** Opening move — the claim the rest of the page has to earn. */
  lede: string;
  /** The narrative. Rendered as sequential paragraphs. */
  story: string[];
  /** A pulled quote set between the story and the record. Optional. */
  pull?: string;
  /** Work of their own that lives elsewhere. */
  links?: ExternalLink[];
  chapters?: Chapter[];
  /** Client work, by vertical — the same shape of proof /work carries. */
  engagements?: Engagement[];
  education?: Credential[];
  certifications?: Credential[];
  /** How this person actually works — the operating principles. */
  principles?: { title: string; body: string }[];
};

export type TeamMember = {
  slug: string;
  name: string;
  role: string;
  /** Shown on the /team card and under the name in the profile hero. */
  blurb: string;
  /** Monogram, used whenever there is no photo. */
  initials: string;
  /**
   * Path to a headshot under public/, e.g. "/team/mendy.jpg".
   *
   * Optional on purpose: absent, the monogram renders exactly as before, so a
   * person can go up without a photo and gain one later with no other change.
   * The frame is a circle, so the file should be square and cropped on the
   * face — a portrait-shaped source will be centre-cropped by object-cover,
   * which is rarely where the face is.
   */
  photo?: string;
  location?: string;
  linkedin?: string;
  /**
   * Keep this person's own page out of search.
   *
   * Separate from whether the page exists: the profile still renders, the
   * roster still links it, and anyone sent the URL still reads it. It is
   * only withheld from Google and from the sitemap.
   *
   * The reason is consent, not secrecy. A bio written for the company website
   * and a bio that is the first result for your name forever are different
   * things to agree to, and the second is not the site owner's to decide for
   * somebody else. Clear the flag once the person has said yes.
   */
  noindex?: boolean;
  /** Absent until the write-up exists. No profile, no link. */
  profile?: Profile;
};

export const TEAM: TeamMember[] = [
  {
    slug: "mendy",
    name: "Mendy Ezagui",
    role: "Founder",
    blurb:
      "Product and transformation leader. Fifteen years building software that ships — from a nonprofit's first mobile app to $1B+ of enterprise transformation at PwC.",
    initials: "ME",
    photo: "/team/mendy.jpg",
    location: "Los Angeles, CA",
    linkedin: "https://www.linkedin.com/in/mendyezagui/",
    profile: {
      lede:
        "I have been the founder, the product owner, the consultant and the person who stayed late to fix the thing nobody else would own. Aventary is what happens when you stop separating those jobs.",
      story: [
        "I started where the stakes were personal rather than commercial. At Chabad.org I was the product owner for a suite of five digital and mobile applications, built for organizations that had no budget for software and no tolerance for it being confusing. More than 600 organizations ended up running on it. That is where I learned the lesson that still governs everything I build: if a person has to be trained to use it, it is not finished.",
        "Sallie Mae came next, and with it the other half of the education — what it takes to turn a product around inside a large institution. NPS up 20 percent, engagement up 50 percent, delivery up 30 percent, all of it from deciding what not to build and then defending that decision in rooms that wanted more features.",
        "In 2017 I co-founded Nucleus Technology and ran product as CPO. We took a logistics automation platform from a sketch to $1M in annual revenue and shipped over 100 releases doing it. COVID closed the business. The software did not die with it — a medical logistics startup is still running on the order orchestration engine we built. Founding something and watching it end teaches you which parts of a company are load-bearing. Most of them are not the parts on the org chart.",
        "Then five years at PwC in Technology & Transformation Advisory, which is where the scale arrived. I directed more than $1B in enterprise transformation value across 20+ programs in healthcare, logistics and financial services, ran over 100 executive workshops, and led the design of PwC's first client-facing GenAI sales agent — conversational AI wired to real workflow automation with human feedback loops, not a demo. I also built the reusable playbooks that took client adoption up 3×, because the pattern you cannot hand to someone else is a pattern you have to keep showing up to run.",
        "Aventary is the consolidation. Growth-stage and non-technical companies need the product and revenue-operations leadership of a tech company, and they usually cannot hire it — so they buy advice instead, and advice does not ship. I do the work: a fractional CPO or CTO who builds the system, proves it moves a number, and leaves it running in the hands of the team that has to live with it.",
      ],
      pull:
        "Every engagement should end with a system the client's own team can run without me. That is the test. Anything else is a dependency dressed up as a deliverable.",
      chapters: [
        {
          org: "Aventary",
          role: "Founder",
          period: "2025 — Present",
          summary:
            "Fractional product and revenue-operations leadership for growth-stage and non-technical companies, primarily in the Salesforce ecosystem.",
          points: [
            "Built the Aventary Method — Observe, Instrument, Diagnose, Design, Deploy, Improve — as a repeatable way to find where work, context, ownership and revenue leak.",
            "Ships production systems, not roadmaps: AI SDR agents, lead-to-opportunity routing, order orchestration, quoting systems and revenue diagnostics.",
            "Every engagement is scoped to the smallest complete loop that can move one business outcome from trigger to evidence.",
          ],
        },
        {
          org: "PwC",
          role: "Principal Consultant — Technology & Transformation Advisory",
          period: "2021 — 2025",
          summary:
            "Product and AI strategy lead across enterprise transformation programs in healthcare, logistics and financial services.",
          points: [
            "Directed $1B+ in enterprise transformation value across 20+ multi-industry programs by aligning GTM, product and engineering.",
            "Led design of PwC's first GenAI sales agent — conversational AI, workflow automation and user feedback loops in one system.",
            "Prototyped agent-based automation frameworks with data and AI engineering, accelerating delivery by 40%.",
            "Facilitated 100+ executive workshops on AI adoption, roadmap planning and outcome-based measurement.",
            "Codified engagement patterns into reusable playbooks and assets, lifting adoption 3×.",
            "Held 80%+ on-time delivery on programs valued between $30M and $150M.",
          ],
        },
        {
          org: "Ally Avenue Consulting",
          role: "Lead Consultant & Strategist",
          period: "2020 — 2021",
          summary:
            "Advised executive teams on digital and AI-enabled transformation, with a focus on automating decisions rather than tasks.",
          points: [
            "Translated ambiguous executive intent into AI-ready product roadmaps and technical plans.",
            "Cut vendor risk by defining scope and evidence boundaries before anyone signed anything.",
          ],
        },
        {
          org: "Nucleus Technology",
          role: "Co-Founder & Chief Product Officer",
          period: "2017 — 2020",
          summary:
            "Built and scaled a logistics automation SaaS platform from concept to $1M ARR.",
          points: [
            "Delivered 100+ product releases through rapid prototyping and iterative design sprints.",
            "Designed a modular architecture that made AI features and external API integrations plug-and-play.",
            "The business closed during COVID-19; the order orchestration engine is still in production at a medical logistics startup.",
          ],
        },
        {
          org: "Sallie Mae",
          role: "Senior Product Manager",
          period: "2016 — 2017",
          summary:
            "Led a product turnaround inside a large financial institution.",
          points: [
            "Improved NPS by 20% and increased engagement 50%.",
            "Introduced data-driven prioritization frameworks that improved delivery by 30%.",
          ],
        },
        {
          org: "Chabad.org",
          role: "Product Owner",
          period: "2013 — 2016",
          summary:
            "Defined and launched a suite of five digital and mobile applications for a nonprofit network.",
          points: [
            "Adopted by 600+ organizations, from a standing start.",
            "Owned the full product lifecycle with an emphasis on inclusive, accessible experiences for non-technical users.",
          ],
        },
      ],
      engagements: [
        {
          descriptor: "PE-backed healthcare SaaS provider",
          vertical: "Healthcare",
          under: "PwC",
          year: "2022",
          capabilities: ["Product strategy", "Portfolio rationalization", "Executive alignment"],
          problem:
            "A private-equity portfolio company needed a transformative product strategy and had three months of stakeholder access to build it from.",
          build:
            "Led the team through business and technical stakeholder interviews across a three-month window, then defined a three-year software and functional rationalization plan — what to consolidate, what to retire, what to invest in.",
          outcomes: [
            { label: "Cost reduction", value: "Multi-million" },
            { label: "Company valuation", value: "Increased" },
            { label: "Roadmap horizon", value: "3 years" },
          ],
        },
        {
          descriptor: "Global professional services firm — HR technology overhaul",
          vertical: "Enterprise & B2B tech",
          under: "PwC",
          year: "2023",
          capabilities: ["Product scope", "Delivery leadership", "Risk mitigation"],
          problem:
            "A complete overhaul of the staffing and deployment tooling used across the firm — a $50M+ initiative with every internal stakeholder holding an opinion.",
          build:
            "Owned product scope and strategy, built the client relationships that make a program like this survivable, de-risked the delivery plan and built consensus across functions before a line of it shipped.",
          outcomes: [
            { label: "Program value", value: "$50M+" },
            { label: "Milestones", value: "On time" },
          ],
        },
        {
          descriptor: "PwC — first client-facing GenAI sales agent",
          vertical: "Enterprise & B2B tech",
          under: "PwC",
          year: "2023 — 2025",
          capabilities: ["Agentic AI", "Conversational design", "Workflow automation"],
          problem:
            "The firm needed a GenAI sales agent that could face clients, not a demo that impressed a conference room and then quietly stopped being used.",
          build:
            "Led the design: conversational AI wired to real workflow automation, with user feedback loops so the thing improved from contact with the work. Partnered with data and AI engineering to prototype the agent-based automation framework underneath it.",
          outcomes: [
            { label: "Delivery acceleration", value: "40%" },
            { label: "Client adoption of codified assets", value: "3×" },
          ],
        },
        {
          descriptor: "Enterprise transformation programs — healthcare, logistics, financial services",
          vertical: "Multi-industry",
          under: "PwC",
          year: "2021 — 2025",
          capabilities: ["Transformation strategy", "GTM", "Executive workshops"],
          problem:
            "Twenty-plus programs across three industries, each with GTM, product and engineering pulling in different directions and a board expecting a number to move.",
          build:
            "Aligned the three functions around one outcome per program, instrumented what actually mattered, and ran the executive workshops where roadmap and investment priorities got decided. Codified the recurring patterns into reusable playbooks.",
          outcomes: [
            { label: "Transformation value directed", value: "$1B+" },
            { label: "Programs", value: "20+" },
            { label: "Executive workshops", value: "100+" },
            { label: "On-time delivery, $30M–$150M programs", value: "80%+" },
          ],
        },
        {
          client: "Trimble",
          descriptor: "Fortune 500 technology company",
          vertical: "Enterprise & B2B tech",
          under: "Aventary",
          year: "2025",
          capabilities: ["AI SDR", "Lead-to-opportunity", "Salesforce"],
          problem:
            "A 2,500-lead backlog nobody was working, and lead assignment measured in days — which is the same as never for an inbound lead.",
          build:
            "An AI SDR and lead-to-opportunity engine that qualifies, routes and engages inbound leads inside Salesforce, with the routing logic instrumented so leakage is visible rather than assumed.",
          outcomes: [
            { label: "Backlog", value: "2,500 → 0" },
            { label: "Lead assignment", value: "Days → 1 min" },
            { label: "Throughput", value: "2×" },
            { label: "Lead leakage", value: "−25%" },
          ],
        },
        {
          client: "Fundingo",
          descriptor: "Commercial lending platform",
          vertical: "Financial services & lending",
          under: "Aventary",
          year: "2025",
          capabilities: ["Agentic AI", "Underwriting", "Salesforce-native"],
          problem:
            "Lending policy lived in the heads of underwriters and in documents nobody read at the moment a decision was being made.",
          build:
            "A suite of AI underwriting proofs-of-concept — credit policy intelligence and program-specific credit memo generation, built Salesforce-native on the application and underwriting evidence already in the system.",
          outcomes: [
            { label: "POCs delivered", value: "5" },
            { label: "Each, build to demo", value: "< 1 week" },
          ],
        },
        {
          descriptor: "Logistics automation SaaS — founded and scaled",
          vertical: "Logistics & transportation",
          under: "Nucleus Technology",
          year: "2017 — 2020",
          capabilities: ["Founding product", "Order orchestration", "Warehouse management"],
          problem:
            "Logistics and order orchestration was running on archaic technology while the rest of the industry moved on.",
          build:
            "Co-founded the company and ran product as CPO: an end-to-end order orchestration and warehouse management platform, built modular so AI features and external APIs could be added without a rewrite.",
          outcomes: [
            { label: "Annual revenue", value: "$1M+" },
            { label: "Product releases", value: "100+" },
            { label: "Engine still in production", value: "Yes" },
          ],
        },
        {
          client: "Chabad.org",
          descriptor: "Nonprofit network SaaS",
          vertical: "Nonprofit",
          under: "Chabad.org",
          year: "2013 — 2016",
          capabilities: ["Product ownership", "Mobile", "Accessibility"],
          problem:
            "A network of organizations with no software budget, no technical staff and no patience for a tool that needed a manual.",
          build:
            "Defined and launched a suite of five digital and mobile applications, owning the full lifecycle with accessibility and non-technical users as the design constraint rather than an afterthought.",
          outcomes: [
            { label: "Organizations adopted", value: "600+" },
            { label: "Applications launched", value: "5" },
          ],
        },
      ],
      education: [
        { label: "M.B.A., Finance", detail: "Baruch College — Zicklin School of Business" },
      ],
      certifications: [
        {
          label: "Salesforce Certified — 14×",
          detail: "Including Generative AI Associate, AI Specialist and AI+",
        },
        { label: "Certified Scrum Product Owner (CSPO)" },
        { label: "Databricks Admin Fundamentals" },
        { label: "OneTrust Consent Management Expert" },
        {
          label: "Toptal",
          detail: "Vetted in the top 3% of product management talent",
        },
      ],
      principles: [
        {
          title: "Handoffs are products",
          body:
            "Most revenue does not leak inside a team. It leaks in the gap between two of them — the moment where ownership is ambiguous and the record is incomplete. Design that gap on purpose or it designs itself.",
        },
        {
          title: "Evidence boundaries before architecture",
          body:
            "For every fact the business depends on, one system has to be the source of truth. Decide which one before you integrate anything, or you will spend the next two years reconciling.",
        },
        {
          title: "The smallest complete loop",
          body:
            "Not a pilot, not a phase one. A loop that runs end to end — trigger, context, decision, execution, evidence — on one real outcome. It either moves the number or it tells you why not. Both are useful.",
        },
        {
          title: "Ship, then instrument, then argue",
          body:
            "Opinions about what users want are cheap and infinite. A measured system ends the argument in a week.",
        },
      ],
    },
  },
  {
    slug: "musy",
    name: "Musy Ezagui",
    role: "Executive Assistant",
    photo: "/team/musy.jpg",
    blurb:
      "Executive assistant at Aventary, an educator, and the founder of Chai Cut \u2014 an AI video editing agent that turns raw footage into a finished Reel.",
    // Mendy and Musy share initials, so the monograms use the first two
    // letters of the first name instead \u2014 two identical "ME" circles on a
    // two-person roster reads as a bug. Only a fallback now that both have
    // photos, but it has to stay right for the moment one is missing.
    initials: "MU",
    // Her page is live and linked, but withheld from search until she has
    // been asked whether she wants to be findable by name. Mendy's is indexed:
    // it is his firm and his own call to make.
    noindex: true,
    profile: {
      lede:
        "An educator who builds software, and who treats both jobs as the same test: can the person in front of you actually do it afterward.",
      story: [
        "Musy is Aventary\u2019s executive assistant. Outside the firm she volunteers with Friendship Circle and supports educational programming, including teaching at two Hebrew schools in Canada.",
        "As an educator, she finds customer success sits close to teaching. Both are judged on the same thing \u2014 not how well it was explained, but whether the person actually understood it.",
        "She also builds. Working with AI coding agents, she has shipped two web applications: one that streamlines kosher product scanning, and Chai Cut, which turns long-form footage into a finished vertical Reel. Both went from an idea to something that runs.",
      ],
      pull:
        "Not how well it was explained, but whether the person actually understood it.",
      chapters: [
        {
          org: "Aventary",
          role: "Executive Assistant",
          summary: "Keeps the firm\u2019s commitments, scheduling and client follow-through moving.",
        },
        {
          org: "Chai Cut",
          role: "Creator & Founder",
          summary:
            "An AI video editing agent, built with AI coding agents \u2014 concept through to a working product.",
        },
        {
          org: "Kosher product scanning app",
          role: "Builder",
          summary: "A second web application, built the same way: an everyday problem taken from idea to something that runs.",
        },
        {
          org: "Friendship Circle",
          role: "Volunteer",
          summary: "Volunteer work supporting children and families in the community.",
        },
        {
          org: "Chabad House educational programming",
          role: "Teacher",
          summary: "Educational programming, including teaching at two Hebrew schools in Canada.",
        },
      ],
      links: [
        {
          label: "Chai Cut",
          url: "https://chaicut.vercel.app/",
          role: "Creator & Founder",
          description:
            "An AI video editing agent. Hand it raw footage; it finds the story and edits a finished vertical Reel \u2014 captions, pacing, colour and music included.",
        },
      ],
    },
  },
];

export function memberBySlug(slug: string): TeamMember | undefined {
  const want = slug.trim().toLowerCase();
  return TEAM.find((m) => m.slug === want);
}
