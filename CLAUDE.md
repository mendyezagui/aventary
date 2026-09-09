# Aventary — working agreement

Read this before changing anything. It is written for both people and for
Claude sessions running against this repository.

## The one rule that matters

**`main` is production. Nothing reaches it except a pull request that Mendy has
reviewed and merged.** No direct pushes, no force pushes, no deploy commands run
by hand. If a task seems to require any of those, stop and ask.

This is enforced server-side by a branch protection rule on GitHub, so a push to
`main` is rejected even if something local lets it through. Treat a rejection as
the system working, not as a problem to route around.

## The workflow

```bash
git switch main && git pull            # start from current production
git switch -c feat/short-description   # one branch per change
# ...work...
npm run lint && npm run typecheck && npm run build   # all three must pass
git add -A && git commit -m "Insights: remember the Watch/Read choice"
git push -u origin feat/short-description
gh pr create --fill                    # or open the PR on github.com
```

Then wait for review. CI runs `lint`, `typecheck` and `build` on the PR; a red
check means the PR cannot merge. Fix it on the same branch and push again — the
PR updates itself.

Branch names: `feat/…`, `fix/…`, `chore/…`, `docs/…`. Claude Code on the web
creates `claude/…` branches; those are fine too.

Keep one PR to one change. A PR that fixes a bug *and* refactors a component
*and* bumps a dependency is three PRs, and it will be sent back.

## This repository is public

github.com/mendyezagui/aventary is world-readable. Anything committed here —
including on a branch that is never merged, and including in a commit that is
later reverted — is public permanently. Never commit:

- API keys, tokens, service-role keys, `.env` or `.env.local` contents
- Customer names, emails, or anything out of `contact_submissions`
- Server IPs, SSH keys, or internal hostnames

Secrets live in `.env.local` (gitignored) and in the hosting provider's
dashboard. `.env.example` holds placeholder names only — keep it that way.

## Stack

- **Next.js 15**, App Router, React 19, Server Components by default
- **TypeScript**, strict; `npm run typecheck` is `tsc --noEmit`
- **Tailwind** for styling — Space Grotesk + Raleway
- **Supabase** (Postgres + RLS) as the CMS and database
- **Cloudflare Workers** via `@opennextjs/cloudflare` for hosting
- **Resend** for transactional email

## Layout

| Path | What lives there |
| --- | --- |
| `app/(site)/` | Public marketing pages |
| `app/admin/` | Magic-link-gated admin, allowlisted by `ADMIN_EMAILS` |
| `app/api/` | Server route handlers — contact form, subscriptions, ask |
| `app/tehillim/` | The Tehillim reader app |
| `components/` | Shared React components |
| `lib/` | Data access; `cms.ts`, `videos.ts`, `work.ts` read Supabase |
| `lib/seed.ts` | Fallback content used when Supabase is not configured |
| `lib/supabase/` | Client/server Supabase factories — the service key stays server-side |
| `supabase/migrations/` | Numbered SQL, applied in order, never edited after merge |
| `middleware.ts` | Host routing and redirects |

## Conventions

- **Read the neighbours first.** Match the file you are editing — its naming,
  its comment density, how it handles loading and empty states.
- **Server Components by default.** Add `"use client"` only when the component
  needs state, effects, or browser APIs.
- **Env vars stay optional at build time.** Every read of
  `NEXT_PUBLIC_SUPABASE_URL` and friends is guarded so the site builds and
  renders from `lib/seed.ts` with no secrets present. Keep it that way — CI
  depends on it, and it is why contributors never need production credentials.
- **Migrations are append-only.** Add `00NN_description.sql`; never edit or
  renumber a migration that is already on `main`.
- **Anything under `app/api/`, `app/admin/`, `lib/supabase/`, `lib/admin.ts`,
  `middleware.ts`, or `supabase/` is high-risk.** Say so in the PR description
  and expect a slower review.

## Deploying

You do not deploy. Merging to `main` is the trigger, and the production
credentials live with Mendy. The deploy and remote-schema commands are blocked
in Claude sessions by `.claude/hooks/guard-prod.mjs`. That hook is a seatbelt
against accidents — the controls that actually hold are the branch protection
rule and who holds the credentials.

If you change the guard, run its tests:

```bash
node .claude/hooks/guard-prod.test.mjs
```

## When you are stuck

Ask in the PR or in Slack rather than guessing. Specifically ask before:
changing a database schema, changing auth or the admin allowlist, adding a
dependency, changing `next.config.mjs` / `wrangler.jsonc` / `middleware.ts`, or
touching anything that sends email.
