"use client";

import { useEffect } from "react";

/**
 * Client-side behavior for the rich /diagnostics page (pages.body_html).
 * React strips <script> from dangerouslySetInnerHTML, so all of the authored
 * page's JS lives here:
 *   - staggered scroll-in reveals
 *   - the hero Pipeline Integrity gauge animation
 *   - the email gate -> /api/contact (source='diagnostics')
 *   - the in-browser Pipeline X-Ray: after the gate succeeds we reveal an
 *     upload zone; the prospect drops their CSV and it is scored entirely in
 *     their browser. The file is never uploaded or stored — that's what lets
 *     the page honestly promise "nothing stored," and it means zero work and
 *     zero data-handling liability for Aventary.
 */

type Leak = { n: number; amt: number };
type Result = {
  N: number; rep: number; defensible: number; flaggedAmt: number; flaggedCnt: number;
  score: number; band: string; missingCols: string[]; leaks: Record<string, Leak>;
  error?: string;
};

// ---- CSV parser (RFC-4180-ish: handles quoted fields, commas, CRLF) ----
function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES: Record<string, string[]> = {
  name: ["opportunityname", "dealname", "name", "opportunity", "opp"],
  account: ["account", "accountname", "company", "companyname"],
  owner: ["owner", "opportunityowner", "dealowner", "ownername", "assignedto"],
  stage: ["stage", "stagename", "dealstage", "opportunitystage"],
  amount: ["amount", "amount$", "amountusd", "dealvalue", "value", "totalamount", "acv", "arr"],
  close: ["closedate", "expectedclosedate", "closingdate", "close"],
  created: ["createddate", "createdate", "created", "datecreated"],
  activity: ["lastactivitydate", "lastactivity", "lastactivitytime", "lastmodified", "lastactivityon"]
};
function mapColumns(header: string[]): Record<string, number> {
  const idx: Record<string, number> = {}; const H = header.map(norm);
  for (const key in ALIASES) {
    for (const a of ALIASES[key]) { const j = H.indexOf(a); if (j !== -1) { idx[key] = j; break; } }
  }
  return idx;
}
const parseDate = (s: string) => { if (!s) return null; const d = new Date(s.trim()); return isNaN(+d) ? null : d; };
const parseAmt = (s: string) => { if (s == null) return null; const n = parseFloat(String(s).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? null : n; };

function scoreCSV(text: string, refDate?: Date): Result {
  const TODAY = refDate || new Date();
  const rows = parseCSV(text);
  if (rows.length < 2) return { error: "That file has no data rows.", N: 0, rep: 0, defensible: 0, flaggedAmt: 0, flaggedCnt: 0, score: 0, band: "", missingCols: [], leaks: {} };
  const col = mapColumns(rows[0]);
  const missingCols: string[] = [];
  if (col.stage == null) missingCols.push("Stage");
  if (col.amount == null) missingCols.push("Amount");
  if (col.close == null) missingCols.push("Close date");
  if (col.activity == null) missingCols.push("Last activity date");

  const data = rows.slice(1).map((r) => ({
    account: col.account != null ? r[col.account] : "",
    stage: col.stage != null ? (r[col.stage] || "") : "",
    amount: col.amount != null ? parseAmt(r[col.amount]) : null,
    close: col.close != null ? parseDate(r[col.close]) : null,
    activity: col.activity != null ? parseDate(r[col.activity]) : null
  }));

  const open = data.filter((d) => !/closed/i.test(d.stage));
  const rep = open.reduce((s, d) => s + (d.amount || 0), 0);
  const N = open.length;
  if (N === 0) return { error: "No open deals found — every row reads as Closed.", N: 0, rep: 0, defensible: 0, flaggedAmt: 0, flaggedCnt: 0, score: 0, band: "", missingCols, leaks: {} };

  const DAY = 86400000;
  const flag = open.map((d) => {
    const idle = d.activity ? Math.floor((+TODAY - +d.activity) / DAY) : null;
    const cd = d.close;
    return {
      overdue: cd ? cd < TODAY : false,
      stalled: idle != null ? idle > 30 : false,
      zombie: idle != null ? idle > 60 : false,
      noAmount: d.amount == null || d.amount === 0,
      noClose: d.close == null,
      noActivity: d.activity == null,
      qtrEnd: cd ? ([2, 5, 8, 11].includes(cd.getMonth()) && cd.getDate() >= 21) : false,
      duplicate: false,
      d
    };
  });
  const seen: Record<string, number> = {};
  open.forEach((d) => { const k = (d.account || "") + "|" + (d.amount || ""); seen[k] = (seen[k] || 0) + 1; });
  flag.forEach((f) => { const k = (f.d.account || "") + "|" + (f.d.amount || ""); f.duplicate = seen[k] > 1; });

  const sumW = (fn: (f: typeof flag[number]) => boolean) => flag.filter(fn).reduce((s, f) => s + (f.d.amount || 0), 0);
  const cntW = (fn: (f: typeof flag[number]) => boolean) => flag.filter(fn).length;
  const leaks: Record<string, Leak> = {
    overdue: { n: cntW((f) => f.overdue), amt: sumW((f) => f.overdue) },
    stalled: { n: cntW((f) => f.stalled), amt: sumW((f) => f.stalled) },
    zombie: { n: cntW((f) => f.zombie), amt: sumW((f) => f.zombie) },
    noAmount: { n: cntW((f) => f.noAmount), amt: sumW((f) => f.noAmount) },
    noClose: { n: cntW((f) => f.noClose), amt: sumW((f) => f.noClose) },
    noActivity: { n: cntW((f) => f.noActivity), amt: sumW((f) => f.noActivity) },
    qtrEnd: { n: cntW((f) => f.qtrEnd), amt: sumW((f) => f.qtrEnd) },
    duplicate: { n: cntW((f) => f.duplicate), amt: sumW((f) => f.duplicate) }
  };
  const anyFlag = (f: typeof flag[number]) => f.overdue || f.stalled || f.noAmount || f.noClose || f.noActivity || f.qtrEnd || f.duplicate;
  const flaggedAmt = sumW(anyFlag);
  const flaggedCnt = cntW(anyFlag);

  const W: Record<string, number> = { overdue: 1.0, stalled: 0.7, noAmount: 0.6, noClose: 0.6, noActivity: 0.4, qtrEnd: 0.5, duplicate: 0.8 };
  let penalty = 0;
  for (const k in W) penalty += W[k] * (leaks[k].amt / rep) * 100;
  const score = Math.max(0, Math.round(100 - penalty));
  const band = score >= 80 ? "Tight" : score >= 60 ? "Leaking" : score >= 40 ? "Unreliable" : "Fiction";

  return { N, rep, defensible: rep - flaggedAmt, flaggedAmt, flaggedCnt, score, band, missingCols, leaks };
}

const usd = (n: number) => "$" + Math.round(n).toLocaleString();
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0) + "%";

