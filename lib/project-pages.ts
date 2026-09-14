import { Marked } from "marked";

// Project pages: the document at /c/<slug> built from a Second Brain project's
// blocks, rather than from a file in this repo.
//
// Why it reads a second database. Content and access control belong in
// different places. A project's sections are edited all day in Client Hub, in
// the Second Brain product database, next to the tasks and the deal they
// describe. Who may READ the resulting page is this website's business, and
// lives here — in client_pages, with the tokens and sessions that enforce it.
// So this module reaches across to fetch content, and nothing else. Every
// access decision stays on this side.
//
// It is read-only and service-role, server-side only. The key must never reach
// a browser: it can read every tenant's data.

// Read per call, not at module scope. On Workers the environment is bound to
// the request, so a module-level capture can be undefined for the life of the
// isolate and silently disable this whole path.
const sbEnv = () => ({
  url: process.env.SECOND_BRAIN_URL,
  key: process.env.SECOND_BRAIN_SERVICE_ROLE_KEY
});

/**
 * True when this deploy can reach Second Brain at all. When false every lookup
 * here returns null and /c/<slug> falls through to the other content sources,
 * so an unconfigured deploy serves the old page rather than breaking.
 */
export function projectPagesConfigured() {
  const { url, key } = sbEnv();
  return Boolean(url && key);
}

export type ProjectBlock = {
  tab: string;
  title: string | null;
  body: string;
  format: string;
  sort: number;
};

export type ProjectPage = {
  title: string;
  blurb: string;
  html: string;
  readers: string[];
};

type Meta = {
  heading?: string;
  subheading?: string;
  prepared_by?: string;
  prepared_for?: string;
};

type ProjectRow = {
  tenant_id: string;
  id: number;
  name: string;
  client: string | null;
  public_meta: Meta | null;
  page_readers: string[] | null;
};

/** One REST read against Second Brain. Returns [] rather than throwing. */
async function sbSelect<T>(path: string): Promise<T[]> {
  const { url, key } = sbEnv();
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store"
    });
    if (!res.ok) {
      console.error(`second-brain read failed: ${path} -> ${res.status}`);
      return [];
    }
    return (await res.json()) as T[];
  } catch (err) {
    console.error("second-brain read threw", err);
    return [];
  }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Markdown only, and markdown means markdown: marked passes raw HTML straight
// through by default, so a <script> typed into a block body would run in the
// reader's browser. These blocks are authored by the owner rather than a
// client, so this is not the likeliest attack — but the document is assembled
// from database rows and shown to someone outside the company, and "the person
// typing is trusted" is not a property worth depending on. Both block-level and
// inline HTML tokens render as visible text instead.
const md = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html({ text }: { text: string }) {
      return esc(text);
    }
  }
});

// A table is the one thing in a block body that legitimately wants to be wider
// than the column, so it scrolls in its own box rather than pushing the page
// sideways on a phone. marked has no hook for wrapping a finished table, so it
// happens on the way out.
const wrapTables = (html: string) =>
  html.replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, "</table></div>");

/** A block's body, as HTML. */
function renderBody(block: ProjectBlock) {
  if (block.format === "html") return esc(block.body);
  return wrapTables(md.parse(block.body, { async: false }) as string);
}

/**
 * Group blocks into the sections they were authored as. A tab is a section of
 * the document, in the order Client Hub shows them.
 */
