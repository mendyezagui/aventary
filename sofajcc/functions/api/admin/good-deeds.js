// Admin moderation API — Cloudflare Pages Function backed by D1.
//   GET  /api/admin/good-deeds   → { pending: [...], approved: [...], counts }
//   POST /api/admin/good-deeds   → { id, action: approve|reject|delete }
//                                → { id, action: edit, name, deed, location }
//
// Auth: send the admin token as `Authorization: Bearer <token>` or `?token=`.
// The token lives in the Pages env var ADMIN_TOKEN.

const MAX_NAME = 80;
const MAX_DEED = 280;
const MAX_LOCATION = 80;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function authed(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const url = new URL(request.url);
  const header = request.headers.get('Authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const supplied = bearer || url.searchParams.get('token') || '';
  // Constant-ish comparison.
  if (supplied.length !== env.ADMIN_TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) diff |= supplied.charCodeAt(i) ^ env.ADMIN_TOKEN.charCodeAt(i);
  return diff === 0;
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'Database not configured' }, 500);
  if (!authed(request, env)) return json({ error: 'Unauthorized' }, 401);

  const pending = await env.DB.prepare(
    `SELECT id, name, deed, location, status, created_at
       FROM good_deeds
      WHERE status = 'pending'
      ORDER BY created_at ASC, id ASC
      LIMIT 500`
  ).all();

  const approved = await env.DB.prepare(
    `SELECT id, name, deed, location, status, created_at
       FROM good_deeds
      WHERE status = 'approved'
      ORDER BY created_at DESC, id DESC
      LIMIT 500`
  ).all();

  const counts = await env.DB.prepare(
    `SELECT
        SUM(status = 'pending')  AS pending,
        SUM(status = 'approved') AS approved,
        SUM(status = 'rejected') AS rejected
       FROM good_deeds`
  ).first();

  return json({ pending: pending.results || [], approved: approved.results || [], counts });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Database not configured' }, 500);
  if (!authed(request, env)) return json({ error: 'Unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const id = parseInt(body.id, 10);
  const action = String(body.action || '');
  if (!id) return json({ error: 'Missing id' }, 400);

  if (action === 'approve') {
    await env.DB.prepare(`UPDATE good_deeds SET status = 'approved' WHERE id = ?`).bind(id).run();
  } else if (action === 'reject') {
    await env.DB.prepare(`UPDATE good_deeds SET status = 'rejected' WHERE id = ?`).bind(id).run();
  } else if (action === 'delete') {
    await env.DB.prepare(`DELETE FROM good_deeds WHERE id = ?`).bind(id).run();
  } else if (action === 'edit') {
    const name = clean(body.name, MAX_NAME);
    const deed = clean(body.deed, MAX_DEED);
    const location = clean(body.location, MAX_LOCATION);
    if (name.length < 2) return json({ error: 'Please add a name.' }, 400);
    if (deed.length < 3) return json({ error: 'Please add the good deed.' }, 400);
    await env.DB.prepare(
      `UPDATE good_deeds SET name = ?, deed = ?, location = ? WHERE id = ?`
    ).bind(name, deed, location || null, id).run();
  } else {
    return json({ error: 'Unknown action' }, 400);
  }

  return json({ ok: true });
}
