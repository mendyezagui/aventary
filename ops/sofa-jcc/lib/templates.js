// Flyer templates — modelled directly on the shul's own Friday-night speaker
// flyer, not on a generic layout.
//
// The house language, held constant across all templates:
//   · parchment ground, never a dark hero
//   · ב"ה top right, logo lockup top left, navy rule under the header
//   · everything centred
//   · maroon uppercase eyebrows, gold uppercase labels
//   · a serif display voice, with the Hebrew name set directly under the English
//   · a three-column detail strip separated by hairlines
//   · a navy footer bar carrying the greeting
//
// Consistency is STRUCTURAL. The layout, palette, type scale and logo position
// are fixed here; a model only ever supplies words, and those words land in
// slots. Two flyers six months apart are the same object with different text.

import { BRAND, COLORS, FONTS, CANVAS, RULES, LOGO } from "./brand.js";

/** Flyer copy can come from a model or a speaker's own website. Neither is
 *  trusted markup. */
export const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** "2026-09-12" -> "Saturday, September 12". Date-only maths: no TZ shift. */
export const longDate = (iso, { weekday = true } = {}) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    ...(weekday ? { weekday: "long" } : {}), month: "long", day: "numeric",
  });
};

/** Over-long copy breaks the layout silently. Clip and move on. */
const clip = (s, max) => {
  const t = String(s ?? "").trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
};

// `origin` lets the headless renderer pass an absolute base for the logo,
// which has no page origin to resolve a root-relative path against.
/**
 * Print mode. The parchment ground is right on a screen and on a single
 * professionally printed sheet, but a handout gets photocopied: a full-bleed
 * cream page burns toner on every copy and greys out on a cheap printer.
 * `print: true` drops the page to white and keeps the ink where it carries
 * meaning — the navy rule, the gold labels, the maroon headings.
 * Appended last so it wins on cascade order without !important.
 */
const printOverrides = () => `
  body, .flyer { background: ${COLORS.white}; }
  .callout { background: ${COLORS.white}; }
  .portrait.empty { background: ${COLORS.white}; }
  .badge { background: ${COLORS.white}; }`;

