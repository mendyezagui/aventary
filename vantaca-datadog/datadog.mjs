// datadog.mjs — Datadog telemetry for the Vantaca Slack bot.
//
// Self-contained, zero-dependency (Node 18+ global fetch), and NON-BLOCKING:
// every export swallows its own errors so telemetry can never break a Slack
// request or the tool loop. It talks to the Datadog HTTP APIs directly, so the
// VPS does NOT need a Datadog Agent installed.
//
// Drop this file next to vantaca-claude.mjs and wire emitAudit() in right where
// the bot writes its vantaca_audit row. See integration.example.mjs.
//
// Required env:  DATADOG_API_KEY
// Optional env:  DD_SITE (default datadoghq.com — US1), DD_SERVICE, DD_ENV,
//                DD_HOSTNAME, DD_EXTRA_TAGS (comma list), DD_TELEMETRY_DISABLED

const SITE = process.env.DD_SITE || "datadoghq.com"; // US1
const API_KEY = process.env.DATADOG_API_KEY || "";
const SERVICE = process.env.DD_SERVICE || "vantaca-slack-bot";
const ENV = process.env.DD_ENV || "prod";
const HOSTNAME = process.env.DD_HOSTNAME || "vantaca-vps";
const DISABLED =
  process.env.DD_TELEMETRY_DISABLED === "1" ||
  process.env.DD_TELEMETRY_DISABLED === "true" ||
  !API_KEY;

const METRICS_URL = `https://api.${SITE}/api/v2/series`;
const LOGS_URL = `https://http-intake.logs.${SITE}/api/v2/logs`;

const BASE_TAGS = [
  `service:${SERVICE}`,
  `env:${ENV}`,
  ...(process.env.DD_EXTRA_TAGS ? process.env.DD_EXTRA_TAGS.split(",").map((t) => t.trim()).filter(Boolean) : []),
];

// Datadog metric "type" enum for /api/v2/series: 1=count, 2=rate, 3=gauge.
const COUNT = 1;
const GAUGE = 3;

const nowSec = () => Math.floor(Date.now() / 1000);

// Tag values must be lowercase-ish and free of spaces/colons-in-value issues.
const tagVal = (v) =>
  String(v == null ? "unknown" : v)
    .toLowerCase()
    .replace(/[^a-z0-9_./-]+/g, "_")
    .slice(0, 80);

function isStopped(status) {
  return ["TOKEN_BUDGET", "MAX_TURNS", "PAUSED", "NO_TOOLS", "TOOLS_FAIL"].includes(status);
}

async function post(url, body) {
  if (DISABLED) return;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "DD-API-KEY": API_KEY },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok && process.env.DD_DEBUG) {
      const txt = await res.text().catch(() => "");
      console.error(`[datadog] ${url} -> ${res.status} ${txt.slice(0, 300)}`);
    }
  } catch (err) {
    if (process.env.DD_DEBUG) console.error(`[datadog] post failed: ${err?.message || err}`);
  } finally {
    clearTimeout(timer);
  }
}

function metric(name, value, type, tags = []) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  return {
    metric: name,
    type,
    points: [{ timestamp: nowSec(), value: v }],
    resources: [{ name: HOSTNAME, type: "host" }],
    tags: [...BASE_TAGS, ...tags],
  };
}

async function sendMetrics(series) {
  const clean = series.filter(Boolean);
  if (!clean.length) return;
  await post(METRICS_URL, { series: clean });
}

async function sendLog(attrs) {
  const ddtags = [...BASE_TAGS, ...(attrs._tags || [])].join(",");
  const entry = {
    ddsource: "vantaca",
    ddtags,
    hostname: HOSTNAME,
    service: SERVICE,
    ...attrs,
  };
  delete entry._tags;
  await post(LOGS_URL, [entry]);
}

/**
 * emitAudit — fire-and-forget telemetry for one bot request.
 * Pass the SAME object you write to vantaca_audit (plus anything extra).
 *
 * Recognised fields (all optional):
 *   question, answer, status, source, slack_user, ts,
 *   cost_usd, in_tok, out_tok, cache_r, turns, ms,
 *   tools: string[]            (e.g. ["agedWorkOrders","stepItem"])
 *   writes: [{ tool, verified, isError, args }]
 */
export function emitAudit(audit = {}) {
  // Detach from the request path entirely.
  Promise.resolve()
    .then(() => _emitAudit(audit))
    .catch((err) => {
      if (process.env.DD_DEBUG) console.error(`[datadog] emitAudit: ${err?.message || err}`);
    });
}