function renderResults(r: Result): string {
  if (r.error) return `<div class="rd-note">${r.error} Make sure it's a CSV export of your open opportunities with a Stage and Amount column.</div>`;
  const L = r.leaks;
  const rowsDef: [string, Leak][] = [
    ["Overdue (close date already passed)", L.overdue],
    ["Stalled (30+ days no activity)", L.stalled],
    ["— of those, zombie (60+ days)", L.zombie],
    ["Missing / zero amount", L.noAmount],
    ["Missing close date", L.noClose],
    ["Missing last activity", L.noActivity],
    ["Quarter-end clustered close dates", L.qtrEnd],
    ["Possible duplicates (same account + amount)", L.duplicate]
  ];
  const body = rowsDef
    .filter(([, v]) => v.n > 0)
    .map(([label, v]) => `<tr><td>${label}</td><td class="r">${v.n}</td><td class="r">${usd(v.amt)}</td><td class="r">${pct(v.amt, r.rep)}</td></tr>`)
    .join("");
  const note = r.missingCols.length
    ? `<div class="rd-note"><b>First finding:</b> your export is missing ${r.missingCols.join(", ")}. The diagnostics that depend on ${r.missingCols.length > 1 ? "those columns" : "that column"} couldn't run — not being able to measure your own pipeline is itself a leak. Re-export with every column to see the full picture.</div>`
    : "";
  return `
    <div class="rd-scorewrap">
      <div>
        <div class="rd-score">${r.score}<small>/100</small></div>
        <div class="rd-band">${r.band}</div>
      </div>
      <div>
        <div class="rd-headline">Only <b>${pct(r.defensible, r.rep)}</b> of your reported pipeline is defensible.</div>
        <div class="rd-sub2">${usd(r.rep)} reported across ${r.N} open deals · ${usd(r.defensible)} carries no integrity flag · ${r.flaggedCnt} of ${r.N} deals (${usd(r.flaggedAmt)}) show at least one.</div>
      </div>
    </div>
    ${body ? `<table class="rd-table"><thead><tr><th>Leak</th><th class="r">Deals</th><th class="r">Exposure</th><th class="r">% of pipeline</th></tr></thead><tbody>${body}</tbody></table>` : `<div class="rd-note">No integrity flags found — that's rare and genuinely good. Your reported pipeline is your defensible pipeline.</div>`}
    ${note}
    <div class="rd-caveat">This scores pipeline <i>hygiene</i>, not win-probability. A stalled deal can still close; a clean deal can still lose. The score tells you how much of your reported number you can defend — not how much you'll book. Nothing here was uploaded or stored; it ran in your browser.</div>
    <button type="button" class="rd-again" id="rd-again">Run another file →</button>
  `;
}

export function RichDiagnostics() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".rich-diag");
    if (!root) return;

    // --- staggered scroll reveals ---
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            setTimeout(() => el.classList.add("in"), (i % 6) * 70);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );
    root.querySelectorAll<HTMLElement>(".rev").forEach((el) => io.observe(el));

    // --- hero gauge: count 100 -> 58 ---
    const target = 58;
    const num = root.querySelector<HTMLElement>("#gnum");
    const bar = root.querySelector<HTMLElement>("#gbar");
    const band = root.querySelector<HTMLElement>("#band");
    let gaugeTimer: ReturnType<typeof setInterval> | null = null;
    if (num && bar && band) {
      let v = 100;
      gaugeTimer = setInterval(() => {
        v -= 2;
        if (v <= target) { v = target; if (gaugeTimer) clearInterval(gaugeTimer); }
        num.textContent = String(v);
      }, 28);
      setTimeout(() => { bar.style.width = target + "%"; }, 350);
      band.textContent = target >= 80 ? "Tight" : target >= 60 ? "Leaking" : target >= 40 ? "Unreliable" : "Fiction";
    }

    // --- X-Ray upload + scoring (revealed after gate) ---
    const xray = root.querySelector<HTMLElement>("#rd-xray");
    const drop = root.querySelector<HTMLElement>("#rd-drop");
    const fileInput = root.querySelector<HTMLInputElement>("#rd-file");
    const results = root.querySelector<HTMLElement>("#rd-results");
    const xstatus = root.querySelector<HTMLElement>("#rd-xray-status");

    const showXStatus = (msg: string, ok: boolean) => {
      if (!xstatus) return;
      xstatus.style.display = "block";
      xstatus.style.color = ok ? "var(--good)" : "var(--signal)";
      xstatus.textContent = msg;
    };

    const runFile = (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
        showXStatus("That doesn't look like a CSV. Export your pipeline as .csv and try again.", false);
        return;
      }
      showXStatus("Scoring in your browser…", true);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const r = scoreCSV(String(reader.result));
          if (results) {
            results.innerHTML = renderResults(r);
            results.style.display = "block";
            results.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          if (xstatus) xstatus.style.display = "none";
          const again = root.querySelector<HTMLButtonElement>("#rd-again");
          again?.addEventListener("click", () => {
            if (results) { results.style.display = "none"; results.innerHTML = ""; }
            if (fileInput) fileInput.value = "";
            drop?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        } catch {
          showXStatus("Couldn't parse that file. Make sure it's a standard CSV export.", false);
        }
      };
      reader.onerror = () => showXStatus("Couldn't read that file. Try again.", false);
      reader.readAsText(file);
    };

    const onFileChange = () => { const f = fileInput?.files?.[0]; if (f) runFile(f); };
    const onDragOver = (e: DragEvent) => { e.preventDefault(); drop?.classList.add("drag"); };
    const onDragLeave = () => drop?.classList.remove("drag");
    const onDrop = (e: DragEvent) => {
      e.preventDefault(); drop?.classList.remove("drag");
      const f = e.dataTransfer?.files?.[0]; if (f) runFile(f);
    };
    fileInput?.addEventListener("change", onFileChange);
    drop?.addEventListener("dragover", onDragOver);
    drop?.addEventListener("dragleave", onDragLeave);
    drop?.addEventListener("drop", onDrop);

    // --- email gate -> /api/contact, then reveal the X-Ray ---
    const nameInput = root.querySelector<HTMLInputElement>("#rd-name");
    const emailInput = root.querySelector<HTMLInputElement>("#rd-email");
    const btn = root.querySelector<HTMLButtonElement>("#rd-btn");
    const status = root.querySelector<HTMLElement>("#rd-status");

    const setStatus = (msg: string, ok: boolean) => {
      if (!status) return;
      status.style.display = "block";
      status.style.color = ok ? "var(--good)" : "var(--signal)";
      status.textContent = msg;
    };

    const submit = async () => {
      const name = nameInput?.value.trim() ?? "";
      const email = emailInput?.value.trim() ?? "";
      if (!name) { setStatus("Add your first name so the kit email isn't rude.", false); nameInput?.focus(); return; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus("That email doesn't look right.", false); emailInput?.focus(); return; }
      if (!btn) return;
      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, message: "Requested the Revenue Leak Detection Kit", source: "diagnostics" })
        });
        if (!res.ok) throw new Error(String(res.status));
        btn.textContent = "Sent ✓";
        setStatus("You're in — the kit's on its way. Run your X-Ray right now below.", true);
        if (xray) {
          xray.style.display = "block";
          xray.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } catch {
        btn.disabled = false;
        btn.textContent = "Send the kit →";
        setStatus("Something broke on our end. Try again or email us directly.", false);
      }
    };

    const onClick = () => void submit();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") void submit(); };
    btn?.addEventListener("click", onClick);
    emailInput?.addEventListener("keydown", onKey);
    nameInput?.addEventListener("keydown", onKey);

    return () => {
      io.disconnect();
      if (gaugeTimer) clearInterval(gaugeTimer);
      btn?.removeEventListener("click", onClick);
      emailInput?.removeEventListener("keydown", onKey);
      nameInput?.removeEventListener("keydown", onKey);
      fileInput?.removeEventListener("change", onFileChange);
      drop?.removeEventListener("dragover", onDragOver);
      drop?.removeEventListener("dragleave", onDragLeave);
      drop?.removeEventListener("drop", onDrop);
    };
  }, []);

  return null;
}