const shell = ({ w, h, title, body, extraCss = "", origin = "", print = false }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<base href="${esc(origin || "/")}">
<title>${esc(title)}</title>
<style>
  @page { size: ${w}px ${h}px; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${w}px; height: ${h}px; }
  body {
    font-family: ${FONTS.display};
    color: ${COLORS.navyDeep};
    background: ${COLORS.cream};
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }
  .flyer { width: ${w}px; height: ${h}px; display: flex; flex-direction: column; }

  /* ---- header ---- */
  .hdr { display: flex; align-items: center; gap: 26px; padding: 34px 54px 26px; }
  .hdr img { height: 104px; width: auto; display: block; flex: none; }
  .hdr .names { flex: 1; min-width: 0; }
  .hdr .en { font-size: 46px; font-weight: 700; color: ${COLORS.navyDeep}; line-height: 1.08; letter-spacing: -.3px; }
  .hdr .he { font-family: ${FONTS.hebrew}; font-size: 27px; color: ${COLORS.gold}; margin-top: 6px; direction: rtl; text-align: left; }
  .hdr .bh { font-family: ${FONTS.hebrew}; font-size: 25px; color: ${COLORS.navy}; align-self: flex-start; flex: none; }
  .hrule { height: 5px; background: ${COLORS.navy}; }

  /* ---- body ---- */
  .body { flex: 1; display: flex; flex-direction: column; text-align: center;
          padding: 40px 82px 0; min-height: 0; }
  .content { flex: 1; display: flex; flex-direction: column; align-items: center;
             justify-content: center; min-height: 0; }
  .tail { flex: none; display: flex; flex-direction: column; align-items: center; }
  .eyebrow {
    font-family: ${FONTS.sans}; font-size: 21px; font-weight: 700;
    letter-spacing: 5px; text-transform: uppercase; color: ${COLORS.maroon};
  }
  .eyebrow.gold { color: ${COLORS.gold}; }
  .eyebrow.sm { font-size: 17px; letter-spacing: 4px; }
  .lede { font-size: 33px; font-style: italic; color: ${COLORS.navy}; line-height: 1.42; max-width: 900px; }
  .name { font-size: 92px; font-weight: 700; line-height: 1.02; letter-spacing: -1.5px; color: ${COLORS.navyDeep}; }
  .name-he { font-family: ${FONTS.hebrew}; font-size: 54px; color: ${COLORS.navyDeep}; direction: rtl; margin-top: 8px; line-height: 1.15; }
  .divider { width: 210px; height: 3px; background: ${COLORS.gold}; }
  .role { font-size: 31px; font-weight: 700; color: ${COLORS.navyDeep}; line-height: 1.35; }
  .role em { font-style: normal; color: ${COLORS.maroon}; }
  .note { font-size: 22px; color: ${COLORS.navy}; line-height: 1.55; max-width: 940px; }
  .portrait {
    border: 3px solid ${COLORS.gold}; padding: 5px; background: ${COLORS.white};
    width: 330px; height: 400px; overflow: hidden; display: flex; align-items: center; justify-content: center;
  }
  .portrait img { width: 100%; height: 100%; object-fit: cover; display: block; }
  /* No headshot yet: an intentional placeholder, not a broken image. The gap
     list is already asking for one. */
  .portrait.empty { background: ${COLORS.cream2}; border-style: dashed; }
  .portrait .fallback { width: 74%; height: auto; object-fit: contain; opacity: .26; }

  /* ---- detail strip ---- */
  .strip { display: flex; width: 100%; border-top: 2px solid ${COLORS.line}; }
  .strip .col { flex: 1; padding: 26px 18px 22px; text-align: center; }
  .strip .col + .col { border-left: 2px solid ${COLORS.line}; }
  .strip .k {
    font-family: ${FONTS.sans}; font-size: 16px; font-weight: 700;
    letter-spacing: 3.4px; text-transform: uppercase; color: ${COLORS.gold};
  }
  .strip .v { font-size: 34px; font-weight: 700; color: ${COLORS.navyDeep}; margin-top: 10px; line-height: 1.2; }
  .strip .sub { font-size: 20px; color: ${COLORS.navy}; margin-top: 7px; line-height: 1.3; }
  .strip .sub.he { font-family: ${FONTS.hebrew}; direction: rtl; }

  /* ---- footer ---- */
  .foot {
    background: ${COLORS.navy}; color: ${COLORS.cream};
    padding: 22px; text-align: center; font-size: 25px; letter-spacing: 2.4px;
  }
  .foot .he { font-family: ${FONTS.hebrew}; color: ${COLORS.goldLight}; }
${extraCss}
${print ? printOverrides() : ""}
</style></head>
<body><div class="flyer">${body}</div></body></html>`;

const header = () => `
  <div class="hdr">
    <img src="${LOGO.lockup}" alt="${esc(BRAND.publicName)}">
    <div class="names">
      <div class="en">${esc(BRAND.name)}</div>
      <div class="he">${esc(BRAND.nameHe)}</div>
    </div>
    <div class="bh">${esc(BRAND.bh)}</div>
  </div>
  <div class="hrule"></div>`;

const footer = (greeting) => `
  <div class="foot">${greeting
    ? esc(greeting)
    : `<span class="he">${esc(BRAND.shabbosGreeting.he)}</span> &nbsp;·&nbsp; ${esc(BRAND.shabbosGreeting.en).toUpperCase()}`}</div>`;

/** The three-column strip. Columns with no value are dropped, so a flyer with
 *  two facts is still balanced rather than showing an empty cell. */
const strip = (cols) => {
  const live = cols.filter((c) => c && c.v);
  if (!live.length) return "";
  return `<div class="strip">${live.map((c) => `
    <div class="col">
      <div class="k">${esc(c.k)}</div>
      <div class="v">${esc(c.v)}</div>
      ${c.sub ? `<div class="sub${c.subHe ? " he" : ""}">${esc(c.sub)}</div>` : ""}
    </div>`).join("")}</div>`;
};

const gap = (px) => `<div style="height:${px}px"></div>`;

// ------------------------------------------------------------------
// SPEAKER — the template Mendy asked to be identical every time. Nothing
// about the frame is parameterised: same header, same portrait plate, same
// name scale, same strip. Only the words change.
// ------------------------------------------------------------------
export function speakerFlyer(ev = {}, speaker = {}, opts = {}) {
  const { w, h } = CANVAS[opts.canvas] || CANVAS.letter;
  const hasHeadshot = !!speaker.headshot_url;
  const portrait = hasHeadshot
    ? `<img src="${esc(speaker.headshot_url)}" alt="${esc(speaker.name)}">`
    : `<img class="fallback" src="${LOGO.mark}" alt="">`;
  // "Executive Director, The Steinsaltz Center, Jerusalem" — the org is
  // emphasised in maroon, matching the shul's own flyer.
  const role = speaker.org
    ? [speaker.title, `<em>${esc(speaker.org)}</em>`, speaker.org_place].filter(Boolean).join(", ")
    : esc(speaker.title || "");
  const body = `
  ${header()}
  <div class="body">
    <div class="content">
    ${ev.occasion ? `<div class="eyebrow">${esc(ev.occasion)}</div>${gap(14)}` : ""}
    ${ev.parsha ? `<div class="eyebrow">${esc(ev.parsha)}</div>${gap(26)}` : ""}
    ${ev.lede ? `<div class="lede">${esc(ev.lede)}</div>${gap(30)}` : ""}
    <div class="portrait${hasHeadshot ? "" : " empty"}">${portrait}</div>
    ${gap(26)}
    ${speaker.honorific ? `<div class="eyebrow gold sm">${esc(speaker.honorific)}</div>${gap(10)}` : ""}
    <div class="name">${esc(clip(speaker.name || "", RULES.maxHeadlineChars))}</div>
    ${speaker.name_he ? `<div class="name-he">${esc(speaker.name_he)}</div>` : ""}
    ${gap(26)}<div class="divider"></div>${gap(26)}
    ${role ? `<div class="role">${role}</div>${gap(16)}` : ""}
    ${(speaker.credentials || []).slice(0, 3).map((c) => `<div class="note">${esc(c)}</div>`).join("")}
    </div>
    <div class="tail">
    ${gap(28)}
    ${strip([
      { k: "Date", v: longDate(ev.event_date), sub: ev.hebrew_date, subHe: true },
      { k: ev.time_label || "Candle Lighting", v: ev.candle_lighting || ev.start_time, sub: ev.candle_lighting ? BRAND.city : ev.location },
      { k: ev.slot_label || "Words of Inspiration", v: ev.slot || "", sub: ev.slot_note || "" },
    ])}
    ${gap(22)}
    <div class="eyebrow gold sm">${esc(ev.welcome || "All Are Welcome")}</div>
    ${gap(26)}
    </div>
  </div>
  ${footer(ev.greeting)}`;
  return shell({ w, h, title: `${BRAND.name} — ${speaker.name || "Guest Speaker"}`, body, origin: opts.origin, print: !!opts.print });
}

// ------------------------------------------------------------------
// HOLIDAY — same frame, the festival name where the speaker's name goes.
// ------------------------------------------------------------------
export function holidayFlyer(ev = {}, opts = {}) {
  const { w, h } = CANVAS[opts.canvas] || CANVAS.letter;
  const body = `
  ${header()}
  <div class="body">
    <div class="content">
    ${ev.occasion ? `<div class="eyebrow">${esc(ev.occasion)}</div>${gap(26)}` : ""}
    ${ev.lede ? `<div class="lede">${esc(ev.lede)}</div>${gap(30)}` : ""}
    <div class="eyebrow gold sm">${esc(ev.kicker || "Join Us For")}</div>${gap(14)}
    <div class="name">${esc(clip(ev.headline || ev.title || "", RULES.maxHeadlineChars))}</div>
    ${ev.headline_he ? `<div class="name-he">${esc(ev.headline_he)}</div>` : ""}
    ${gap(26)}<div class="divider"></div>${gap(26)}
    ${ev.subhead ? `<div class="role">${esc(clip(ev.subhead, RULES.maxSubheadChars))}</div>${gap(18)}` : ""}
    ${ev.description ? `<div class="note">${esc(ev.description)}</div>` : ""}
    </div>
    <div class="tail">
    ${gap(28)}
    ${strip([
      { k: "Date", v: longDate(ev.event_date), sub: ev.hebrew_date, subHe: true },
      { k: ev.candle_lighting ? "Candle Lighting" : "Time", v: ev.candle_lighting || ev.start_time, sub: ev.candle_lighting ? BRAND.city : (ev.end_time ? `until ${ev.end_time}` : "") },
      { k: "Where", v: ev.location, sub: ev.address },
    ])}
    ${gap(22)}
    <div class="eyebrow gold sm">${esc(ev.welcome || "All Are Welcome")}</div>
    ${gap(26)}
    </div>
  </div>
  ${footer(ev.greeting)}`;
  return shell({ w, h, title: `${BRAND.name} — ${ev.headline || ev.title || "Flyer"}`, body, origin: opts.origin, print: !!opts.print });
}

// ------------------------------------------------------------------
// WEEKLY — the week at a glance. Same header and footer, a ruled list where
// the display name would be.
// ------------------------------------------------------------------
export function weeklyFlyer(week = {}, opts = {}) {
  const { w, h } = CANVAS[opts.canvas] || CANVAS.letter;
  const items = Array.isArray(week.items) ? week.items : [];
  const extraCss = `
  .list { width: 100%; }
  .item { display: flex; gap: 26px; padding: 24px 6px; border-bottom: 2px solid ${COLORS.line}; text-align: left; align-items: baseline; }
  .item:last-child { border-bottom: 0; }
  .item .day {
    width: 210px; flex: none; font-family: ${FONTS.sans}; font-size: 17px; font-weight: 700;
    letter-spacing: 3.2px; text-transform: uppercase; color: ${COLORS.gold};
  }
  .item .what { font-size: 34px; font-weight: 700; color: ${COLORS.navyDeep}; line-height: 1.25; }
  .item .when { font-size: 21px; color: ${COLORS.navy}; margin-top: 5px; }`;
  const body = `
  ${header()}
  <div class="body">
    <div class="content">
    <div class="eyebrow">${esc(week.occasion || "This Week")}</div>${gap(16)}
    <div class="name" style="font-size:74px">${esc(week.headline || "This Week at The SoFa")}</div>
    ${gap(12)}<div class="note">${esc(week.subhead || "")}</div>
    ${gap(26)}<div class="divider"></div>${gap(18)}
    <div class="list">
      ${items.length ? items.map((it) => `
      <div class="item">
        <div class="day">${esc(it.day || longDate(it.event_date).split(",")[0])}</div>
        <div>
          <div class="what">${esc(it.title || "")}</div>
          <div class="when">${esc([it.start_time, it.location].filter(Boolean).join(" · "))}</div>
        </div>
      </div>`).join("") : `<div class="note">No programs scheduled yet this week.</div>`}
    </div>
    </div>
    <div class="tail">
    ${gap(24)}
    ${strip([
      { k: "Candle Lighting", v: week.candle_lighting, sub: BRAND.city },
      { k: "Parsha", v: week.parsha, sub: week.hebrew_date, subHe: true },
      { k: "Havdalah", v: week.havdalah, sub: BRAND.city },
    ])}
    ${gap(22)}
    <div class="eyebrow gold sm">${esc(week.welcome || "All Are Welcome")}</div>
    ${gap(26)}
    </div>
  </div>
  ${footer(week.greeting)}`;
  return shell({ w, h, title: `${BRAND.name} — ${week.headline || "This Week"}`, body, extraCss, origin: opts.origin, print: !!opts.print });
}

// ------------------------------------------------------------------
// LABEL — the sefarim book-plate, 4 up on a Letter sheet. Reproduces the
// shul's existing Word template so the associate can generate a dedication
// sheet without anyone opening Word.
// ------------------------------------------------------------------
export function labelSheet(label = {}, opts = {}) {
  const { w, h } = CANVAS.letter;
  const dedication = label.dedication_he || "";
  const per = label.count || 4;
  // Labels print on white label stock, so this one template drops the
  // parchment ground — cream would print as a muddy box on every sticker.
  const extraCss = `
  body, .flyer { background: ${COLORS.white}; }
  .sheet { display: grid; grid-template-rows: repeat(${per}, 1fr); height: ${h}px; padding: 40px 60px; gap: 0; }
  .label {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; gap: 12px; padding: 22px 30px;
    border-bottom: 2px dashed ${COLORS.line};
  }
  .label:last-child { border-bottom: 0; }
  .label .ded-en { font-size: 26px; font-weight: 700; color: ${COLORS.navyDeep}; }
  .label img { height: 118px; width: auto; }
  .label .shul { font-family: ${FONTS.hebrew}; font-size: 30px; color: ${COLORS.navyDeep}; direction: rtl; font-weight: 700; }
  .label .ded-he { font-family: ${FONTS.hebrew}; font-size: 22px; color: ${COLORS.navy}; direction: rtl; line-height: 1.5; max-width: 820px; }`;
  const one = `
    <div class="label">
      ${label.heading_en !== "" ? `<div class="ded-en">${esc(label.heading_en || "This book is dedicated to:")}</div>` : ""}
      <img src="${LOGO.lockup}" alt="${esc(BRAND.publicName)}">
      <div class="shul">${esc(BRAND.nameHe)}</div>
      ${dedication ? `<div class="ded-he">${esc(dedication)}</div>` : ""}
    </div>`;
  return shell({
    w, h, title: `${BRAND.name} — Sefarim Labels`, extraCss, origin: opts.origin,
    body: `<div class="sheet">${one.repeat(per)}</div>`,
  });
}

// ------------------------------------------------------------------
// SCHEDULE — a multi-day Yom Tov timetable. The holiday template carries one
// moment; a three-day festival needs the whole run of services in one sheet,
// which is what actually goes on the door and into the group chat.
//
// Same header, same footer, same palette. Only the middle changes.
// ------------------------------------------------------------------
export function scheduleFlyer(sch = {}, opts = {}) {
  const { w, h } = CANVAS[opts.canvas] || CANVAS.letter;
  const days = Array.isArray(sch.days) ? sch.days : [];
  const extraCss = `
  .day { width: 100%; margin-bottom: 22px; }
  .day-hd {
    font-family: ${FONTS.sans}; font-size: 17px; font-weight: 700; letter-spacing: 3.2px;
    text-transform: uppercase; color: ${COLORS.maroon}; text-align: left;
    padding-bottom: 9px; border-bottom: 2px solid ${COLORS.line}; margin-bottom: 4px;
  }
  .slot { display: flex; align-items: baseline; gap: 20px; padding: 11px 2px; text-align: left; }
  .slot + .slot { border-top: 1px solid ${COLORS.line}; }
  .slot .t { width: 132px; flex: none; font-size: 27px; font-weight: 700; color: ${COLORS.navyDeep}; }
  .slot .e { flex: 1; min-width: 0; }
  .slot .e b { display: block; font-size: 25px; font-weight: 700; color: ${COLORS.navyDeep}; line-height: 1.3; }
  .slot .e span { display: block; font-size: 18px; color: ${COLORS.navy}; margin-top: 3px; line-height: 1.4; }
  .callout {
    width: 100%; background: ${COLORS.cream2}; border: 3px solid ${COLORS.gold};
    border-radius: 16px; padding: 24px 30px; text-align: center;
  }
  .callout .k { font-family: ${FONTS.sans}; font-size: 16px; font-weight: 700; letter-spacing: 3.6px; text-transform: uppercase; color: ${COLORS.gold}; }
  .callout .v { font-family: ${FONTS.display}; font-size: 36px; font-weight: 700; color: ${COLORS.navyDeep}; margin-top: 9px; line-height: 1.2; }
  .callout .s { font-size: 19px; color: ${COLORS.navy}; margin-top: 7px; }
  .note-box { width: 100%; text-align: center; padding-top: 16px; border-top: 2px solid ${COLORS.line}; }
  .note-box b { font-family: ${FONTS.sans}; font-size: 14px; font-weight: 700; letter-spacing: 2.8px; text-transform: uppercase; color: ${COLORS.maroon}; display: block; }
  .note-box i { display: block; font-size: 16px; font-style: italic; color: ${COLORS.navy}; margin-top: 4px; }
  .note-box span { display: block; font-size: 17px; color: ${COLORS.ink}; margin-top: 6px; line-height: 1.45; }`;

  const body = `
  ${header()}
  <div class="body" style="padding-top:30px">
    <div class="content" style="justify-content:flex-start">
      ${sch.occasion ? `<div class="eyebrow">${esc(sch.occasion)}</div>${gap(12)}` : ""}
      <div class="name" style="font-size:76px">${esc(sch.headline || "")}</div>
      ${sch.headline_he ? `<div class="name-he" style="font-size:46px">${esc(sch.headline_he)}</div>` : ""}
      ${gap(14)}
      <div class="role" style="font-size:26px">${esc(sch.dates || "")}${sch.year ? ` &nbsp;·&nbsp; <em>${esc(sch.year)}</em>` : ""}</div>
      ${gap(20)}<div class="divider"></div>${gap(24)}

      <div style="width:100%">
        ${days.map((d) => `
        <div class="day">
          <div class="day-hd">${esc(d.label || "")}</div>
          ${(d.slots || []).map((sl) => `
          <div class="slot">
            <div class="t">${esc(sl.time || "")}</div>
            <div class="e"><b>${esc(sl.event || "")}</b>${sl.note ? `<span>${esc(sl.note)}</span>` : ""}</div>
          </div>`).join("")}
        </div>`).join("")}
      </div>

      ${sch.callout ? `${gap(6)}<div class="callout">
        <div class="k">${esc(sch.callout.kicker || "")}</div>
        <div class="v">${esc(sch.callout.title || "")}</div>
        ${sch.callout.sub ? `<div class="s">${esc(sch.callout.sub)}</div>` : ""}
      </div>` : ""}
    </div>
    <div class="tail">
      ${sch.note ? `${gap(18)}<div class="note-box">
        <b>${esc(sch.note.title || "")}</b>
        ${sch.note.sub ? `<i>${esc(sch.note.sub)}</i>` : ""}
        ${(sch.note.lines || []).map((l) => `<span>${esc(l)}</span>`).join("")}
      </div>` : ""}
      ${gap(22)}
      ${sch.greeting_he ? `<div class="name-he" style="font-size:40px;color:${COLORS.navyDeep}">${esc(sch.greeting_he)}</div>${gap(8)}` : ""}
      ${sch.greeting_en ? `<div class="note" style="font-size:21px">${esc(sch.greeting_en)}</div>${gap(10)}` : ""}
      <div class="eyebrow gold sm">${esc(sch.org || BRAND.publicName)}</div>
      ${gap(24)}
    </div>
  </div>
  ${footer(sch.footer_greeting || " ")}`;
  return shell({ w, h, title: `${BRAND.name} — ${sch.headline || "Schedule"}`, body, extraCss, origin: opts.origin, print: !!opts.print });
}

// ------------------------------------------------------------------
// GUIDE — the reverse side. Halachos and minhagim set as tight bullets in two
// columns, because this is reference text people scan standing up, not prose
// they read through.
//
// Content is passed in verbatim. Nothing here generates, paraphrases or
// completes halachic text: a detail invented on a shul flyer is acted on by
// the community, so a missing section stays missing rather than being filled.
// ------------------------------------------------------------------
export function guideFlyer(g = {}, opts = {}) {
  const { w, h } = CANVAS[opts.canvas] || CANVAS.letter;
  const sections = Array.isArray(g.sections) ? g.sections : [];
  const extraCss = `
  .cols { column-count: 2; column-gap: 44px; column-fill: balance; width: 100%; text-align: left; }
  .sec { break-inside: avoid; margin-bottom: 20px; }
  .sec-hd {
    font-family: ${FONTS.sans}; font-size: 15px; font-weight: 700; letter-spacing: 2.8px;
    text-transform: uppercase; color: ${COLORS.maroon};
    padding-bottom: 6px; border-bottom: 2px solid ${COLORS.line}; margin-bottom: 9px;
  }
  .sec-sub { font-size: 15px; color: ${COLORS.navy}; font-style: italic; margin: -4px 0 9px; }
  .sec ul { list-style: none; margin: 0; padding: 0; }
  .sec li { font-size: 16px; line-height: 1.5; color: ${COLORS.ink}; padding: 0 0 8px 15px; position: relative; }
  .sec li::before { content: "·"; position: absolute; left: 3px; color: ${COLORS.gold}; font-weight: 700; }
  .sec li b { color: ${COLORS.navyDeep}; }
  .sec li i { font-style: italic; }
  /* Table mode. An item given as {cue, text} becomes a row: the cue is a
     navigation label so a reader can find the moment they are in without
     reading every line. The halachic text itself is never abbreviated. */
  .sec table { width: 100%; border-collapse: collapse; }
  .sec td { vertical-align: top; padding: 7px 0; border-top: 1px solid ${COLORS.line}; }
  .sec tr:first-child td { border-top: none; padding-top: 2px; }
  .sec td.cue {
    width: 34%; padding-right: 12px; font-family: ${FONTS.sans}; font-size: 13px;
    font-weight: 700; line-height: 1.35; color: ${COLORS.navyDeep};
  }
  .sec td.txt { font-size: 15px; line-height: 1.45; color: ${COLORS.ink}; }`;

  const body = `
  ${header()}
  <div class="body" style="padding-top:26px">
    <div class="content" style="justify-content:flex-start">
      ${g.occasion ? `<div class="eyebrow">${esc(g.occasion)}</div>${gap(10)}` : ""}
      <div class="name" style="font-size:52px">${esc(g.headline || "")}</div>
      ${g.subhead ? `${gap(10)}<div class="note" style="font-size:19px">${esc(g.subhead)}</div>` : ""}
      ${gap(18)}<div class="divider"></div>${gap(22)}
      <div class="cols">
        ${sections.map((sec) => `
        <div class="sec">
          <div class="sec-hd">${esc(sec.title || "")}</div>
          ${sec.sub ? `<div class="sec-sub">${esc(sec.sub)}</div>` : ""}
          ${(sec.items || []).some((it) => it && typeof it === "object")
            ? `<table>${(sec.items || []).map((it) => {
                const cue = typeof it === "object" ? (it.cue || "") : "";
                const txt = typeof it === "object" ? (it.text || "") : it;
                return `<tr><td class="cue">${esc(cue)}</td><td class="txt">${esc(txt)}</td></tr>`;
              }).join("")}</table>`
            : `<ul>${(sec.items || []).map((it) => `<li>${esc(it)}</li>`).join("")}</ul>`}
        </div>`).join("")}
      </div>
    </div>
    <div class="tail">
      ${gap(14)}
      ${g.source ? `<div class="note" style="font-size:14px;color:${COLORS.muted}">${esc(g.source)}</div>${gap(10)}` : ""}
      <div class="eyebrow gold sm">${esc(g.org || BRAND.publicName)}</div>
      ${gap(20)}
    </div>
  </div>
  ${footer(g.footer_greeting || " ")}`;
  return shell({ w, h, title: `${BRAND.name} — ${g.headline || "Guide"}`, body, extraCss, origin: opts.origin, print: !!opts.print });
}

// ------------------------------------------------------------------
// CARD — a square announcement built to be forwarded.
//
// Different job from every other template here. A flyer is read; this is
// glanced at in a chat list, at thumbnail size, on a phone, and forwarded on
// by people who will not zoom in. So: one message, very large type, generous
// air, and nothing that survives poorly when WhatsApp recompresses it.
//
// The ornament is drawn as inline SVG rather than loaded as artwork so it
// stays crisp at any scale and needs no network fetch at render time.
// ------------------------------------------------------------------

/** Shofar, apple and honey pot.
 *
 *  The shofar is a FILLED, tapering silhouette rather than a stroked path — a
 *  constant-width stroke reads as a hook, not a horn. It narrows at the
 *  mouthpiece and flares to an open bell, which is what makes it legible at
 *  thumbnail size in a chat list. Solid shapes and heavy outlines throughout,
 *  because hairlines disappear under WhatsApp's recompression.
 */
const roshOrnament = (w = 430) => `
<svg viewBox="0 0 570 180" width="${w}" role="img" aria-label="Shofar, apple and honey">
  <g stroke="${COLORS.navyDeep}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <!-- shofar: mouthpiece bottom-left, bell flaring to upper-right -->
    <path fill="${COLORS.gold}" d="
      M18 116
      C 66 132, 176 134, 236 112
      C 292 92, 314 58, 328 24
      L 368 46
      C 350 90, 318 122, 256 144
      C 178 170, 62 154, 14 124
      Z"/>
    <!-- bell opening -->
    <path fill="${COLORS.goldLight}" d="M328 24 L368 46 C 360 60, 350 68, 342 72 C 336 58, 332 40, 328 24 Z"/>
    <!-- one ridge, to read as horn rather than a shape -->
    <path fill="none" stroke-width="4" opacity=".55" d="M74 132 C 140 146, 210 138, 258 118"/>

    <!-- honey pot — clear of the shofar's bell -->
    <path fill="${COLORS.goldLight}" d="M404 118 h56 c4 0 6 3 5 7 l-7 40 c-1 4-4 6-8 6 h-36 c-4 0-7-2-8-6 l-7-40 c-1-4 1-7 5-7z"/>
    <rect fill="${COLORS.gold}" x="400" y="104" width="64" height="16" rx="5"/>

    <!-- apple, sharing the pot's baseline and inside the viewBox -->
    <path fill="${COLORS.maroon}" d="
      M482 116 c0-17 12-29 26-29 6 0 10 3 13 3 s7-3 13-3 c14 0 26 12 26 29
      c0 21-17 40-28 40 -4 0-8-3-11-3 s-7 3-11 3 c-11 0-28-19-28-40z"/>
    <path fill="none" d="M521 87 c0-10 6-17 15-20"/>
  </g>
</svg>`;

export function cardFlyer(c = {}, opts = {}) {
  const { w, h } = CANVAS[opts.canvas] || CANVAS.square;
  const extraCss = `
  .card-wrap {
    width: ${w}px; height: ${h}px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center;
    padding: 62px 68px; position: relative;
  }
  .bh-corner { position: absolute; top: 40px; right: 52px; font-family: ${FONTS.hebrew}; font-size: 30px; color: ${COLORS.navy}; }
  .card-he { font-family: ${FONTS.hebrew}; font-size: 74px; font-weight: 700; color: ${COLORS.navyDeep}; line-height: 1.15; direction: rtl; }
  .card-en { font-family: ${FONTS.sans}; font-size: 27px; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: ${COLORS.gold}; }
  .card-sub { font-size: 34px; font-style: italic; color: ${COLORS.navy}; }
  .card-rule { width: 190px; height: 3px; background: ${COLORS.gold}; }
  .card-label { font-family: ${FONTS.sans}; font-size: 25px; font-weight: 700; letter-spacing: 6px; text-transform: uppercase; color: ${COLORS.maroon}; }
  .card-date { font-size: 36px; font-weight: 700; color: ${COLORS.navy}; line-height: 1.2; }
  .card-time { font-size: 116px; font-weight: 700; color: ${COLORS.navyDeep}; line-height: 1; letter-spacing: -2px; }
  .card-where { font-size: 33px; font-weight: 700; color: ${COLORS.navyDeep}; line-height: 1.3; }
  .card-foot { font-family: ${FONTS.sans}; font-size: 19px; letter-spacing: 3px; text-transform: uppercase; color: ${COLORS.muted}; }`;

  const body = `
  <div class="card-wrap">
    <div class="bh-corner">${esc(BRAND.bh)}</div>
    ${c.greeting_he ? `<div class="card-he">${esc(c.greeting_he)}</div>${gap(16)}` : ""}
    ${c.greeting_en ? `<div class="card-en">${esc(c.greeting_en)}</div>${gap(14)}` : ""}
    ${c.subtitle ? `<div class="card-sub">${esc(c.subtitle)}</div>${gap(30)}` : ""}
    ${roshOrnament(430)}
    ${gap(30)}<div class="card-rule"></div>${gap(30)}
    <div class="card-label">${esc(c.label || "Shofar Blowing")}</div>
    ${c.date ? `${gap(14)}<div class="card-date">${esc(c.date)}</div>` : ""}
    ${gap(14)}
    <div class="card-time">${esc(c.time || "")}</div>
    ${gap(22)}
    <div class="card-where">${esc(c.where || "")}</div>
    ${c.note ? `${gap(16)}<div class="card-foot">${esc(c.note)}</div>` : ""}
  </div>`;
  return shell({ w, h, title: `${BRAND.name} — ${c.label || "Card"}`, body, extraCss, origin: opts.origin, print: !!opts.print });
}

export const TEMPLATES = { speaker: speakerFlyer, holiday: holidayFlyer, weekly: weeklyFlyer, schedule: scheduleFlyer, guide: guideFlyer, card: cardFlyer, label: labelSheet };

/** Single entry point used by the console and the server. */
export function renderFlyer(template, payload, opts = {}) {
  if (!RULES.allowedTemplates.includes(template)) throw new Error(`unknown template: ${template}`);
  if (template === "speaker") return speakerFlyer(payload.event || {}, payload.speaker || {}, opts);
  if (template === "weekly") return weeklyFlyer(payload.week || payload, opts);
  if (template === "schedule") return scheduleFlyer(payload.schedule || payload, opts);
  if (template === "guide") return guideFlyer(payload.guide || payload, opts);
  if (template === "card") return cardFlyer(payload.card || payload, { canvas: "square", ...opts });
  if (template === "label") return labelSheet(payload.label || payload, opts);
  return holidayFlyer(payload.event || payload, opts);
}