async function _emitAudit(a) {
  if (DISABLED) return;

  const status = a.status || "unknown";
  const stopped = isStopped(status);
  const tools = Array.isArray(a.tools) ? a.tools : [];
  const writes = Array.isArray(a.writes) ? a.writes : [];
  const failedWrites = writes.filter((w) => w && (w.verified !== true || w.isError));
  const ok = status === "ok" && failedWrites.length === 0;

  const reqTags = [
    `status:${tagVal(status)}`,
    `source:${tagVal(a.source)}`,
    `slack_user:${tagVal(a.slack_user)}`,
    `stopped:${stopped}`,
    `outcome:${ok ? "ok" : stopped ? "stopped" : "error"}`,
  ];

  const series = [
    metric("vantaca.request.count", 1, COUNT, reqTags),
    metric("vantaca.request.cost_usd", a.cost_usd, GAUGE, reqTags),
    metric("vantaca.request.duration_ms", a.ms, GAUGE, reqTags),
    metric("vantaca.request.turns", a.turns, GAUGE, reqTags),
    metric("vantaca.tokens.input", a.in_tok, COUNT, reqTags),
    metric("vantaca.tokens.output", a.out_tok, COUNT, reqTags),
    metric("vantaca.tokens.cache_read", a.cache_r, COUNT, reqTags),
    metric("vantaca.tool.calls.total", tools.length, COUNT, reqTags),
    metric("vantaca.write.total", writes.length, COUNT, reqTags),
    metric("vantaca.write.failed", failedWrites.length, COUNT, reqTags),
  ];

  if (stopped) series.push(metric("vantaca.request.stopped", 1, COUNT, reqTags));
  if (!ok && !stopped) series.push(metric("vantaca.request.error", 1, COUNT, reqTags));

  // Per-tool / per-MCP-endpoint usage.
  const toolCounts = {};
  for (const t of tools) toolCounts[t] = (toolCounts[t] || 0) + 1;
  for (const [tool, n] of Object.entries(toolCounts)) {
    series.push(metric("vantaca.tool.calls", n, COUNT, [...reqTags, `tool:${tagVal(tool)}`]));
  }
  for (const w of writes) {
    series.push(
      metric("vantaca.write.count", 1, COUNT, [
        ...reqTags,
        `tool:${tagVal(w?.tool)}`,
        `verified:${w?.verified === true}`,
      ])
    );
  }

  // Structured log line for the full request detail.
  const logStatus = ok ? "info" : stopped ? "warn" : "error";
  const truncate = (s, n) => (typeof s === "string" && s.length > n ? s.slice(0, n) + "…" : s);

  const logPromise = sendLog({
    message: truncate(a.question, 1000) || "(no text)",
    status: logStatus,
    _tags: reqTags,
    vantaca: {
      status,
      outcome: ok ? "ok" : stopped ? "stopped" : "error",
      stopped,
      source: a.source || null,
      slack_user: a.slack_user || null,
      cost_usd: Number(a.cost_usd) || 0,
      turns: a.turns ?? null,
      duration_ms: a.ms ?? null,
      tokens: {
        input: a.in_tok ?? 0,
        output: a.out_tok ?? 0,
        cache_read: a.cache_r ?? 0,
      },
      tools,
      tool_count: tools.length,
      writes: writes.map((w) => ({
        tool: w?.tool,
        verified: w?.verified === true,
        is_error: !!w?.isError,
        args: truncate(typeof w?.args === "string" ? w.args : JSON.stringify(w?.args ?? null), 300),
      })),
      write_failed: failedWrites.length,
      answer: truncate(a.answer, 2000) || null,
    },
  });

  await Promise.all([sendMetrics(series), logPromise]);
}

/**
 * emitPaused — report current pause state as a gauge (0 live / 1 paused).
 * Call right after the bot reads vantaca_controls at the start of a request,
 * or on a small interval, so a stuck-paused bot can be alerted on.
 */
export function emitPaused(paused) {
  Promise.resolve()
    .then(() => sendMetrics([metric("vantaca.bot.paused", paused ? 1 : 0, GAUGE)]))
    .catch(() => {});
}

/**
 * emitCounter — escape hatch for any extra one-off event you want in Datadog.
 */
export function emitCounter(name, value = 1, tags = []) {
  Promise.resolve()
    .then(() => sendMetrics([metric(name, value, COUNT, tags)]))
    .catch(() => {});
}

export const _config = { SITE, SERVICE, ENV, HOSTNAME, DISABLED, METRICS_URL, LOGS_URL };
