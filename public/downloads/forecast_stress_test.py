#!/usr/bin/env python3
"""
Forecast Stress Test — same open-pipeline CSV, different question:
how much of your reported pipeline can you actually expect to book?

Stage-weights every open deal by win-probability, then haircuts overdue and
stalled deals, and reports your reported number vs. a stress-tested forecast,
the overstatement gap, and a confidence level.

PRIVACY: reads a local file, ZERO network calls. Your data never leaves your
machine. Read the code.

Usage:
    python3 forecast_stress_test.py path/to/pipeline.csv
    python3 forecast_stress_test.py path/to/pipeline.csv --asof 2026-06-07

STAGE PROBABILITIES are defaults below. They should reflect how YOUR pipeline
actually converts — edit STAGE_PROB to match your historical win rates by stage.

Dependencies: Python 3.8+ standard library only.
"""
import csv
import sys
import argparse
from datetime import datetime, date

ALIASES = {
    "stage":    ["stage", "stage name", "deal stage", "opportunity stage"],
    "amount":   ["amount", "amount ($)", "amount usd", "deal value", "value", "acv", "arr"],
    "close":    ["close date", "expected close date", "closing date", "close"],
    "activity": ["last activity date", "last activity", "last modified", "last activity on"],
}

# EDIT THESE to match your historical conversion by stage.
# Keys are matched as substrings against the stage name (case-insensitive).
STAGE_PROB = [
    ("prospect", 0.10),
    ("qualif",   0.20),
    ("discov",   0.30),
    ("needs",    0.35),
    ("proposal", 0.55),
    ("negoti",   0.75),
    ("commit",   0.90),
    ("verbal",   0.90),
]
DEFAULT_PROB = 0.25  # unknown open stage


def _norm(s):
    return "".join(ch for ch in (s or "").lower() if ch.isalnum())


def map_columns(header):
    idx = {}
    nh = [_norm(h) for h in header]
    for key, names in ALIASES.items():
        for cand in names:
            n = _norm(cand)
            if n in nh:
                idx[key] = nh.index(n)
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
    c = "".join(ch for ch in str(s) if ch.isdigit() or ch in ".-")
    try:
        return float(c) if c not in ("", "-", ".") else None
    except ValueError:
        return None


def stage_prob(stage):
    s = (stage or "").lower()
    for key, p in STAGE_PROB:
        if key in s:
            return p
    return DEFAULT_PROB


def forecast(path, asof=None):
    asof = asof or date.today()
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    if len(rows) < 2:
        return {"error": "No data rows found."}
    col = map_columns(rows[0])

    def cell(r, key):
        return r[col[key]] if key in col and col[key] < len(r) else None

    deals = []
    for r in rows[1:]:
        if not any((c or "").strip() for c in r):
            continue
        deals.append({
            "stage": cell(r, "stage") or "",
            "amount": _parse_amount(cell(r, "amount")),
            "close": _parse_date(cell(r, "close")),
            "activity": _parse_date(cell(r, "activity")),
        })

    openn = [d for d in deals if "closed" not in d["stage"].lower()]
    reported = sum(d["amount"] or 0 for d in openn)
    n = len(openn)
    if n == 0:
        return {"error": "No open deals found."}

    weighted = 0.0     # stage-weighted only
    stressed = 0.0     # stage-weighted + hygiene haircuts
    late_clean = 0.0   # healthy late-stage dollars
    for d in openn:
        amt = d["amount"] or 0
        p = stage_prob(d["stage"])
        weighted += amt * p
        hc = 1.0
        idle = (asof - d["activity"]).days if d["activity"] else None
        if d["close"] and d["close"] < asof:
            hc *= 0.5                       # overdue: slipping
        if idle is not None:
            if idle > 60:
                hc *= 0.4                   # zombie
            elif idle > 30:
                hc *= 0.7                   # stalled
        if amt == 0:
            hc *= 0                         # can't forecast a $0 deal
        stressed += amt * p * hc
        if p >= 0.55 and hc == 1.0:
            late_clean += amt

    gap_pct = (reported - stressed) / reported if reported else 0
    clean_late_share = late_clean / reported if reported else 0
    confidence = ("High" if clean_late_share >= 0.35
                  else "Medium" if clean_late_share >= 0.18 else "Low")
    multiple = reported / stressed if stressed else float("inf")

    return {"n": n, "reported": reported, "weighted": weighted,
            "stressed": stressed, "gap_pct": gap_pct, "multiple": multiple,
            "confidence": confidence, "clean_late_share": clean_late_share,
            "asof": asof.isoformat()}


def _usd(x):
    return "${:,.0f}".format(round(x))


def render(r):
    if "error" in r and "n" not in r:
        return "Forecast Stress Test: " + r["error"]
    lines = []
    lines.append("=" * 56)
    lines.append("  FORECAST STRESS TEST")
    lines.append("=" * 56)
    lines.append("")
    lines.append("  Reported pipeline:        {}  ({} open deals)".format(_usd(r["reported"]), r["n"]))
    lines.append("  Stage-weighted forecast:  {}  ({:.0f}% of reported)".format(
        _usd(r["weighted"]), 100 * r["weighted"] / r["reported"] if r["reported"] else 0))
    lines.append("  Stress-tested forecast:   {}  ({:.0f}% of reported)".format(
        _usd(r["stressed"]), 100 * r["stressed"] / r["reported"] if r["reported"] else 0))
    lines.append("")
    lines.append("  Overstatement gap:        {:.0f}%".format(100 * r["gap_pct"]))
    lines.append("  Your reported pipeline is {:.1f}x the stress-tested number.".format(r["multiple"]))
    lines.append("  Forecast confidence:      {}".format(r["confidence"]))
    lines.append("")
    lines.append("  How this is built: each open deal is weighted by its stage")
    lines.append("  win-probability, then haircut for being overdue (x0.5) or")
    lines.append("  stalled/zombie (x0.7 / x0.4). Stage probabilities are editable")
    lines.append("  defaults in this script -- set them to your real win rates.")
    lines.append("")
    lines.append("  Ran locally. Nothing was uploaded or stored.  --  aventary.com")
    lines.append("=" * 56)
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="Forecast Stress Test — stress-test pipeline forecast locally.")
    ap.add_argument("csv", help="Path to your open-pipeline CSV export.")
    ap.add_argument("--asof", help="Reference date YYYY-MM-DD (default: today).")
    args = ap.parse_args()
    asof = _parse_date(args.asof) if args.asof else None
    print(render(forecast(args.csv, asof)))


if __name__ == "__main__":
    main()
