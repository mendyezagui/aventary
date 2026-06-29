#!/usr/bin/env python3
"""
Executive Scorecard — rolls every Aventary diagnostic into one verdict:
are you ready to put AI in front of a customer?

Runs the sibling diagnostics on whatever inputs you provide — Pipeline X-Ray and
Forecast Stress Test on an opportunities CSV, Routing Leak Finder on a leads CSV,
Signal Loss Detector on tickets/notes — then prints a single rollup with an
AI-Readiness verdict.

PRIVACY: this script reads local files and makes ZERO network calls. Your data
never leaves your machine. It only ever runs the other local scripts in this
repo. Read the code -- no `requests`, no `urllib`, no sockets.

Usage:
    python3 executive_scorecard.py --pipeline opps.csv
    python3 executive_scorecard.py --pipeline opps.csv --leads leads.csv --notes tickets.csv

Dependencies: Python 3.8+ standard library only. Expects the sibling skill
folders (pipeline-xray, forecast-stress-test, routing-leak-finder,
signal-loss-detector) to be present next to this one, as they are in the repo.
"""
import os
import re
import sys
import argparse
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SKILLS = os.path.abspath(os.path.join(HERE, "..", ".."))


def _sib(*parts):
    return os.path.join(SKILLS, *parts)


for _p in ("pipeline-xray", "routing-leak-finder", "signal-loss-detector"):
    sp = _sib(_p, "scripts")
    if os.path.isdir(sp) and sp not in sys.path:
        sys.path.insert(0, sp)

READY_GATE = 70          # 0-100 dims must clear this
CHURN_RATE_CEILING = 25  # % of conversations carrying churn signal before it's a flag


def _dim(name, score=None, status="ok", note=""):
    return {"name": name, "score": score, "status": status, "note": note}


def run_pipeline(path):
    try:
        import pipeline_xray
        r = pipeline_xray.score(path)
        if "score" in r:
            return _dim("Pipeline Integrity", r["score"], note=r.get("band", ""))
        return _dim("Pipeline Integrity", status="error", note=r.get("error", "no score"))
    except Exception as e:
        return _dim("Pipeline Integrity", status="error", note=str(e))


def run_routing(path):
    try:
        import routing_leak_finder
        r = routing_leak_finder.score(path)
        if "score" in r:
            return _dim("Routing Health", r["score"], note=r.get("band", ""))
        return _dim("Routing Health", status="error", note=r.get("error", "no score"))
    except Exception as e:
        return _dim("Routing Health", status="error", note=str(e))


def run_signal(path, column=None):
    try:
        import signal_loss_detector
        r = signal_loss_detector.analyze(path, column)
        if "n" in r and r["n"]:
            rate = round(100 * r["churn_units"] / r["n"])
            note = "{} of {} convos carry churn signal ({}%); {} carry upsell".format(
                r["churn_units"], r["n"], rate, r["upsell_units"])
            return _dim("Signal Capture", None, note=note, status="measured")
        return _dim("Signal Capture", status="error", note=r.get("error", "no text"))
    except Exception as e:
        return _dim("Signal Capture", status="error", note=str(e))


def run_forecast(path):
    """Forecast lives in a sibling skill we don't control the API of, so run it as a
    subprocess and lift the first 0-100 or % figure from its report."""
    fpath = _sib("forecast-stress-test", "scripts", "forecast_stress_test.py")
    if not os.path.isfile(fpath):
        return _dim("Forecast Confidence", status="absent",
                    note="forecast-stress-test skill not found next to this one")
    try:
        out = subprocess.run([sys.executable, fpath, path], capture_output=True, text=True, timeout=60).stdout
        m = re.search(r"(\d{1,3})\s*(?:/\s*100|%)", out)
        if m:
            return _dim("Forecast Confidence", int(m.group(1)), note="from Forecast Stress Test")
        return _dim("Forecast Confidence", status="measured", note="ran; see Forecast Stress Test output")
    except Exception as e:
        return _dim("Forecast Confidence", status="error", note=str(e))


