#!/usr/bin/env python3
"""
Pipeline X-Ray — scores the structural integrity of an open sales pipeline.

Reads a CSV export of opportunities and reports how much of the reported
pipeline is *defensible* vs. carrying integrity flags (overdue, stalled,
missing data, quarter-end clustering, duplicates), plus a 0-100 Pipeline
Integrity Score.

PRIVACY: this script reads a local file and makes ZERO network calls. Your
data never leaves your machine. Read the code — there's no `requests`, no
`urllib`, no sockets. That's the point.

Usage:
    python3 pipeline_xray.py path/to/pipeline.csv
    python3 pipeline_xray.py path/to/pipeline.csv --asof 2026-06-07

Dependencies: Python 3.8+ standard library only.
"""
import csv
import sys
import argparse
from datetime import datetime, date

# --- column aliases: maps however your CRM names things to a canonical key ---
ALIASES = {
    "name":     ["opportunity name", "deal name", "name", "opportunity", "opp"],
    "account":  ["account", "account name", "company", "company name"],
    "owner":    ["owner", "opportunity owner", "deal owner", "assigned to"],
    "stage":    ["stage", "stage name", "deal stage", "opportunity stage"],
    "amount":   ["amount", "amount ($)", "amount usd", "deal value", "value", "acv", "arr"],
    "close":    ["close date", "expected close date", "closing date", "close"],
    "created":  ["created date", "create date", "created", "date created"],
    "activity": ["last activity date", "last activity", "last modified", "last activity on"],
}

# integrity-flag weights for the score (dollar-share weighted)
WEIGHTS = {"overdue": 1.0, "stalled": 0.7, "no_amount": 0.6,
           "no_close": 0.6, "no_activity": 0.4, "qtr_end": 0.5, "duplicate": 0.8}


def _norm(s):
    return "".join(ch for ch in (s or "").lower() if ch.isalnum())


def map_columns(header):
    idx = {}
    norm_header = [_norm(h) for h in header]
    for key, names in ALIASES.items():
        for cand in names:
            n = _norm(cand)
            if n in norm_header:
                idx[key] = norm_header.index(n)
                break
    return idx


def _parse_date(s):
    s = (s or "").strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _parse_amount(s):
    if s is None:
        return None
    cleaned = "".join(ch for ch in str(s) if ch.isdigit() or ch in ".-")
    try:
        return float(cleaned) if cleaned not in ("", "-", ".") else None
    except ValueError:
        return None


def score(path, asof=None):
    asof = asof or date.today()
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    if len(rows) < 2:
        return {"error": "No data rows found."}
    col = map_columns(rows[0])

    missing_cols = [label for key, label in
                    [("stage", "Stage"), ("amount", "Amount"),
                     ("close", "Close date"), ("activity", "Last activity date")]
                    if key not in col]

    def cell(r, key):
        return r[col[key]] if key in col and col[key] < len(r) else None

    deals = []
    for r in rows[1:]:
        if not any((c or "").strip() for c in r):
            continue
        deals.append({
            "account": cell(r, "account") or "",
            "stage": (cell(r, "stage") or ""),
            "amount": _parse_amount(cell(r, "amount")),
            "close": _parse_date(cell(r, "close")),
            "activity": _parse_date(cell(r, "activity")),
        })

    openn = [d for d in deals if "closed" not in d["stage"].lower()]
    reported = sum(d["amount"] or 0 for d in openn)
    n = len(openn)
    if n == 0:
        return {"error": "No open deals found (every row is Closed).", "missing_cols": missing_cols}

    # duplicate detection: same account + same amount among open deals
    seen = {}
    for d in openn:
        k = (d["account"], d["amount"])
        seen[k] = seen.get(k, 0) + 1

    flags = []
    for d in openn:
        idle = (asof - d["activity"]).days if d["activity"] else None
        cd = d["close"]
        flags.append({
            "overdue": (cd < asof) if cd else False,
            "stalled": (idle > 30) if idle is not None else False,
            "zombie": (idle > 60) if idle is not None else False,
            "no_amount": d["amount"] in (None, 0),
            "no_close": d["close"] is None,
            "no_activity": d["activity"] is None,
            "qtr_end": (cd.month in (3, 6, 9, 12) and cd.day >= 21) if cd else False,
            "duplicate": seen[(d["account"], d["amount"])] > 1,
            "amount": d["amount"] or 0,
        })

    def amt_where(pred):
        return sum(f["amount"] for f in flags if pred(f))

    def cnt_where(pred):
        return sum(1 for f in flags if pred(f))

    leaks = {k: {"n": cnt_where(lambda f, k=k: f[k]), "amt": amt_where(lambda f, k=k: f[k])}
             for k in ["overdue", "stalled", "zombie", "no_amount", "no_close",
                       "no_activity", "qtr_end", "duplicate"]}

    def any_flag(f):
        return any(f[k] for k in ["overdue", "stalled", "no_amount", "no_close",
                                  "no_activity", "qtr_end", "duplicate"])

    flagged_amt = amt_where(any_flag)
    flagged_cnt = cnt_where(any_flag)
    defensible = reported - flagged_amt

    penalty = sum(WEIGHTS[k] * (leaks[k]["amt"] / reported) * 100 for k in WEIGHTS)
    integrity = max(0, round(100 - penalty))
    band = ("Tight" if integrity >= 80 else "Leaking" if integrity >= 60
            else "Unreliable" if integrity >= 40 else "Fiction")

    return {"n": n, "reported": reported, "defensible": defensible,
            "flagged_amt": flagged_amt, "flagged_cnt": flagged_cnt,
            "score": integrity, "band": band, "leaks": leaks,
            "missing_cols": missing_cols, "asof": asof.isoformat()}


