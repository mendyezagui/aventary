#!/usr/bin/env bash
# Sync the SoFa planning modules from the app into this repo.
#
# WHY A COPY EXISTS AT ALL. The daily scan runs as a Supabase edge function,
# which imports these modules over HTTPS at cold start. The app they belong to,
# mendyezagui/secondbrain-app, is PRIVATE — raw.githubusercontent will not serve
# it — and making a multi-tenant product's source public to feed a cron is not a
# trade worth making. This repo is public, so the edge runtime can read it.
#
# The copies are BYTE-IDENTICAL on purpose. That is what makes drift a diff
# rather than a discovery: run this script and it tells you whether the deployed
# logic still matches the app.
#
# The last time these were two copies nobody was diffing, they drifted for weeks
# and the app ended up with the OLDER code — the console had a bug the cron did
# not. Hence: one direction only, app -> here, never the reverse.
#
#   ./ops/sofa-jcc/sync-lib.sh --check   report drift, change nothing
#   ./ops/sofa-jcc/sync-lib.sh           copy the app's modules over these
#
# After copying: commit, then repoint sofa-jcc-scan.ts's imports and
# PINNED_SHA at the new commit, and redeploy the function. A pin left behind is
# the whole failure mode, so the function echoes it in every log line.

set -euo pipefail
APP="${SOFA_APP_DIR:-$HOME/secondbrain-app}/src/lib/sofa"
HERE="$(cd "$(dirname "$0")" && pwd)/lib"

[ -d "$APP" ] || { echo "app modules not found at $APP — set SOFA_APP_DIR"; exit 1; }

status=0
for f in "$APP"/*.js; do
  name="$(basename "$f")"
  if ! diff -q "$f" "$HERE/$name" >/dev/null 2>&1; then
    status=1
    if [ "${1:-}" = "--check" ]; then echo "DRIFT  $name"; else cp "$f" "$HERE/$name"; echo "copied $name"; fi
  fi
done

if [ "${1:-}" = "--check" ]; then
  [ $status -eq 0 ] && echo "in sync with the app" || echo "^ run without --check to update, then redeploy"
fi
exit $status
