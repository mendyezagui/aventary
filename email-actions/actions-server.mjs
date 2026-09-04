// actions-server.mjs — the confirm-page web service behind vantaca.aventary.com.
// Flow (mirrors the Slack Advance modal, but in a browser):
//   1. Email button -> GET /a?t=<token>  : cheap summary from the token only
//      (NO Claude, so email prefetch/scanners cost nothing and never write).
//   2. "Review the next step" -> POST /a (intent=review) : live look-up via
//      askVantaca (read-only) -> shows Current -> Next + an editable note.
//   3. "Confirm advance" -> POST /a (intent=confirm) : verify + one-time-consume
//      the token, then askVantaca(approved) steps the item and verifies.
// Listens on 127.0.0.1 only; exposed publicly by the Cloudflare tunnel.
import http from "node:http";
import { verify, isConsumed, consume } from "./token.mjs";
import { askVantaca } from "../slack-bot/vantaca-claude.mjs";

const PORT = Number(process.env.EMAIL_ACTIONS_PORT || 8788);
const HOST = process.env.EMAIL_ACTIONS_HOST || "127.0.0.1";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Same final-line contract as the Slack propose step.
function parsePlan(text) {
  const lines = String(text || "").split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l.startsWith("PLAN|")) {
      const p = l.split("|");
      return { current: (p[1] || "").trim(), next: (p[2] || "").trim(), note: (p[3] || "").trim() };
    }
  }
  return null;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => {
      const out = {};
      for (const pair of data.split("&")) {
        if (!pair) continue;
        const i = pair.indexOf("=");
        const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, " "));
        const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, " "));
        out[k] = v;
      }
      resolve(out);
    });
    req.on("error", () => resolve({}));
  });
}

