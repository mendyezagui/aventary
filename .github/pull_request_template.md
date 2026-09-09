## What this changes

<!-- One or two sentences. What is different for a visitor to the site? -->

## Why

<!-- The problem or request behind it. Link the issue if there is one. -->

## How to check it

<!-- The exact steps a reviewer takes to see it working. Page URLs, what to
     click, what should happen. "npm run dev, open /insights, the Watch/Read
     toggle now remembers your choice." -->

## Risk

<!-- Tick what applies. Anything ticked gets a closer read. -->

- [ ] Touches `/app/api/` or `/app/admin/` (server routes, auth, admin)
- [ ] Touches Supabase schema or `supabase/migrations/`
- [ ] Touches `middleware.ts`, `next.config.mjs`, `wrangler.jsonc`, or deps
- [ ] Changes anything that sends email or writes to a database
- [ ] None of the above — content, styling, or a self-contained component

## Confirmations

- [ ] `npm run lint`, `npm run typecheck` and `npm run build` all pass locally
- [ ] No secrets, API keys, tokens, `.env` values, or customer data in the diff
      (this repository is **public** — anything committed here is world-readable)
- [ ] I did not run any deploy command (`npm run deploy`, `wrangler deploy`);
      production ships from `main` after this is merged
