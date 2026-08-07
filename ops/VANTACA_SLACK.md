# Vantaca → Slack Assistant — System & Features

Operator + engineering reference for the Vantaca Slack assistant that Scott
Management Company uses to triage and action HOA work from Slack.

> **Scope note.** The runtime module sources live on the VPS
> (`/root/vantaca-mcp/…`), not in this repo. This repo holds the **validated
> deploy scripts** under `ops/` (each embeds the exact module payloads and
> `node --check`s them before restarting the service). This doc describes the
> deployed system as of the latest `ops/deploy_digest.sh`.

---

## 1. What it is

A Slack bot that lets managers ask about — and act on — live Vantaca data
(homeowners, associations, work orders, violations, ARCs, action items, manager
queues) without leaving Slack. Two paths:

- **Structured, cached menu** (`/vantaca`) — fixed queries that return
  consistent Block Kit cards with **zero AI tokens**.
- **Free-text AI assistant** — `/vantaca <question>`, @mentions, and DMs run
  through Claude with the Vantaca tools attached; threaded and audited.

Every returned work item (XN) carries a **recommended next action** and an
**Advance ▸** button that steps it (with confirmation) inside Slack.

---

## 2. Architecture

```
Slack (Socket Mode)  ──►  vantaca-slack (Bolt bot)  ──►  Claude API (Anthropic)
        ▲                        │                              │
        │                        ▼                              ▼
   managers            vantaca-mcp (MCP server) ◄────── Vantaca REST API
                             127.0.0.1:8787/mcp
                                   ▲
                        cloudflared tunnel (vantaca-tunnel)
                                   │
                        https://vantaca.aventary.com/mcp  (public MCP URL)

  Audit + controls ──►  Second Brain / Supabase (vantaca_audit, vantaca_controls)
```

Host: DigitalOcean droplet `134.209.126.217`. The bot runs in **Slack Socket
Mode**, so it needs no public inbound endpoint; only the MCP server is exposed
(via the Cloudflare tunnel) for remote callers.

### systemd units

| Unit | Type | Purpose |
|---|---|---|
| `vantaca-mcp.service` | long-running | MCP server exposing the Vantaca tools at `127.0.0.1:8787/mcp` |
| `vantaca-slack.service` | long-running | The Slack bot (Bolt, Socket Mode) — `index.mjs` |
| `vantaca-tunnel.service` | long-running | `cloudflared` tunnel → public MCP URL |
| `vantaca-report.service` + `.timer` | oneshot / scheduled | Posts the morning digest to the ops channel |
| `vantaca-alerts.service` + `.timer` | oneshot / every 5 min | **Ellona escalation alerter — currently DISABLED** (see §8) |

