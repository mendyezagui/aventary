#!/usr/bin/env bash
#
# Locks `main` so it can only move through a reviewed pull request.
#
# Run this ONCE, as the repository owner, from your own machine:
#
#   gh auth login                       # if you have not already
#   bash scripts/setup-branch-protection.sh
#
# Run it AFTER .github/workflows/ci.yml is merged to main, so the "verify"
# status check already exists. Running it first is harmless but every PR will
# sit on "Expected — waiting for status" until CI has run once.
#
# Safe to re-run: it overwrites the rule with the same settings.
#
# What it sets up, and who it stops:
#
#   - Employees (Write role) cannot push to main at all. Their only route is a
#     pull request that you approve.
#   - You (Admin) can still push to main directly, for emergencies. That is the
#     `enforce_admins` setting below — pass --strict to close it for yourself
#     too, but understand that with one admin and a required approval you would
#     then need a second reviewer for your own changes.
#   - Nobody can force-push or delete main, admin included.

set -euo pipefail

REPO="${REPO:-mendyezagui/aventary}"
BRANCH="${BRANCH:-main}"
CHECK="verify"            # must match the job name in .github/workflows/ci.yml
ENFORCE_ADMINS=false

if [[ "${1:-}" == "--strict" ]]; then
  ENFORCE_ADMINS=true
fi

command -v gh >/dev/null 2>&1 || {
  echo "error: the GitHub CLI (gh) is not installed — https://cli.github.com" >&2
  exit 1
}

echo "Repository:      $REPO"
echo "Branch:          $BRANCH"
echo "Required check:  $CHECK  (job name in .github/workflows/ci.yml)"
echo "Applies to you:  $([[ $ENFORCE_ADMINS == true ]] && echo 'yes — admins included' || echo 'no — admins can still push directly')"
echo
read -r -p "Apply branch protection? [y/N] " reply
[[ "$reply" == "y" || "$reply" == "Y" ]] || { echo "Aborted."; exit 0; }

echo
echo "==> Protecting $BRANCH"
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO/branches/$BRANCH/protection" \
  --input - >/dev/null <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["$CHECK"]
  },
  "enforce_admins": $ENFORCE_ADMINS,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "block_creations": false,
  "lock_branch": false,
  "allow_fork_syncing": false
}
JSON

echo "==> Setting merge behaviour (squash only, delete branch on merge)"
gh api \
  --method PATCH \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO" \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F allow_auto_merge=true \
  -F delete_branch_on_merge=true >/dev/null

echo
echo "==> Result"
gh api "/repos/$REPO/branches/$BRANCH/protection" \
  --jq '{
    required_approvals: .required_pull_request_reviews.required_approving_review_count,
    code_owner_review: .required_pull_request_reviews.require_code_owner_reviews,
    dismiss_stale: .required_pull_request_reviews.dismiss_stale_reviews,
    required_checks: .required_status_checks.contexts,
    strict_checks: .required_status_checks.strict,
    admins_enforced: .enforce_admins.enabled,
    force_push: .allow_force_pushes.enabled,
    deletion: .allow_deletions.enabled,
    linear_history: .required_linear_history.enabled,
    conversations_resolved: .required_conversation_resolution.enabled
  }'

cat <<'DONE'

Done. `main` now requires a pull request with one approving review from a code
owner (see .github/CODEOWNERS) and a green `verify` check.

Two things this does NOT do, because GitHub cannot:

  1. It does not stop anyone who holds the Cloudflare API token from shipping
     to production without touching git. Keep that token to yourself.
  2. It does not stop anyone who holds the Supabase service-role key from
     changing production data directly. Same answer.

See docs/ENGINEERING.md for the rest of the setup.
DONE
