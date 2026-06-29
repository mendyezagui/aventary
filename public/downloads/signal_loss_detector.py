#!/usr/bin/env python3
"""
Signal Loss Detector — surfaces the churn and upsell signals buried in your
support tickets and call notes.

Reads a plain-text file (one note/ticket per line or blank-line-separated) OR a
CSV that has a free-text column (notes, description, comments, transcript, body)
and counts the risk and expansion signals hiding in the conversation, with
example snippets and the top recurring themes.

PRIVACY: this script reads a local file and makes ZERO network calls. Your data
never leaves your machine. Read the code -- there's no `requests`, no `urllib`,
no sockets. That's the point.

Usage:
    python3 signal_loss_detector.py path/to/notes.txt
    python3 signal_loss_detector.py path/to/tickets.csv
    python3 signal_loss_detector.py path/to/tickets.csv --column "Description"

Dependencies: Python 3.8+ standard library only.
"""
import csv
import sys
import argparse

# --- signal lexicons (free version surfaces the obvious tells) ---
CHURN = {
    "cancel": ["cancel", "cancellation", "terminate", "end our contract", "not renewing",
               "won't renew", "wont renew", "renewal at risk", "thinking of leaving", "leaving"],
    "price": ["too expensive", "too pricey", "cost too much", "over budget", "price increase",
              "cheaper", "discount", "can't justify the cost", "budget cut"],
    "competitor": ["competitor", "switching to", "evaluating", "looking at alternatives",
                   "moving to", "comparing you to"],
    "frustration": ["frustrated", "frustrating", "disappointed", "unhappy", "fed up",
                    "escalate", "escalation", "angry", "unacceptable"],
    "not_using": ["not using", "haven't used", "stopped using", "no value", "shelfware",
                  "low usage", "not adopted", "barely use"],
    "broken": ["broken", "doesn't work", "does not work", "bug", "outage", "down again",
               "keeps failing", "still not fixed", "slow"],
}
UPSELL = {
    "more_seats": ["more seats", "add users", "additional licenses", "more licenses",
                   "add seats", "extra seats"],
    "upgrade": ["upgrade", "premium", "enterprise plan", "higher tier", "pro plan"],
    "expand": ["another team", "other department", "roll out", "rollout", "company-wide",
               "expand", "additional use case", "new use case", "scale this", "scale up"],
    "advocacy": ["love it", "love this", "huge fan", "recommend", "case study",
                 "testimonial", "referral", "refer you"],
}


def _load_texts(path, column=None):
    """Return a list of (text) units from a .txt/.md (lines/paragraphs) or CSV (a text column)."""
    lower = path.lower()
    if lower.endswith(".csv"):
        with open(path, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.reader(f))
        if not rows:
            return []
        header = rows[0]
        # pick the text column: explicit name, a known name, or the widest-average column
        cand_names = ["notes", "note", "description", "comments", "comment", "ticket",
                      "body", "transcript", "summary", "message", "detail", "details"]
        idx = None
        norm = [h.strip().lower() for h in header]
        if column and column.strip().lower() in norm:
            idx = norm.index(column.strip().lower())
        if idx is None:
            for c in cand_names:
                if c in norm:
                    idx = norm.index(c)
                    break
        if idx is None:
            widths = [0] * len(header)
            for r in rows[1:]:
                for i, c in enumerate(r):
                    if i < len(widths):
                        widths[i] += len(c or "")
            idx = widths.index(max(widths)) if widths else 0
        return [r[idx] for r in rows[1:] if idx < len(r) and (r[idx] or "").strip()]
    else:
        with open(path, encoding="utf-8-sig") as f:
            raw = f.read()
        if "\n\n" in raw:
            units = [b.strip() for b in raw.split("\n\n")]
        else:
            units = [ln.strip() for ln in raw.splitlines()]
        return [u for u in units if u]


def _snippet(text, term, width=70):
    low = text.lower()
    i = low.find(term)
    if i < 0:
        return text[:width].strip()
    start = max(0, i - 20)
    end = min(len(text), i + len(term) + 40)
    s = ("..." if start > 0 else "") + text[start:end].strip() + ("..." if end < len(text) else "")
    return " ".join(s.split())