Env: `/root/vantaca-mcp/.env` and `/root/vantaca-mcp/slack-bot/.env`
(`SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `ANTHROPIC_API_KEY`, `MCP_AUTH_TOKEN`,
`SLACK_REPORT_CHANNEL`, `SB_BRAIN_URL`/`SB_BRAIN_KEY`, …).

### Bot modules (`/root/vantaca-mcp/slack-bot/`)

| File | Role |
|---|---|
| `index.mjs` | Bolt app: slash command, @mentions, DMs, the `/vantaca` query modal, Advance modal, action/view handlers |
| `vantaca-claude.mjs` | `askVantaca()` — the Claude call + a hand-rolled MCP client + audit/safety controls |
| `digest.mjs` | `buildDigest()` + `itemCard()` — the per-manager morning cards (reused by the menu) |
| `daily-report.mjs` | posts the digest to `SLACK_REPORT_CHANNEL` (run by `vantaca-report`) |

---

## 3. Product features

### 3.1 `/vantaca` query form (structured, cached, no AI)
`/vantaca` (no text) opens a **modal** where you pick:
- **Manager** (optional — blank = all 6 managers, merged & deduped)
- **Show**: All open · Newest · Urgent/safety · Aged 30d+ · Overdue · Water intrusion · Parked on the manager
- **Association filter** (free-text name or code, e.g. `Harbor Gate` or `S069`; fuzzy-matched on submit)

Submit → one filtered set of cards. Each intent is **one direct MCP call + a
fixed renderer**, so output is identical every time and costs no Claude tokens.

### 3.2 Recommended next action + Advance on every XN
Every work-item card (query results, aged WOs, and the morning digest) shows:
- a **`:dart: Recommended:`** line derived from the item's own priority signals
  (water → confirm vendor/ETA; parked → make the decision; overdue → advance now; …) — **no extra API/AI call**, and
- an **Advance ▸** button.

**Advance ▸** opens a modal that (a) looks the item up live, (b) shows
**Current step → Moving to `<next step>`**, (c) offers an **editable note**
field, and (d) on **Confirm** steps the item and re-reads it to verify — the
authoritative, audited write path.

### 3.3 Morning digest
`vantaca-report` posts a prioritized "what to do today" briefing: per-manager
summary + the top items as Advance-able cards. Same `itemCard` renderer as the
menu.

### 3.4 Free-text AI assistant
`/vantaca <question>`, @mentions in channels (threaded, context-aware), and DMs
run `askVantaca()` — Claude with the Vantaca tools. Used for anything the fixed
menu doesn't cover ("find the homeowner named Jackson", "what should Ellona work
on this morning?").

---

## 4. Vantaca MCP tools (30)

**Reads** — `associationList`, `getAssociationDetails`, `associationSnapshot`
(360° composite), `getActionItem`, `getActionTypeList`, `actionTypeSteps`,
`getWorkOrderList`, `agedWorkOrders` (portfolio, aged N+ days),
`getViolationList`, `getViolationTypeList`, `ARCList`, `attachmentList`,
`getDocument`, `getHomeownerAccountInfo`, `getHomeownerTransactions`,
`homeownerAssessment`, `getCommPreference`, `searchHomeowners`, `findPerson`
(name search within an association), `accountSnapshot`, `managerQueue`
(prioritized morning list), `getProviderList`, `search` / `fetch` (cross-assoc).

**Writes (gated, two-step confirm)** — `stepActionItem`, `createWorkOrder`,
`createARC`, `violationCreate`, `createStandardActionItem`, `updateHomeowner`.

Note: the API has **no accounts-payable access** (invoice/AP calls 403), and
**follow-up / due dates on existing items cannot be changed** via the API.

---

## 5. AI / Anthropic features used

| Feature | How it's used |
|---|---|
| Model | `claude-sonnet-4-6` via `client.beta.messages.create` |
| Adaptive thinking | `thinking: {type:"adaptive"}`, `output_config.effort: "medium"` |
| Tool use (agentic loop) | Manual loop, ≤ `VANTACA_MAX_TURNS` (default 10), with a token budget |
| MCP | **Hand-rolled** Streamable-HTTP MCP client to `127.0.0.1:8787` (bypasses the tunnel + the Anthropic MCP connector for reliability) |
| Prompt caching | `cache_control: {type:"ephemeral"}` on the system prompt; tools render first, so the tools+system prefix is cached. `mcpTools()` sorts tools by name to keep that prefix **byte-stable** across requests |
| Cost tracking | Per-request input/output/cache tokens → USD, written to the audit row |

---

## 6. Cost model & caching

- **Menu path = $0 AI.** Structured intents call the MCP tool directly and render
  a fixed template — no Claude.
- **App-level TTL cache** (in-memory `Map`): manager queue / association list
  ~10 min, aged WOs ~5 min, association list ~1 h (pre-warmed at startup).
  Repeated queries in-window cost zero tokens and zero MCP round-trips.
- **Anthropic prompt caching** on the free-text path: cache **read ≈ 0.1×**,
  **write ≈ 1.25×** (5-min TTL) of input price; Sonnet 4.6 base is **$3 / $15**
  per 1M in/out. Deterministic tool ordering keeps the cache hitting.
- **Budgets & guards** — `VANTACA_TOKEN_BUDGET` (default 150k), `VANTACA_MAX_TURNS`
  (10), `VANTACA_TOOL_RESULT_CAP` (24k chars) stop runaway/expensive requests.

---

## 7. Audit, safety & governance

- **Audit log** — every request (free-text and button) writes a row to
  `vantaca_audit` in Second Brain / Supabase: who, source (slash/mention/dm/
  digest-button), channel/thread, question, turns, tokens, cache, **cost USD**,
  tools called, writes performed, status, latency, and the final answer text.
- **Runtime controls** — `vantaca_controls` row (fetched per request) can adjust
  `max_turns`, `token_budget`, `tool_result_cap`, and a **pause** switch
  (`PAUSED` file or `paused` flag) that takes the assistant offline for
  maintenance.
- **Write safety** — writes are **two-step**: look up + propose the exact plan,
  then act only on explicit confirmation (the Advance modal's Confirm is that
  approval). Anti-fabrication rules forbid inventing XNs/names/statuses and
  forbid claiming success unless a write tool returned OK and a re-read verified
  it. Financial/destructive writes are refused and handed back to a human.

---

## 8. Operations / runbook

**Deploy** (from your machine; the script backs up, writes, `node --check`s all
four modules, then restarts):
```bash
scp -i ~/.ssh/vantaca_vps ~/Downloads/deploy_digest.sh root@134.209.126.217:/tmp/deploy_digest.sh && \
ssh -i ~/.ssh/vantaca_vps root@134.209.126.217 'bash /tmp/deploy_digest.sh 2>&1; echo "EXIT=$?"'
```

**Status / logs:**
```bash
ssh -i ~/.ssh/vantaca_vps root@134.209.126.217 'systemctl is-active vantaca-slack vantaca-mcp vantaca-tunnel'
ssh -i ~/.ssh/vantaca_vps root@134.209.126.217 'journalctl -u vantaca-slack -n 50 -f'
```

**Morning digest on demand:** `systemctl start vantaca-report.service`

**Ellona escalation alerter — DISABLED** on 2026-06-25 per request:
```bash
# off (done):   systemctl disable --now vantaca-alerts.timer
# to re-enable: systemctl enable  --now vantaca-alerts.timer
```

Deploy-script history lives in `ops/` (`deploy_digest.sh`, `deploy_who.sh`).

---

## 9. Monitoring (Datadog)

> ⚠️ **Not present in code/units as inspected.** There is no Datadog SDK,
> `dd-trace`, `datadog-agent` config, or `DD_*` env var referenced in the
> application modules or the five `vantaca-*` systemd units. If Datadog is
> running on this droplet it is doing so as a **host agent** independent of the
> app, which this doc can't confirm from the code alone.

**Confirm what's actually there** (paste back and I'll fill this section in):
```bash
ssh -i ~/.ssh/vantaca_vps root@134.209.126.217 \
  'systemctl is-active datadog-agent 2>&1; echo "---"; datadog-agent status 2>&1 | sed -n "1,30p"; echo "---"; ls /etc/datadog-agent 2>&1'
```

**Recommended coverage for this stack** (what Datadog *should* watch here):

| Signal | Source | Suggested monitor |
|---|---|---|
| Service liveness | `systemd_check` on `vantaca-slack`, `vantaca-mcp`, `vantaca-tunnel` | alert if any not `active` |
| MCP health | HTTP check on `127.0.0.1:8787/mcp` (init handshake) | alert on non-200 / timeout |
| Timer freshness | last run of `vantaca-report` (and `vantaca-alerts` if re-enabled) | alert if a scheduled run is missed |
| Cloudflare tunnel | `cloudflared` process + `vantaca.aventary.com/mcp` synthetic | alert on tunnel down |
| Host | `datadog-agent` core checks (CPU, **disk** — the box has a fixed writable allowance, memory) | disk > 85% |
| Claude cost/latency | derive from the `vantaca_audit` table (`cost_usd`, `ms`, `status`) — ship as custom metrics or a scheduled query | alert on cost spike / error-rate |
| App errors | `journalctl`/log integration on the `vantaca-*` units | alert on `:warning:` / `askVantaca error` / `TOOLS_FAIL` |

If you already have Datadog dashboards/monitors, tell me their names (or run the
check above) and I'll replace this section with the real configuration.

---

*Last updated: 2026-06-25.*
