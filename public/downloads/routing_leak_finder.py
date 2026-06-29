#!/usr/bin/env python3
"""
Routing Leak Finder — finds the leads you paid for that quietly went nowhere.

Reads a CSV export of leads (or open opportunities) and reports routing leaks:
unowned leads, SLA misses (slow or no first touch), abandoned leads, duplicate
leads, and split ownership (the same account worked by more than one rep), plus
a 0-100 Routing Health Score.

PRIVACY: this script reads a local file and makes ZERO network calls. Your data
never leaves your machine. Read the code -- there's no `requests`, no `urllib`,
no sockets. That's the point.

Usage:
    python3 routing_leak_finder.py path/to/leads.csv
    python3 routing_leak_finder.py path/to/leads.csv --asof 2026-06-07 --sla 24

Dependencies: Python 3.8+ standard library only.
"""
import csv
import sys
import argparse
from datetime import datetime, date

ALIASES = {
    "name":     ["lead name", "opportunity name", "deal name", "name", "full name", "contact"],
    "account":  ["account", "account name", "company", "company name"],
    "owner":    ["owner", "lead owner", "opportunity owner", "assigned to", "rep", "sdr"],
    "status":   ["status", "lead status", "stage", "stage name", "disposition"],
    "amount":   ["amount", "deal value", "value", "acv", "arr", "potential value"],
    "created":  ["created date", "create date", "created", "date created", "lead created"],
    "activity": ["last activity date", "last activity", "last modified", "last contacted"],
    "response": ["first activity date", "first response", "first touch", "date first contacted",
                 "first contacted", "lead response date"],
    "source":   ["lead source", "source", "channel", "campaign"],
    "region":   ["region", "territory", "segment", "market"],
    "email":    ["email", "email address", "contact email", "work email"],
}

WEIGHTS = {"no_owner": 1.0, "sla_miss": 0.9, "abandoned": 1.0,
           "duplicate": 0.7, "split_owner": 0.6}


def _norm(s):
    return "".join(ch for ch in (s or "").lower() if ch.isalnum())


def map_columns(header):
    idx, norm_header = {}, [_norm(h) for h in header]
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


CLOSED_HINTS = ("closed", "won", "lost", "disqualified", "unqualified", "nurture", "junk")
OPEN_HINTS = ("new", "open", "working", "contacted", "attempting", "assigned", "mql", "sql", "")


def score(path, asof=None, sla_hours=24):
    asof = asof or date.today()
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    if len(rows) < 2:
        return {"error": "No data rows found."}
    col = map_columns(rows[0])

    missing = [label for key, label in
               [("owner", "Owner"), ("status", "Status"),
                ("created", "Created date"), ("activity", "Last activity date")]
               if key not in col]

    def cell(r, key):
        return r[col[key]] if key in col and col[key] < len(r) else None

    leads = []
    for r in rows[1:]:
        if not any((c or "").strip() for c in r):
            continue
        leads.append({
            "account": (cell(r, "account") or "").strip(),
            "owner": (cell(r, "owner") or "").strip(),
            "status": (cell(r, "status") or "").strip(),
            "amount": _parse_amount(cell(r, "amount")),
            "created": _parse_date(cell(r, "created")),
            "activity": _parse_date(cell(r, "activity")),
            "response": _parse_date(cell(r, "response")),
            "email": (cell(r, "email") or "").strip().lower(),
        })

    # only route-relevant (not-yet-closed) leads
    def is_open(s):
        sl = s.lower()
        return not any(h in sl for h in CLOSED_HINTS)

    openn = [d for d in leads if is_open(d["status"])]
    n = len(openn)
    if n == 0:
        return {"error": "No open/active leads found (all rows look closed).", "missing": missing}

    # duplicate + split-owner detection
    by_email, by_account_owner = {}, {}
    for d in openn:
        if d["email"]:
            by_email[d["email"]] = by_email.get(d["email"], 0) + 1
        if d["account"]:
            by_account_owner.setdefault(d["account"], set()).add(d["owner"] or "(unassigned)")

    flags = []
    for d in openn:
        first_touch = d["response"] or d["activity"]
        if d["created"] and first_touch:
            resp_hours = (first_touch - d["created"]).days * 24
        else:
            resp_hours = None
        idle = (asof - d["activity"]).days if d["activity"] else None
        flags.append({
            "no_owner": d["owner"] == "" or d["owner"].lower() in ("unassigned", "n/a", "none"),
            "sla_miss": (resp_hours is not None and resp_hours > sla_hours)
                        or (d["created"] and not first_touch),
            "abandoned": (idle is not None and idle > 30) or (d["activity"] is None and d["created"]
                         and (asof - d["created"]).days > 14),
            "duplicate": bool(d["email"]) and by_email.get(d["email"], 0) > 1,
            "split_owner": bool(d["account"]) and len(by_account_owner.get(d["account"], set())) > 1,
            "amount": d["amount"] or 0,
        })

    def cnt(pred):
        return sum(1 for f in flags if pred(f))

    def amt(pred):
        return sum(f["amount"] for f in flags if pred(f))

    leaks = {k: {"n": cnt(lambda f, k=k: f[k]), "amt": amt(lambda f, k=k: f[k])} for k in WEIGHTS}

    def any_flag(f):
        return any(f[k] for k in WEIGHTS)

    leaked_cnt = cnt(any_flag)
    leaked_amt = amt(any_flag)
    has_amounts = any(d["amount"] for d in openn)

    penalty = sum(WEIGHTS[k] * (leaks[k]["n"] / n) * 100 for k in WEIGHTS)
    health = max(0, round(100 - penalty))
    band = ("Tight" if health >= 80 else "Leaking" if health >= 60
            else "Porous" if health >= 40 else "Wide open")

    return {"n": n, "leaked_cnt": leaked_cnt, "leaked_amt": leaked_amt,
            "has_amounts": has_amounts, "score": health, "band": band,
            "leaks": leaks, "missing": missing, "sla_hours": sla_hours,
            "asof": asof.isoformat()}