def analyze(path, column=None):
    texts = _load_texts(path, column)
    if not texts:
        return {"error": "No text found to analyze."}
    n = len(texts)
    churn_hits, upsell_hits = {}, {}
    churn_units, upsell_units = set(), set()
    examples_churn, examples_upsell = [], []

    for u_i, t in enumerate(texts):
        low = t.lower()
        for theme, terms in CHURN.items():
            for term in terms:
                if term in low:
                    churn_hits[theme] = churn_hits.get(theme, 0) + 1
                    churn_units.add(u_i)
                    if len(examples_churn) < 5:
                        examples_churn.append((theme, _snippet(t, term)))
                    break
        for theme, terms in UPSELL.items():
            for term in terms:
                if term in low:
                    upsell_hits[theme] = upsell_hits.get(theme, 0) + 1
                    upsell_units.add(u_i)
                    if len(examples_upsell) < 5:
                        examples_upsell.append((theme, _snippet(t, term)))
                    break

    return {"n": n,
            "churn_units": len(churn_units), "upsell_units": len(upsell_units),
            "silent": n - len(churn_units | upsell_units),
            "churn_hits": churn_hits, "upsell_hits": upsell_hits,
            "examples_churn": examples_churn, "examples_upsell": examples_upsell}


THEME_LABEL = {
    "cancel": "Cancellation intent", "price": "Price pushback", "competitor": "Competitor mention",
    "frustration": "Frustration / escalation", "not_using": "Low adoption", "broken": "Product reliability",
    "more_seats": "Seat expansion", "upgrade": "Tier upgrade", "expand": "New team / use case",
    "advocacy": "Advocacy / referral",
}


def render(r):
    if "error" in r and "n" not in r:
        return "Signal Loss Detector: " + r["error"]
    out = []
    out.append("=" * 56)
    out.append("  SIGNAL LOSS DETECTOR")
    out.append("=" * 56)
    out.append("")
    out.append("  Conversations scanned:   {}".format(r["n"]))
    out.append("  Carrying a CHURN signal: {}".format(r["churn_units"]))
    out.append("  Carrying an UPSELL signal: {}".format(r["upsell_units"]))
    out.append("  No signal detected:      {}".format(r["silent"]))
    out.append("")
    if r["churn_hits"]:
        out.append("  TOP CHURN THEMES")
        for theme, c in sorted(r["churn_hits"].items(), key=lambda x: -x[1]):
            out.append("    {:<28} {:>3} mentions".format(THEME_LABEL.get(theme, theme), c))
        out.append("")
    if r["upsell_hits"]:
        out.append("  TOP UPSELL THEMES")
        for theme, c in sorted(r["upsell_hits"].items(), key=lambda x: -x[1]):
            out.append("    {:<28} {:>3} mentions".format(THEME_LABEL.get(theme, theme), c))
        out.append("")
    if r["examples_churn"]:
        out.append("  CHURN EXAMPLES (verbatim, local only)")
        for theme, s in r["examples_churn"]:
            out.append("    [{}] {}".format(THEME_LABEL.get(theme, theme), s))
        out.append("")
    if r["examples_upsell"]:
        out.append("  UPSELL EXAMPLES (verbatim, local only)")
        for theme, s in r["examples_upsell"]:
            out.append("    [{}] {}".format(THEME_LABEL.get(theme, theme), s))
        out.append("")
    out.append("  This is the free pass: keyword-level signal surfacing. It will")
    out.append("  miss nuance, sarcasm, and signals phrased in your customers' own")
    out.append("  words. The full sweep -- themed, scored, and tied to accounts and")
    out.append("  dollars -- is the engagement.")
    out.append("")
    out.append("  Ran locally. Nothing was uploaded or stored.  --  aventary.com")
    out.append("=" * 56)
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description="Signal Loss Detector -- find churn/upsell signals locally.")
    ap.add_argument("file", help="Path to a .txt/.md of notes, or a CSV with a text column.")
    ap.add_argument("--column", help="Name of the text column if reading a CSV.")
    args = ap.parse_args()
    print(render(analyze(args.file, args.column)))


if __name__ == "__main__":
    main()