def verdict(dims, signal_dim):
    scored = [d for d in dims if isinstance(d["score"], (int, float))]
    weak = [d for d in scored if d["score"] < READY_GATE]
    churn_flag = False
    if signal_dim and signal_dim["status"] == "measured":
        m = re.search(r"\((\d+)%\)", signal_dim["note"])
        churn_flag = bool(m) and int(m.group(1)) >= CHURN_RATE_CEILING
    if not scored:
        return ("Not enough measured", "Provide a pipeline and/or leads export to get a readiness call.")
    if not weak and not churn_flag:
        return ("READY", "Every measured dimension clears {}/100 and churn signal is contained. "
                         "Your foundation can support an AI agent in front of customers.".format(READY_GATE))
    reasons = []
    if weak:
        worst = min(weak, key=lambda d: d["score"])
        reasons.append("{} is {}/100 (below {})".format(worst["name"], worst["score"], READY_GATE))
    if churn_flag:
        reasons.append("churn signal rate is elevated")
    return ("NOT READY", "Fix the foundation first: " + "; ".join(reasons) +
            ". AI on top of this amplifies the leak, it doesn't close it.")


def render(dims, signal_dim, vname, vwhy):
    out = []
    out.append("=" * 58)
    out.append("  EXECUTIVE SCORECARD")
    out.append("=" * 58)
    out.append("")
    out.append("  AI-READINESS VERDICT:  {}".format(vname))
    out.append("  " + vwhy)
    out.append("")
    out.append("  DIMENSIONS")
    for d in dims:
        if isinstance(d["score"], (int, float)):
            bar = "#" * round(d["score"] / 5)
            out.append("    {:<22} {:>3}/100  {:<20} {}".format(d["name"], d["score"], bar, d["note"]))
        elif d["status"] == "absent":
            out.append("    {:<22}   --     not run ({})".format(d["name"], d["note"]))
        elif d["status"] == "error":
            out.append("    {:<22}   --     skipped: {}".format(d["name"], d["note"][:30]))
        else:
            out.append("    {:<22}   --     {}".format(d["name"], d["note"]))
    if signal_dim:
        if signal_dim["status"] == "measured":
            out.append("    {:<22}  (qualitative)  {}".format(signal_dim["name"], signal_dim["note"]))
        elif signal_dim["status"] != "ok":
            out.append("    {:<22}   --     {}".format(signal_dim["name"], signal_dim["note"][:34]))
    out.append("")
    out.append("  These score readiness, not capability. A team can have great reps")
    out.append("  and still fail this -- the gaps are in the system underneath. Closing")
    out.append("  them is the Aventary engagement: book the teardown at aventary.com.")
    out.append("")
    out.append("  Ran locally. Nothing was uploaded or stored.  --  aventary.com")
    out.append("=" * 58)
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description="Executive Scorecard -- one AI-readiness verdict, locally.")
    ap.add_argument("--pipeline", help="Open-opportunities CSV (Pipeline X-Ray + Forecast).")
    ap.add_argument("--leads", help="Leads CSV (Routing Leak Finder).")
    ap.add_argument("--notes", help="Tickets/call-notes file (Signal Loss Detector).")
    ap.add_argument("--column", help="Text column name if --notes is a CSV.")
    args = ap.parse_args()
    if not any([args.pipeline, args.leads, args.notes]):
        ap.error("give at least one input: --pipeline, --leads, or --notes")

    dims, signal_dim = [], None
    if args.pipeline:
        dims.append(run_pipeline(args.pipeline))
        dims.append(run_forecast(args.pipeline))
    if args.leads:
        dims.append(run_routing(args.leads))
    if args.notes:
        signal_dim = run_signal(args.notes, args.column)

    vname, vwhy = verdict(dims, signal_dim)
    print(render(dims, signal_dim, vname, vwhy))


if __name__ == "__main__":
    main()
