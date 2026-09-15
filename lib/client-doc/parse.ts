import { DEFAULT_WIDTH, isWidth, type DocWidth } from "./tokens";
import { md, mdInline, plain } from "./markdown";

// Turning one row of project_blocks into one typed component.
//
// THE PROBLEM THIS SOLVES. A block in Client Hub is a tab, a title, a markdown
// body and a sort order. That is enough to render a document as a stack of
// identical prose slabs, which is what it did. It is not enough to say "these
// three numbers are a metric row" or "this paragraph is a warning", so every
// document looked the same and the only way to get a different shape was to
// hand-write HTML in content/clients and deploy.
//
// THE SHAPE OF THE ANSWER. A block body may open with directive lines, which
// say which component renders it and how:
//
//   @component: metrics
//   @width: full
//
//   42% | of leads never get a second touch
//   11 days | average time to first response
//
// Directives end at the first line that is not one. Everything after is the
// body, parsed by the component named. No directives at all means `prose`,
// which is what every block written before this existed already is — so the
// convention is additive and nothing had to be migrated.
//
// WHY A TEXT CONVENTION AND NOT A COLUMN. Client Hub is a different repository
// and a different database. A convention that lives inside the body field works
// today, in the editor that exists, with no schema change and no coordinated
// deploy. When Client Hub grows a component picker it can write these same
// lines, and nothing here changes.
//
// ONE SEPARATOR. Structured components split their parts on `|`, everywhere,
// without exception. Having learned one component you can guess the rest.

export type Directives = Record<string, string>;

const DIRECTIVE = /^@([a-z][a-z0-9-]*)\s*(?::\s*(.*))?$/i;

/**
 * Split directive lines off the top of a body.
 *
 * Leading blank lines are skipped; the run ends at the first line that is not a
 * directive. A bare `@collapsed` with no colon is a flag and comes back as
 * "true", so the common case reads as a word rather than as `@collapsed: true`.
 */
export function readDirectives(body: string): { directives: Directives; rest: string } {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const directives: Directives = {};
  let i = 0;

  while (i < lines.length && !lines[i].trim()) i++;
  for (; i < lines.length; i++) {
    const m = lines[i].trim().match(DIRECTIVE);
    if (!m) break;
    directives[m[1].toLowerCase()] = (m[2] ?? "true").trim();
  }

  return { directives, rest: lines.slice(i).join("\n").trim() };
}

/** Split on the first `|`, or on an em dash when the author typed prose. */
function pipe(line: string): string[] {
  const parts = line.includes("|") ? line.split("|") : line.split(/\s+—\s+/);
  return parts.map((p) => p.trim()).filter((p, idx) => idx === 0 || p.length > 0);
}

/** Strip a leading list bullet or ordinal, so list and plain-line forms both work. */
const debullet = (line: string) => line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").trim();

/** Non-empty lines of a body, bullets removed. */
function rows(body: string): string[][] {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => pipe(debullet(l)));
}

/**
 * Split a body into `### Heading` groups.
 *
 * A heading may carry a badge after a pipe — `### Discovery | Weeks 1-2` — which
 * is what makes one parser serve both `cards` (badge is a tag) and `steps`
 * (badge is a timeframe).
 */