def _usd(x):
    return "${:,.0f}".format(round(x))


def _pct(n, d):
    return "{:.0f}%".format(100 * n / d) if d else "0%"


def render(r):
    if "error" in r and "n" not in r:
        return "Routing Leak Finder: " + r["error"]
    L = r["leaks"]
    out = []
    out.append("=" * 56)
    out.append("  ROUTING LEAK FINDER")
    out.append("=" * 56)
    out.append("")
    out.append("  Routing Health Score:   {}/100  ({})".format(r["score"], r["band"]))
    out.append("")
    out.append("  Active leads reviewed:  {}".format(r["n"]))
    out.append("  Leads leaking:          {}  ({} of {})".format(
        r["leaked_cnt"], _pct(r["leaked_cnt"], r["n"]), r["n"]))
    if r["has_amounts"]:
        out.append("  Pipeline at risk:       {}".format(_usd(r["leaked_amt"])))
    out.append("")
    out.append("  LEAK BREAKDOWN  (SLA threshold: {}h to first touch)".format(r["sla_hours"]))
    rowdefs = [
        ("Unowned / unassigned", "no_owner"),
        ("SLA miss (slow or no first touch)", "sla_miss"),
        ("Abandoned (30+ days idle, still open)", "abandoned"),
        ("Duplicate lead (same email)", "duplicate"),
        ("Split ownership (1 account, 2+ reps)", "split_owner"),
    ]
    for label, key in rowdefs:
        v = L[key]
        if v["n"] > 0:
            tail = "  " + _usd(v["amt"]) if r["has_amounts"] and v["amt"] else ""
            out.append("    {:<38} {:>3} leads{}".format(label, v["n"], tail))
    if r["missing"]:
        out.append("")
        out.append("  FIRST FINDING: your export is missing " + ", ".join(r["missing"]) + ".")
        out.append("  Some routing checks couldn't run. If you can't see who owns a")
        out.append("  lead or when it was last touched, neither can your routing rules.")
    out.append("")
    out.append("  Note: this scores routing HYGIENE, not lead quality. A slow-touched")
    out.append("  lead can still buy; a fast one can still be junk. The score is how")
    out.append("  many paid-for leads your process is quietly dropping.")
    out.append("")
    out.append("  Ran locally. Nothing was uploaded or stored.  --  aventary.com")
    out.append("=" * 56)
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description="Routing Leak Finder -- find dropped leads locally.")
    ap.add_argument("csv", help="Path to your leads / open-opportunities CSV export.")
    ap.add_argument("--asof", help="Reference date YYYY-MM-DD (default: today).")
    ap.add_argument("--sla", type=int, default=24, help="First-touch SLA in hours (default: 24).")
    args = ap.parse_args()
    asof = _parse_date(args.asof) if args.asof else None
    print(render(score(args.csv, asof, args.sla)))


if __name__ == "__main__":
    main()
