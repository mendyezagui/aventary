# Vantaca → Datadog monitoring

Datadog instrumentation for the **Vantaca Slack bot** — the bot that tracks
detailed usage of the MCP server, Slack requests, and the AI tool loop. It ships
every request's **metrics** and a structured **log** to Datadog **US1**, plus
**monitors** and a **dashboard** as code.

## Why this lives in `aventary` and not `vantaca-mcp`

The bot brain (`slack-bot/vantaca-claude.mjs`) lives in `mendyezagui/vantaca-mcp`
on the DigitalOcean VPS. That repo was **not in scope** for the session that
generated this, so the integration is delivered here as drop-in files. To
finish, copy them into `vantaca-mcp` (or re-run the assistant in a session
scoped to that repo to commit them directly).

## What gets sent

Source of truth is the `vantaca_audit` row the bot already builds per request.

**Metrics** (`vantaca.*`, tagged `service`, `env`, `status`, `outcome`,
`source`, `slack_user`, `stopped`):

| Metric | Type | Meaning |
| --- | --- | --- |
| `vantaca.request.count` | count | one per request |
| `vantaca.request.cost_usd` | gauge | Claude cost for the request |
| `vantaca.request.duration_ms` | gauge | wall-clock latency |
| `vantaca.request.turns` | gauge | tool-loop steps |
| `vantaca.tokens.input/output/cache_read` | count | token usage |
| `vantaca.tool.calls` | count | per **MCP tool / endpoint** (tag `tool`) |
| `vantaca.tool.calls.total` | count | tools per request |
| `vantaca.write.count` | count | per write (tags `tool`, `verified`) |
| `vantaca.write.total` / `vantaca.write.failed` | count | writes / unverified writes |
| `vantaca.request.stopped` | count | hit a budget/cap guardrail |
| `vantaca.request.error` | count | failed request |
| `vantaca.bot.paused` | gauge | 1 paused / 0 live |

**Logs** (`ddsource:vantaca`, `service:vantaca-slack-bot`): one structured entry
per request with the question, Slack user, status, cost, tokens, the list of
tools called, and each write with its `verified` flag — the full drill-down you
see in the Second Brain *Vantaca Controls* page, now searchable in Datadog.

## Install (on the VPS, inside `vantaca-mcp`)

1. Copy `datadog.mjs` next to `slack-bot/vantaca-claude.mjs`.
2. Wire two calls in (see `integration.example.mjs`):
   - After reading `vantaca_controls`: `emitPaused(!!controls?.paused);`
   - After the existing `vantaca_audit` insert: `emitAudit(audit);`
   - In the request `catch`: `emitAudit({ status: "TOOLS_FAIL", question, slack_user, ms });`
3. Add the env vars from `.env.example` to the bot's environment (systemd unit
   or `.env`) and set `DATADOG_API_KEY`.
4. Restart the service: `systemctl restart vantaca-slack` (or your unit name).

No Datadog Agent is required — it posts directly to the Datadog HTTP APIs. The
helper is fully non-blocking and fails silent (set `DD_DEBUG=1` to see errors).

### Smoke test

```bash
DD_DEBUG=1 DATADOG_API_KEY=*** node -e '
  import("./datadog.mjs").then(m => {
    m.emitAudit({ question:"test", status:"ok", source:"smoke", slack_user:"U123",
      cost_usd:0.0123, in_tok:1000, out_tok:200, cache_r:50, turns:2, ms:1800,
      tools:["agedWorkOrders","stepItem"],
      writes:[{tool:"stepItem", verified:true}] });
    setTimeout(()=>process.exit(0), 5000);
  })'
```

Then check Datadog → Metrics Explorer for `vantaca.request.count` and
Logs for `service:vantaca-slack-bot`.

## Monitors & dashboard

- `monitors.tf` — Terraform for 4 alerts: hourly cost spike, error/stop rate,
  failed-write verification, and bot-paused-too-long. Set `var.notify` to your
  Slack/email handle. Needs `DD_API_KEY` + `DD_APP_KEY`.
- `dashboard.json` — import via **Dashboards → New → Import dashboard JSON**.

## Files

| File | Purpose |
| --- | --- |
| `datadog.mjs` | the telemetry helper (drop into `vantaca-mcp`) |
| `integration.example.mjs` | exactly where to call it in the bot |
| `monitors.tf` | Datadog monitors as code |
| `dashboard.json` | importable Datadog dashboard |
| `.env.example` | required/optional env vars |