function groups(body: string): { title: string; badge: string; body: string }[] {
  const parts = body.split(/^\s*#{2,4}\s+/m).filter((p) => p.trim());
  return parts.map((part) => {
    const nl = part.indexOf("\n");
    const head = (nl === -1 ? part : part.slice(0, nl)).trim();
    const rest = nl === -1 ? "" : part.slice(nl + 1).trim();
    const [title, badge = ""] = pipe(head);
    return { title, badge, body: rest };
  });
}

const slugify = (s: string) =>
  plain(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "block";

export const TONES = ["note", "warn", "good", "quiet"] as const;
export type Tone = (typeof TONES)[number];

/** Every component the document can render. */
export type DocBlock =
  | { kind: "prose"; id: string; title: string | null; width: DocWidth; html: string }
  | { kind: "callout"; id: string; title: string | null; width: DocWidth; tone: Tone; html: string }
  | { kind: "quote"; id: string; title: string | null; width: DocWidth; html: string; by: string | null }
  | {
      kind: "metrics";
      id: string;
      title: string | null;
      width: DocWidth;
      items: { value: string; label: string; note: string | null }[];
    }
  | {
      kind: "cards";
      id: string;
      title: string | null;
      width: DocWidth;
      columns: number | null;
      items: { title: string; badge: string | null; html: string }[];
    }
  | {
      kind: "steps";
      id: string;
      title: string | null;
      width: DocWidth;
      items: { title: string; when: string | null; html: string }[];
    }
  | {
      kind: "keyvalue";
      id: string;
      title: string | null;
      width: DocWidth;
      items: { term: string; value: string }[];
    }
  | {
      kind: "figure";
      id: string;
      title: string | null;
      width: DocWidth;
      src: string | null;
      alt: string;
      caption: string | null;
    };

export type BlockKind = DocBlock["kind"];

/** `table` is prose that defaults to the wide measure. Everything else is itself. */
const ALIASES: Record<string, BlockKind> = {
  text: "prose",
  markdown: "prose",
  prose: "prose",
  table: "prose",
  note: "callout",
  callout: "callout",
  quote: "quote",
  pull: "quote",
  metrics: "metrics",
  stats: "metrics",
  cards: "cards",
  grid: "cards",
  steps: "steps",
  timeline: "steps",
  phases: "steps",
  keyvalue: "keyvalue",
  facts: "keyvalue",
  figure: "figure",
  image: "figure"
};

export type RawBlock = {
  tab: string;
  title: string | null;
  body: string;
  format: string;
  sort: number;
};

/**
 * One row in, one component out.
 *
 * Never throws and never returns null. A body that does not parse as the
 * component it names falls back to prose with the original text, because a
 * client opening a proposal should see the paragraph somebody wrote even when
 * the directive above it was mistyped. Silently dropping content is the one
 * failure mode this must not have.
 */
export function parseBlock(raw: RawBlock, index: number): DocBlock {
  // format:"html" has always meant "show this as text" here — a body that is
  // not markdown is not a licence to inject markup into a client's browser.
  if (raw.format === "html") {
    return {
      kind: "prose",
      id: blockId(raw, index),
      title: raw.title,
      width: "text",
      html: `<pre class="avd-raw">${raw.body.replace(/[<&]/g, (c) => (c === "<" ? "&lt;" : "&amp;"))}</pre>`
    };
  }

  const { directives, rest } = readDirectives(raw.body);
  const named = (directives.component || directives.type || directives.as || "").toLowerCase();
  const kind = ALIASES[named] ?? "prose";
  const id = blockId(raw, index);
  const title = raw.title?.trim() || null;
  const width = isWidth(directives.width)
    ? directives.width
    : named === "table"
      ? "wide"
      : (DEFAULT_WIDTH[kind] ?? "text");

  const base = { id, title, width } as const;

  try {
    switch (kind) {
      case "callout": {
        const tone = (TONES as readonly string[]).includes(directives.tone)
          ? (directives.tone as Tone)
          : "note";
        return { kind, ...base, tone, html: md(rest) };
      }

      case "quote": {
        const lines = rest.split("\n");
        const last = lines[lines.length - 1]?.trim() ?? "";
        const attributed = /^[—–-]\s+\S/.test(last);
        const by = attributed ? last.replace(/^[—–-]\s+/, "").trim() : null;
        const text = attributed ? lines.slice(0, -1).join("\n").trim() : rest;
        return { kind, ...base, html: md(text), by };
      }

      case "metrics": {
        const items = rows(rest)
          .filter((r) => r.length >= 2)
          .map(([value, label, note]) => ({
            value: plain(value),
            label: mdInline(label),
            note: note ? mdInline(note) : null
          }));
        if (!items.length) break;
        return { kind, ...base, items };
      }

      case "cards": {
        const items = groups(rest).map((g) => ({
          title: mdInline(g.title),
          badge: g.badge ? mdInline(g.badge) : null,
          html: md(g.body)
        }));
        if (!items.length) break;
        const n = Number(directives.columns);
        return { kind, ...base, columns: n >= 1 && n <= 4 ? n : null, items };
      }

      case "steps": {
        const items = groups(rest).map((g) => ({
          title: mdInline(g.title),
          when: g.badge ? mdInline(g.badge) : null,
          html: md(g.body)
        }));
        if (!items.length) break;
        return { kind, ...base, items };
      }

      case "keyvalue": {
        const items = rows(rest)
          .filter((r) => r.length >= 2)
          .map(([term, value]) => ({ term: mdInline(term), value: mdInline(value) }));
        if (!items.length) break;
        return { kind, ...base, items };
      }

      case "figure": {
        const img = rest.match(/!\[([^\]]*)\]\(([^)\s]+)/);
        const src = directives.src || img?.[2] || null;
        const caption = rest.replace(/!\[[^\]]*\]\([^)]*\)/, "").trim();
        if (!src || !/^https:\/\//.test(src)) break;
        return {
          kind,
          ...base,
          src,
          alt: directives.alt || img?.[1] || title || "",
          caption: caption ? mdInline(caption) : null
        };
      }
    }
  } catch {
    // Fall through to prose. See the contract above: content is never dropped.
  }

  return { kind: "prose", ...base, html: md(rest || raw.body) };
}

function blockId(raw: RawBlock, index: number) {
  return `b${index + 1}-${slugify(raw.title || raw.tab)}`;
}