def _usd(x):
    return "${:,.0f}".format(round(x))


def _pct(n, d):
    return "{:.0f}%".format(100 * n / d) if d else "0%"


def render(r):
    if "error" in r and "n" not in r:
        return "Pipeline X-Ray: " + r["error"]
    L = r["leaks"]
    lines = []
    lines.append("=" * 56)
    lines.append("  PIPELINE X-RAY")
    lines.append("=" * 56)
    lines.append("")
    lines.append("  Pipeline Integrity Score:  {}/100  ({})".format(r["score"], r["band"]))
    lines.append("")
    lines.append("  Reported open pipeline:    {}  ({} deals)".format(_usd(r["reported"]), r["n"]))
    lines.append("  Defensible (no flags):     {}  ({})".format(
        _usd(r["defensible"]), _pct(r["defensible"], r["reported"])))
    lines.append("  Carrying integrity flags:  {}  ({} of {} deals)".format(
        _usd(r["flagged_amt"]), r["flagged_cnt"], r["n"]))
    lines.append("")
    lines.append("  LEAK BREAKDOWN")
    rowdefs = [
        ("Overdue (close date passed)", "overdue"),
        ("Stalled (30+ days no activity)", "stalled"),
        ("  of those, zombie (60+ days)", "zombie"),
        ("Missing / zero amount", "no_amount"),
        ("Missing close date", "no_close"),
        ("Missing last activity", "no_activity"),
        ("Quarter-end clustered", "qtr_end"),
        ("Possible duplicates", "duplicate"),
    ]
    for label, key in rowdefs:
        v = L[key]
        if v["n"] > 0:
            lines.append("    {:<34} {:>3} deals  {:>12}  {}".format(
                label, v["n"], _usd(v["amt"]), _pct(v["amt"], r["reported"])))
    if r["missing_cols"]:
        lines.append("")
        lines.append("  FIRST FINDING: your export is missing " + ", ".join(r["missing_cols"]) + ".")
        lines.append("  The checks that need those columns couldn't run. Not being")
        lines.append("  able to measure your own pipeline is itself a leak.")
    lines.append("")
    lines.append("  Note: this scores pipeline HYGIENE, not win-probability. A stalled")
    lines.append("  deal can still close; a clean deal can still lose. The score tells")
    lines.append("  you how much of your reported number you can defend.")
    lines.append("")
    lines.append("  Ran locally. Nothing was uploaded or stored.  --  aventary.com")
    lines.append("=" * 56)
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="Pipeline X-Ray — score open-pipeline integrity locally.")
    ap.add_argument("csv", help="Path to your open-pipeline CSV export.")
    ap.add_argument("--asof", help="Reference date YYYY-MM-DD (default: today).")
    args = ap.parse_args()
    asof = _parse_date(args.asof) if args.asof else None
    print(render(score(args.csv, asof)))


if __name__ == "__main__":
    main()
