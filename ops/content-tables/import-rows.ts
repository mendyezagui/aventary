// A one-shot import endpoint, used to move the social/content tables from the
// old database into this one on 2026-09-11.
//
// Why this exists at all: there is no server-to-server path between the two
// Supabase projects. The alternative was to read 174 KB of rows out of A into a
// chat transcript and retype them into an INSERT, where a single mis-escaped
// quote inside a 3,781-character LinkedIn script would corrupt a row silently.
// This way the rows go A -> pg_net -> here -> B without ever being reformatted,
// and the md5 check afterwards is a real check rather than a check of my own
// typing.
//
// It is deliberately narrow:
//   • POST only, and the bearer must be CRON_SECRET. verify_jwt is off because
//     pg_net on the other database cannot mint a user JWT.
//   • Only the four tables named in ALLOW can be written.
//   • tenant_id must be present on every row. Service role bypasses RLS, so a
//     row without one would be a row nobody can see and nobody can delete
//     through the app.
//   • It inserts. It cannot update or delete.
//
// TOMBSTONE THIS WHEN THE MOVE IS DONE. Redeploy index.ts with the 410 stub in
// this directory; the Supabase MCP surface has no delete-function call.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOW = new Set(["contentCalendar", "content_queue", "socialCampaigns", "socialStrategy"]);
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!CRON_SECRET || token !== CRON_SECRET) return json({ error: "unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "body must be JSON" }, 400); }

  const table = String(body?.table || "");
  if (!ALLOW.has(table)) return json({ error: `table '${table}' is not importable` }, 400);

  const rows = body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) return json({ error: "rows must be a non-empty array" }, 400);
  if (rows.some((r: any) => !r || typeof r !== "object" || !r.tenant_id)) {
    return json({ error: "every row needs a tenant_id" }, 400);
  }

  const { error } = await sb.from(table).insert(rows);
  if (error) return json({ table, inserted: 0, error: error.message }, 500);
  return json({ table, inserted: rows.length });
});
