// Public Good Deeds API — Cloudflare Pages Function backed by D1.
//   GET  /api/good-deeds        → list APPROVED deeds (newest first)
//   POST /api/good-deeds        → submit a deed (stored as `pending`)
//
// D1 binding `DB` is configured on the Pages project (see README / deploy).

const MAX_NAME = 80;
const MAX_DEED = 280;
const MAX_LOCATION = 80;
const LIST_LIMIT = 300;
const RATE_WINDOW_MIN = 10; // minutes
const RATE_MAX = 4; // submissions per IP hash per window

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function hashIp(ip, salt) {
  const data = new TextEncoder().encode(`${salt || 'sofa'}:${ip || 'unknown'}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: 'Database not configured' }, 500);
  const { results } = await env.DB.prepare(
    `SELECT id, name, deed, location, created_at
       FROM good_deeds
      WHERE status = 'approved'
      ORDER BY created_at DESC, id DESC
      LIMIT ?`
  )
    .bind(LIST_LIMIT)
    .all();

  const { total } = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM good_deeds WHERE status = 'approved'`
  ).first();

  return json({ deeds: results || [], total: total || 0 });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Database not configured' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  // Honeypot: real users never fill `website`. Bots do. Pretend success.
  if (clean(body.website, 200)) return json({ ok: true });

  const name = clean(body.name, MAX_NAME);
  const deed = clean(body.deed, MAX_DEED);
  const location = clean(body.location, MAX_LOCATION);

  if (name.length < 2) return json({ error: 'Please add your name.' }, 400);
  if (deed.length < 3) return json({ error: 'Please describe your good deed.' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ipHash = await hashIp(ip, env.DEEDS_SALT);

  // Rate limit per IP hash.
  const { recent } = await env.DB.prepare(
    `SELECT COUNT(*) AS recent FROM good_deeds
      WHERE ip_hash = ? AND created_at > datetime('now', ?)`
  )
    .bind(ipHash, `-${RATE_WINDOW_MIN} minutes`)
    .first();

  if ((recent || 0) >= RATE_MAX) {
    return json({ error: 'Thanks! You have added a few already — please try again later.' }, 429);
  }

  await env.DB.prepare(
    `INSERT INTO good_deeds (name, deed, location, status, ip_hash)
     VALUES (?, ?, ?, 'pending', ?)`
  )
    .bind(name, deed, location || null, ipHash)
    .run();

  return json({ ok: true, pending: true });
}