function shell(title, inner, accent = "#2563eb") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<style>
  :root{color-scheme:light dark}
  body{margin:0;background:#f4f1ea;color:#1a1a1a;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  @media (prefers-color-scheme:dark){body{background:#14151a;color:#e7e7e9}.card{background:#1d1f26!important;border-color:#2c2f3a!important}}
  .wrap{max-width:560px;margin:6vh auto;padding:0 18px}
  .card{background:#fff;border:1px solid #e6e2d8;border-radius:14px;padding:22px 22px 24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
  h1{font-size:19px;margin:0 0 4px}
  .muted{color:#6b7280;font-size:14px}
  .kv{display:flex;gap:14px;margin:16px 0;flex-wrap:wrap}
  .kv>div{flex:1;min-width:140px}
  .kv .lbl{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
  .kv .val{font-weight:600;font-size:16px}
  .arrow{color:${accent}}
  textarea{width:100%;box-sizing:border-box;min-height:80px;margin-top:6px;padding:10px;border:1px solid #cbd5e1;border-radius:10px;font:inherit;background:transparent;color:inherit}
  button{appearance:none;border:0;border-radius:10px;padding:12px 18px;font:600 15px/1 inherit;cursor:pointer;color:#fff;background:${accent}}
  button.secondary{background:transparent;color:${accent};border:1px solid ${accent}}
  .row{display:flex;gap:10px;align-items:center;margin-top:18px;flex-wrap:wrap}
  code{background:rgba(127,127,127,.15);padding:1px 6px;border-radius:6px}
  .ok{color:#16a34a}.warn{color:#b45309}
</style></head><body><div class="wrap"><div class="card">${inner}</div>
<p class="muted" style="text-align:center;margin-top:14px">Vantaca action link · secure &amp; single-use</p></div></body></html>`;
}

function summaryPage(v, token) {
  return shell("Review work item", `
    <h1>${esc(v.kind || "Work item")} — <code>XN ${esc(v.xn)}</code></h1>
    <div class="muted">${esc(v.assoc || "")}</div>
    <p style="margin:14px 0 0">${esc(v.subject || "(no subject)")}</p>
    <form method="POST" action="/a" class="row">
      <input type="hidden" name="t" value="${esc(token)}">
      <input type="hidden" name="intent" value="review">
      <button type="submit">Review the next step →</button>
    </form>
    <p class="muted" style="margin-top:14px">Nothing changes yet — the next step is looked up live when you continue.</p>`);
}

function planPage(v, plan, token) {
  return shell("Confirm advance", `
    <h1>Advance <code>XN ${esc(v.xn)}</code></h1>
    <div class="muted">${esc(v.assoc || "")} · ${esc(v.subject || "")}</div>
    <div class="kv">
      <div><div class="lbl">Current step</div><div class="val">${esc(plan.current || "—")}</div></div>
      <div><div class="lbl">Moving to</div><div class="val arrow">${esc(plan.next)} →</div></div>
    </div>
    <form method="POST" action="/a">
      <input type="hidden" name="t" value="${esc(token)}">
      <input type="hidden" name="intent" value="confirm">
      <label class="lbl">Your note <span class="muted">(edit or leave as-is)</span></label>
      <textarea name="note">${esc(plan.note && plan.note !== "(none)" ? plan.note : "")}</textarea>
      <div class="row">
        <button type="submit">✅ Confirm advance</button>
      </div>
    </form>`, "#16a34a");
}

function messagePage(title, html, cls = "") {
  return shell(title, `<h1 class="${cls}">${esc(title)}</h1><div style="margin-top:10px">${html}</div>`, cls === "warn" ? "#b45309" : "#2563eb");
}

const PROPOSE = (v) =>
  `For action item XN ${v.xn} in association ${v.assoc} (${v.kind}: "${v.subject}"), look it up with the read tools and determine the single best next workflow step to move it forward. Do NOT make any change. ` +
  `Write one short sentence of context, then end your message with EXACTLY one final line in this format and nothing after it:\n` +
  `PLAN|<current step name>|<recommended next step name>|<one-line note to add>\n` +
  `If you cannot identify the item or a unique next step, end with: PLAN|ERROR|<short reason>|`;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const send = (code, html, type = "text/html; charset=utf-8") => { res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }); res.end(html); };

    if (req.method === "GET" && url.pathname === "/health") return send(200, "ok", "text/plain");

    if (url.pathname !== "/a") return send(404, messagePage("Not found", "<p>Nothing here.</p>", "warn"));

    // GET /a -> cheap summary from the token only (no Claude; safe for prefetch)
    if (req.method === "GET") {
      const v = verify(url.searchParams.get("t"));
      if (!v.ok) return send(400, messagePage("Link problem", `<p class="warn">${esc(v.error)}.</p><p class="muted">Ask for a fresh email.</p>`, "warn"));
      return send(200, summaryPage(v.payload, url.searchParams.get("t")));
    }

    if (req.method === "POST") {
      const form = await readBody(req);
      const v = verify(form.t);
      if (!v.ok) return send(400, messagePage("Link problem", `<p class="warn">${esc(v.error)}.</p>`, "warn"));
      const p = v.payload;

      // Step 2: live look-up (read only) -> show the plan.
      if (form.intent === "review") {
        let reply = "";
        try { reply = await askVantaca(PROPOSE(p), { audit: { source: "email-propose", user: p.to, channel: "email" } }); }
        catch (err) { return send(502, messagePage("Lookup failed", `<p class="warn">${esc(String((err && err.message) || err).slice(0, 200))}</p>`, "warn")); }
        const plan = parsePlan(reply);
        if (!plan || !plan.next || /^error$/i.test(plan.current) || /^error$/i.test(plan.next)) {
          const why = plan ? (plan.next || plan.note || plan.current) : "couldn't determine a next step";
          return send(200, messagePage("Can't auto-advance", `<p class="warn">${esc(String(why).slice(0, 240))}</p><p class="muted">Open <code>XN ${esc(p.xn)}</code> in Vantaca to handle it manually.</p>`, "warn"));
        }
        return send(200, planPage(p, plan, form.t));
      }

      // Step 3: the write. One-time; this POST is the approval.
      if (form.intent === "confirm") {
        if (isConsumed(p.jti)) return send(200, messagePage("Already actioned", "<p>This link was already used. Each action link works once.</p>"));
        consume(p.jti);
        const note = (form.note || "").trim() || `Actioned from the email briefing by ${p.to || "a manager"}.`;
        const instruction =
          `Advance action item XN ${p.xn} in association ${p.assoc} (${p.kind}) to its recommended next workflow step and add this note: "${note}". ` +
          `Look it up to find the current step and the single best next step's ID, make that one change, then re-read to verify and report the before/after step and the note.`;
        try {
          const reply = await askVantaca(instruction, { approved: true, audit: { source: "email-button", user: p.to, channel: "email" } });
          return send(200, messagePage("✅ Advanced", `<p class="ok">Done.</p><div class="muted" style="margin-top:8px;white-space:pre-wrap">${esc(String(reply).slice(0, 1200))}</div>`, "ok"));
        } catch (err) {
          return send(502, messagePage("That step failed", `<p class="warn">${esc(String((err && err.message) || err).slice(0, 240))}</p>`, "warn"));
        }
      }

      return send(400, messagePage("Bad request", "<p>Unknown action.</p>", "warn"));
    }

    return send(405, messagePage("Method not allowed", "", "warn"));
  } catch (e) {
    try { res.writeHead(500, { "Content-Type": "text/plain" }); res.end("error"); } catch (_) {}
    console.error("actions-server error:", (e && e.message) || e);
  }
});

server.listen(PORT, HOST, () => console.log(`vantaca-actions listening on ${HOST}:${PORT}`));