function sections(blocks: ProjectBlock[]) {
  const order: string[] = [];
  const byTab = new Map<string, ProjectBlock[]>();
  for (const b of blocks) {
    if (!byTab.has(b.tab)) {
      byTab.set(b.tab, []);
      order.push(b.tab);
    }
    byTab.get(b.tab)!.push(b);
  }
  return order.map((tab) => ({ tab, blocks: byTab.get(tab)!.sort((a, b) => a.sort - b.sort) }));
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=IBM+Plex+Mono:wght@400;600&family=Karla:wght@300;400;500;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink:#141A1F; --ink-soft:#2C363E; --paper:#FFFFFF; --wash:#EEF1F3;
    --rule:#D6DCE0; --mid:#5C6B74; --dim:#8C99A1; --green:#0E7C66;
    --mono:'IBM Plex Mono',ui-monospace,monospace;
    --sans:'Karla',-apple-system,BlinkMacSystemFont,sans-serif;
    --serif:'Fraunces',Georgia,serif;
  }
  html { scroll-behavior: smooth; }
  body { font-family: var(--sans); background: var(--paper); color: var(--ink); -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 920px; margin: 0 auto; padding: 0 44px; }

  /* Not sticky: DocFrame sizes the iframe to the whole document, so nothing
     scrolls inside it and a sticky bar would only ever sit still. */
  .topbar { background: var(--ink); color:#fff; padding: 13px 0; }
  .topbar .wrap { display:flex; justify-content:space-between; align-items:center; gap:16px; }
  .topbar-l { font-family: var(--mono); font-size:10.5px; font-weight:600; letter-spacing:.13em; color:#7C8A92; }
  .topbar-l b { color:#fff; font-weight:600; }
  .topbar-r { font-family: var(--mono); font-size:10px; color:#5A666D; letter-spacing:.06em; }

  .hero { background: var(--ink); color:#fff; padding: 72px 0 66px; border-bottom: 3px solid var(--green); }
  .eyebrow { font-family: var(--mono); font-size:10.5px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color: var(--green); }
  .hero .eyebrow { color:#4FB89F; margin-bottom: 22px; }
  .hero h1 { font-family: var(--serif); font-size: clamp(34px,5.4vw,54px); font-weight:700; line-height:1.04; letter-spacing:-.022em; max-width:15ch; text-wrap:balance; margin-bottom:24px; }
  .hero-sub { font-size:17.5px; line-height:1.68; color:#A7B3B9; max-width:54ch; font-weight:300; }
  .hero-meta { display:flex; flex-wrap:wrap; gap:34px; margin-top:42px; }
  .hero-meta div { font-family: var(--mono); font-size:9.5px; letter-spacing:.12em; text-transform:uppercase; color:#5A666D; line-height:2.1; }
  .hero-meta div span { display:block; font-family: var(--sans); font-size:14px; letter-spacing:0; text-transform:none; color:#DDE3E6; font-weight:500; }

  section { padding: 52px 0; border-bottom: 1px solid var(--rule); }
  section:last-of-type { border-bottom: none; }
  .sec-head { display:flex; align-items:baseline; gap:16px; margin-bottom: 28px; }
  .sec-head .rule { flex:1; height:1px; background: var(--rule); }

  .block + .block { margin-top: 34px; padding-top: 30px; border-top: 1px solid var(--rule); }
  .block h2 { font-family: var(--serif); font-size:25px; font-weight:700; letter-spacing:-.018em; line-height:1.2; margin-bottom:16px; text-wrap:balance; }

  .body { font-size:16px; line-height:1.74; color: var(--ink-soft); }
  .body > * + * { margin-top: 15px; }
  .body h1, .body h2, .body h3 { font-family: var(--serif); font-weight:700; letter-spacing:-.014em; color: var(--ink); margin-top: 26px; }
  .body h1 { font-size:22px; } .body h2 { font-size:20px; } .body h3 { font-size:17.5px; }
  .body strong { font-weight:700; color: var(--ink); }
  .body em { font-style: italic; }
  .body a { color: var(--green); text-decoration: underline; text-underline-offset: 2px; }
  .body ul, .body ol { padding-left: 0; list-style: none; }
  .body ul > li, .body ol > li { position: relative; padding: 10px 0 10px 26px; border-top: 1px solid var(--rule); }
  .body ul > li:last-child, .body ol > li:last-child { border-bottom: 1px solid var(--rule); }
  /* A list that ends a block needs no closing rule — the block separator is
     already one, and two of them read as an empty row. */
  .body > ul:last-child > li:last-child, .body > ol:last-child > li:last-child { border-bottom: none; }
  .body ul > li::before { content:''; position:absolute; left:0; top:20px; width:11px; height:1px; background: var(--green); }
  .body ol { counter-reset: n; }
  .body ol > li { counter-increment: n; }
  .body ol > li::before { content: counter(n,decimal-leading-zero); position:absolute; left:0; top:10px; font-family: var(--mono); font-size:11px; font-weight:600; color: var(--green); }
  .body li > ul, .body li > ol { margin-top: 6px; }
  .body li > ul > li, .body li > ol > li { border: none; padding-top: 4px; padding-bottom: 4px; }
  .body li > ul > li:last-child, .body li > ol > li:last-child { border-bottom: none; }
  .body blockquote { font-family: var(--mono); font-size:12.5px; line-height:1.7; color: var(--ink); background: var(--wash); padding:18px 20px; border-left:3px solid var(--ink); }
  .body blockquote p + p { margin-top: 10px; }
  .body code { font-family: var(--mono); font-size:.9em; background: var(--wash); padding:1px 5px; border-radius:2px; }
  .body pre { background: var(--wash); padding:16px 18px; overflow-x:auto; border-left:3px solid var(--ink); }
  .body pre code { background:none; padding:0; }
  .body hr { border:none; border-top:1px solid var(--rule); margin: 26px 0; }
  .body img { max-width:100%; height:auto; }
  .table-scroll { overflow-x:auto; }
  .body table { border-collapse: collapse; width:100%; font-size:14.5px; }
  .body th, .body td { text-align:left; padding:10px 14px 10px 0; border-bottom:1px solid var(--rule); vertical-align: top; }
  .body th { font-family: var(--mono); font-size:9.5px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color: var(--mid); border-bottom-color: var(--ink); }

  .signoff { padding:46px 0 54px; border-top:2px solid var(--ink); display:flex; justify-content:space-between; align-items:flex-end; gap:28px; flex-wrap:wrap; }
  .signoff-l { font-size:14.5px; line-height:1.8; color: var(--mid); }
  .signoff-l b { display:block; font-family: var(--serif); font-size:17px; font-weight:700; color: var(--ink); letter-spacing:-.01em; }
  .signoff-r { font-family: var(--mono); font-size:10px; color: var(--dim); text-align:right; line-height:2; letter-spacing:.05em; }

  .sitefoot { background: var(--ink); padding: 34px 0; }
  .sitefoot .wrap { display:flex; justify-content:space-between; align-items:center; gap:22px; flex-wrap:wrap; }
  .sitefoot-brand { font-family: var(--mono); font-size:10.5px; font-weight:600; letter-spacing:.12em; color:#4A565D; }
  .sitefoot-brand b { color:#fff; font-weight:600; }
  .sitefoot ul { display:flex; gap:10px; list-style:none; flex-wrap:wrap; }
  .sitefoot a { font-family: var(--mono); font-size:10px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#93A0A7; text-decoration:none; padding:9px 15px; border:1px solid #2B353B; border-radius:2px; transition: color .15s ease, border-color .15s ease, background .15s ease; }
  .sitefoot a:hover, .sitefoot a:focus-visible { color:#fff; border-color: var(--green); background: rgba(14,124,102,.16); outline:none; }

  @media (max-width: 720px) {
    .wrap { padding: 0 22px; }
    .hero { padding: 52px 0 46px; }
    .hero-meta { gap: 22px; }
    section { padding: 40px 0; }
    .signoff { flex-direction: column; align-items: flex-start; }
    .signoff-r { text-align: left; }
  }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior:auto; } * { transition:none !important; } }
`;

const NAV = ["work", "insights", "method", "about", "contact"];

function document_(opts: {
  title: string;
  heading: string;
  subheading: string;
  preparedFor: string;
  preparedBy: string;
  eyebrow: string;
  sections: { tab: string; blocks: ProjectBlock[] }[];
  date: string;
}) {
  const body = opts.sections
    .map(
      (s, i) => `
    <section>
      <div class="sec-head"><span class="eyebrow">${String(i + 1).padStart(2, "0")} · ${esc(s.tab)}</span><span class="rule"></span></div>
      ${s.blocks
        .map(
          (b) => `<div class="block">
        ${b.title ? `<h2>${esc(b.title)}</h2>` : ""}
        <div class="body">${renderBody(b)}</div>
      </div>`
        )
        .join("\n")}
    </section>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${esc(opts.title)}</title>
<style>${CSS}</style>
</head>
<body>
  <div class="topbar"><div class="wrap">
    <div class="topbar-l">בע"ה · <b>AVENTARY</b></div>
    <div class="topbar-r">Confidential · ${esc(opts.date)}</div>
  </div></div>

  <div class="hero"><div class="wrap">
    ${opts.eyebrow ? `<div class="eyebrow">${esc(opts.eyebrow)}</div>` : ""}
    <h1>${esc(opts.heading)}</h1>
    ${opts.subheading ? `<p class="hero-sub">${esc(opts.subheading)}</p>` : ""}
    <div class="hero-meta">
      ${opts.preparedFor ? `<div>Prepared for<span>${esc(opts.preparedFor)}</span></div>` : ""}
      ${opts.preparedBy ? `<div>Prepared by<span>${esc(opts.preparedBy)}</span></div>` : ""}
    </div>
  </div></div>

  <div class="wrap">
${body}
    <div class="signoff">
      <div class="signoff-l">
        <b>${esc(opts.preparedBy || "Aventary")}</b>
        Salesforce Advisory · AI Implementation<br>
        aventary.com
      </div>
      <div class="signoff-r">
        ${esc(opts.date)}<br>
        ${opts.preparedFor ? `Prepared for ${esc(opts.preparedFor)}` : "Confidential"}
      </div>
    </div>
  </div>

  <div class="sitefoot"><div class="wrap">
    <div class="sitefoot-brand">בע"ה · <b>AVENTARY</b></div>
    <nav><ul>${NAV.map((n) => `<li><a href="https://aventary.com/${n}">${n[0].toUpperCase()}${n.slice(1)}</a></li>`).join("")}</ul></nav>
  </div></div>
</body>
</html>`;
}

/**
 * Just the reader list and title for a published project, without building the
 * document. Sign-in checks need the allowlist on every attempt and have no use
 * for the HTML.
 */
export async function getProjectAccess(
  slug: string
): Promise<{ title: string; readers: string[] } | null> {
  if (!projectPagesConfigured()) return null;
  const rows = await sbSelect<Pick<ProjectRow, "name" | "public_meta" | "page_readers">>(
    `projects?client_slug=eq.${encodeURIComponent(slug)}&page_published=is.true` +
      `&select=name,public_meta,page_readers&limit=1`
  );
  const p = rows[0];
  if (!p) return null;
  return {
    title: p.public_meta?.heading || p.name,
    readers: (p.page_readers ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean)
  };
}

/**
 * The published project behind a slug, or null.
 *
 * Null for every reason that is not "here is the page": not configured, no
 * project claims the slug, the project is not published, or it has no public
 * blocks. A published page with nothing public on it is not a page — serving an
 * empty document would look like a mistake to whoever opened it.
 */
export async function getProjectPage(slug: string): Promise<ProjectPage | null> {
  if (!projectPagesConfigured()) return null;

  const q = encodeURIComponent(slug);
  const rows = await sbSelect<ProjectRow>(
    `projects?client_slug=eq.${q}&page_published=is.true&select=tenant_id,id,name,client,public_meta,page_readers&limit=1`
  );
  const project = rows[0];
  if (!project) return null;

  const blocks = await sbSelect<ProjectBlock>(
    `project_blocks?project_id=eq.${project.id}&tenant_id=eq.${project.tenant_id}` +
      `&visibility=eq.public&select=tab,title,body,format,sort&order=tab.asc,sort.asc`
  );
  if (!blocks.length) return null;

  const meta = project.public_meta ?? {};
  const heading = meta.heading || project.name;
  const preparedFor = meta.prepared_for || project.client || "";

  return {
    title: heading,
    blurb: meta.subheading || "",
    readers: (project.page_readers ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean),
    html: document_({
      title: heading,
      heading,
      subheading: meta.subheading || "",
      preparedFor,
      preparedBy: meta.prepared_by || "Mendy Ezagui · Aventary",
      eyebrow: project.client || "",
      sections: sections(blocks),
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    })
  };
}
