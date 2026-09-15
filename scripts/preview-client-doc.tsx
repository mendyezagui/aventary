/**
 * Render the client-document template to a standalone HTML file, with sample
 * content that exercises every component in the registry.
 *
 *   npm run preview:doc
 *
 * This is a design harness, not a route. It uses no database and is never
 * deployed — which is the point: the whole system can be looked at, and
 * changed, without publishing a project or signing in to one. If you add a
 * component to lib/client-doc/parse.ts, add it to the sample here too.
 *
 * To preview REAL content without putting it in the repository, point it at a
 * fixture file holding the same { name, client, meta, blocks } shape the feed
 * returns, and send the output somewhere outside the tree:
 *
 *   AVDOC_FIXTURE=~/scratch/acme.json AVDOC_OUT=~/scratch/acme.html npm run preview:doc
 *
 * Client documents are confidential. Keep the fixture and the output out of
 * this repository — that is what the two variables are for.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDocument, normalizeBlocks } from "@/lib/client-doc";
import { ClientDoc } from "@/components/client-doc/ClientDoc";

const block = (tab: string, title: string | null, body: string, sort: number) => ({
  tab,
  title,
  body,
  format: "markdown",
  sort
});

const BLOCKS = [
  block(
    "What we found",
    "The short version",
    `Three months of deal data says the same thing the sales team says out loud: leads
arrive faster than anyone can answer them, and the ones that wait do not come back.

Nothing here is a platform problem. The routing rules were written for a team of
four and there are now eleven people working the same queue.`,
    1
  ),
  block(
    "What we found",
    null,
    `@component: metrics

42% | of inbound leads never get a second touch
11 days | median time to first response | against a 24-hour target
3.1x | close rate when the first reply lands same-day`,
    2
  ),
  block(
    "What we found",
    null,
    `@component: callout
@tone: warn

**The number that should worry you is the 11 days, not the 42%.** A lead nobody
touches twice is a lead you never paid for. A lead that waits eleven days is one
you paid for, warmed up, and handed to whoever called them on day two.`,
    3
  ),
  block(
    "What we found",
    "Where it breaks, in order",
    `@component: steps

### Assignment | Minute 0
The round-robin still names four owners. Seven people are not in the rotation at
all, so their pipeline is whatever they claim by hand.

### First touch | Hours 1-24
No SLA field, so nothing can be reported on and nothing escalates. "Fast" is a
value, not a measurement.

### Qualification | Days 2-11
Three different qualification checklists in three different places. Two of them
are in a spreadsheet.`,
    4
  ),
  block(
    "What it costs",
    "Scope and price",
    `@component: cards
@columns: 3

### Discovery | 2 weeks
Read the data, interview the eleven, and write down what is actually happening —
not what the process document says.

### Build | 6 weeks
Routing, SLA instrumentation, and one qualification path that replaces all three.

### Handover | 2 weeks
Your team runs it while we watch, not the other way round.`,
    1
  ),
  block(
    "What it costs",
    null,
    `@component: keyvalue

Engagement | Fixed fee, three phases
Duration | 10 weeks from kickoff
Your time | Roughly 3 hours a week, mostly in weeks 1-2
Not included | Licence costs, data migration from the legacy CRM`,
    2
  ),
  block(
    "What it costs",
    "Assumptions this price rests on",
    // A table wants the wide measure, and says so. Nothing widens itself:
    // `@component: table` is prose that defaults to `wide`.
    `@component: table

| Assumption | If it is wrong |
| --- | --- |
| Eleven users, one org | Scope grows with the second org, not the users |
| Sales Cloud, no CPQ | CPQ adds roughly three weeks |
| We get admin access in week 1 | Every week of delay is a week of timeline |`,
    3
  ),
  block(
    "Why us",
    null,
    `@component: quote

They did not start by telling us what to buy. They started by telling us what we
were already doing, which nobody had written down in four years.

— Operations lead, a previous engagement`,
    1
  ),
  block(
    "Why us",
    "How we work",
    `@component: callout
@tone: quiet

One person does the work and that person is in every meeting. There is no
account manager between you and the build, and no handover to a delivery team
you have not met.`,
    2
  ),
  block(
    "Appendix",
    "Method notes",
    `@section-closed

Data pulled 14 September. Close rates are trailing ninety days, excluding the
two enterprise deals that would otherwise distort every ratio on this page.

- Lead source data is incomplete before March; anything earlier is excluded.
- "First touch" counts logged calls and logged emails, not opens.
- The eleven includes two people who joined in August.`,
    1
  )
];

const SAMPLE = {
  name: "Northwind Partners — Revenue Operations Review",
  client: "Northwind Partners",
  meta: {
    heading: "Where your deals are leaking",
    subheading:
      "What we discussed, and what the data says once you line the last ninety days up next to it.",
    prepared_for: "Northwind Partners",
    prepared_by: "Mendy Ezagui · Aventary",
    brand: { name: "Northwind Partners", accent: "#1F4E79" },
    layout: { nav: true, numbered: true }
  },
  blocks: BLOCKS
};

const fixture = process.env.AVDOC_FIXTURE;
const input = fixture ? JSON.parse(readFileSync(fixture, "utf8")) : SAMPLE;

const doc = buildDocument({
  name: input.name,
  client: input.client ?? null,
  meta: input.meta ?? {},
  // Through the same coercion a jsonb column goes through, so the harness
  // exercises the production path rather than a tidier version of it.
  blocks: normalizeBlocks(input.blocks),
  // Fixed, so re-running the harness does not show up as a diff every day.
  now: fixture ? new Date() : new Date("2026-09-15T12:00:00Z")
});

const css = readFileSync("app/c/[slug]/client-doc.css", "utf8");
const FONTS =
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${doc.title} — template preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>*{margin:0;padding:0}body{background:#FAF8F3}</style>
<style>${css}</style>
</head>
<body>${renderToStaticMarkup(<ClientDoc doc={doc} />)}</body>
</html>`;

const out = process.env.AVDOC_OUT || "preview/client-document-template.html";
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(
  `${out} — ${doc.sections.length} sections, ` +
    `${doc.sections.reduce((n, s) => n + s.blocks.length, 0)} blocks: ` +
    doc.sections.flatMap((s) => s.blocks.map((b) => b.kind)).join(", ")
);
