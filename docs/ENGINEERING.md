# Engineering setup

Two audiences. Part 1 is for whoever owns the repository — it is a one-time
checklist, and some of it can only be done by you. Part 2 is what you hand to a
new engineer on day one.

---

## Part 1 — Owner setup (once)

### 1. Lock `main`

```bash
gh auth login
bash scripts/setup-branch-protection.sh
```

Run it after this branch is merged, so the `verify` check already exists.

Afterwards `main` requires: a pull request, one approving review from a code
owner (`.github/CODEOWNERS`), a green `verify` check, all review conversations
resolved, and a linear history. Force-pushes and branch deletion are off for
everyone including you.

By default `enforce_admins` is `false`, so you personally can still push to
`main` in an emergency. Employees on the Write role cannot — that asymmetry is
the point. Pass `--strict` if you want the rule to bind you too, but with one
admin and a required approval you would then need a second reviewer for your own
changes.

### 2. Add people with the right role

`github.com/mendyezagui/aventary` → Settings → Collaborators → Add people.

| Role | Can they do the job? | Can they merge to main? |
| --- | --- | --- |
| **Read** | No — cannot push branches | No |
| **Write** | Yes — branches, PRs, reviews | **No.** This is what you want. |
| Maintain | Yes | No, but can change repo settings |
| Admin | Yes | **Yes, bypasses everything.** Do not hand this out. |

Give every employee **Write**. Nothing less, nothing more.

### 3. Understand what branch protection does not cover

This is the part people get wrong, so it is worth being blunt about it.

Protecting `main` controls what enters the *repository*. It does not control
what enters *production*, because today production ships by someone running
`npm run deploy` from a laptop with a Cloudflare API token. Anyone holding that
token can ship whatever they like, reviewed or not, without git ever knowing.
The same is true of the Supabase service-role key against the database.

So the credential list matters as much as the branch rule:

| Credential | Who should hold it | Why |
| --- | --- | --- |
| Cloudflare API token | You only, or GitHub Actions only | It *is* production deploy access |
| `SUPABASE_SERVICE_ROLE_KEY` | You only | Bypasses every row-level security policy |
| `RESEND_API_KEY` | You only | Can send mail as `@aventary.com` |
| `ANTHROPIC_API_KEY` | Per-person keys, not shared | Spend is attributable |
| Supabase project owner | You only | Employees get no dashboard access, or read-only |
| `.env.local` for local dev | Each engineer, with a **separate dev Supabase project** | Local work never touches production data |

`.github/workflows/deploy.yml` exists to close this gap: it moves the deploy
into GitHub Actions behind a `production` environment with required reviewers,
so the only route to production becomes "merged PR, then an approval". It is
deliberately left on manual trigger until you add the secrets and rotate the
laptop token — see the comments at the top of the file.

### 4. Give engineers a development Supabase project

Create a second Supabase project, run `supabase/migrations/` against it, and
give engineers *those* credentials for `.env.local`. Production URL and keys
never leave your machine and the hosting dashboard. This is the single highest
-value thing on this list after step 1.

### 5. Turn on the free GitHub safety nets

Settings → Code security:

- **Secret scanning** and **push protection** — on. Blocks a commit that
  contains a recognised key *before* it lands. Free on public repos.
- **Dependabot alerts** and **security updates** — on.

The repository is public, so a leaked key is public the moment it is pushed.
Push protection is the cheapest control here.

### 6. Sanity-check it

From a test account with Write access, or by asking the first hire to try:

```bash
git switch main
echo test >> README.md
git commit -am "test" && git push origin main
```

It must be rejected with `protected branch hook declined`. If it succeeds,
step 1 did not take.

---

## Part 2 — New engineer onboarding

### Get set up

```bash
git clone https://github.com/mendyezagui/aventary.git
cd aventary
npm ci
cp .env.example .env.local     # Mendy gives you DEVELOPMENT values for these
npm run dev                    # http://localhost:3000
```

The site renders without Supabase configured — it falls back to `lib/seed.ts` —
so you can start reading and editing before your keys arrive.

### Connect Claude

Run `claude` in the repository root. It picks up two files automatically:

- **`CLAUDE.md`** — the working agreement. Read it yourself too.
- **`.claude/settings.json`** — shared team settings, including a `PreToolUse`
  hook (`.claude/hooks/guard-prod.mjs`) that refuses to push to `main`,
  force-push, deploy, or run schema changes against the live database.

Personal preferences go in `.claude/settings.local.json`, which is gitignored.
Do not edit `.claude/settings.json` or the hook to unblock yourself — if
something you legitimately need is blocked, say so and it gets fixed for
everyone.

The hook is a seatbelt, not a lock. It exists so a mistake costs you five
seconds instead of taking the site down. The actual control is the branch
protection rule on GitHub, which will reject the push regardless.

### Ship a change

```bash
git switch main && git pull
git switch -c fix/contact-form-spacing

# ...work...

npm run lint && npm run typecheck && npm run build
git add -A
git commit -m "Contact: fix label spacing on mobile"
git push -u origin fix/contact-form-spacing
gh pr create --fill
```

Fill in the PR template properly — especially "How to check it". A reviewer who
has to reverse-engineer what to click is a slow reviewer.

CI runs lint, typecheck and build on every PR. Red check, no merge. Push fixes
to the same branch; the PR updates itself.

You will not be able to merge your own PR, and that is deliberate, not a
permissions bug.

### Things that will get a PR sent back

- More than one unrelated change in it
- A new dependency that was not discussed
- An edit to a migration that is already on `main` (add a new one instead)
- Anything committed that looks like a credential — this repository is public
- `npm run build` not run before pushing

### Never

- Push to `main`, or try to work around the guard hook
- Run `npm run deploy`, `wrangler deploy`, or `supabase db push`
- Use production Supabase credentials for local development
- Commit `.env.local`, keys, customer data, or server IPs
