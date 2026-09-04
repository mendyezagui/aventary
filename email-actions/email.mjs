// email.mjs — builds a per-manager HTML briefing email whose each item has a
// signed "Review & advance" button linking to the confirm page (actions-server).
// Phase-2 sender (Gmail API) will import buildManagerEmail() and send it.
import { sign } from "./token.mjs";
import { recommendedAction } from "../slack-bot/digest.mjs";

const BASE = (process.env.PUBLIC_URL || "https://vantaca.aventary.com").replace(/\/$/, "");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function actionUrl(item, to) {
  const token = sign({
    t: "step",
    xn: item.xnNumber,
    assoc: item.assocCode,
    kind: item.kind,
    subject: (item.subject || "").slice(0, 110),
    to,
  });
  return `${BASE}/a?t=${encodeURIComponent(token)}`;
}

function dot(item) {
  const r = (item.reasons || []).join(" ").toLowerCase();
  if (r.includes("overdue") || r.includes("water") || r.includes("safety")) return "🔴";
  if (r.includes("urgent") || r.includes("fine") || r.includes("due in")) return "🟠";
  return "🟡";
}

// mrkdwn-ish *bold* -> <strong> for the recommendation line
const bold = (s) => esc(s).replace(/\*([^*]+)\*/g, "<strong>$1</strong>");

function itemRow(item, to) {
  const reasons = (item.reasons || []).slice(0, 4).join(" · ");
  const stale = item.daysAtStep != null ? `${item.daysAtStep}d at ${item.step || "current step"}` : (item.step || "");
  return `
  <tr><td style="padding:14px 16px;border:1px solid #e6e2d8;border-radius:12px;background:#fff">
    <div style="font-size:15px">${dot(item)} <strong>XN ${esc(item.xnNumber)}</strong> — <strong>${esc(item.assocName || item.assocCode)}</strong> · ${esc(item.kind)}</div>
    <div style="margin:4px 0 2px">${esc(item.subject || "(no subject)")}</div>
    <div style="color:#6b7280;font-size:13px">${esc([reasons, stale].filter(Boolean).join("  ·  "))}</div>
    <div style="margin-top:8px;font-size:14px">🎯 <strong>Recommended:</strong> ${bold(recommendedAction(item))}</div>
    <div style="margin-top:12px">
      <a href="${actionUrl(item, to)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:9px;font-weight:600;font-size:14px">Review &amp; advance →</a>
    </div>
  </td></tr>
  <tr><td style="height:10px"></td></tr>`;
}

export function buildManagerEmail({ manager, items, to, dateLabel }) {
  const today = dateLabel || new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Los_Angeles" });
  const rows = (items || []).map((it) => itemRow(it, to)).join("");
  const body = (items || []).length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate">${rows}</table>`
    : `<p style="color:#16a34a">Nothing flagged — your queue is clear ✅</p>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f1ea;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <h1 style="font-size:20px;margin:0 0 2px">🌅 Vantaca Morning Briefing</h1>
    <div style="color:#6b7280;font-size:14px;margin-bottom:18px">${esc(today)} · ${esc(manager)} · tap <strong>Review &amp; advance</strong> to step an item (you confirm first)</div>
    ${body}
    <p style="color:#9ca3af;font-size:12px;margin-top:22px">Ranked: water intrusion › urgent/safety › fine-accruing › overdue › parked › aging. Live from Vantaca. Action links are secure and single-use.</p>
  </div>
</body></html>`;
  const subject = `Vantaca briefing — ${manager} — ${today}${(items || []).length ? ` (${items.length} to review)` : ""}`;
  return { subject, html };
}
