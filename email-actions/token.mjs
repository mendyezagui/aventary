// token.mjs — HMAC-signed, expiring, one-time tokens for email action links.
// The link only ever CARRIES a token; the write happens on an explicit POST
// (see actions-server.mjs), never on link open, so email prefetch/scanners
// can't trigger an action.
import crypto from "node:crypto";
import fs from "node:fs";

const SECRET = process.env.EMAIL_ACTION_SECRET || "";
const CONSUMED_FILE = process.env.EMAIL_CONSUMED_FILE || new URL("./consumed.log", import.meta.url).pathname;
const TOKEN_HOURS = Number(process.env.EMAIL_TOKEN_HOURS || 72);

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const ub64u = (s) => Buffer.from(String(s), "base64url");

export function sign(payload) {
  if (!SECRET) throw new Error("EMAIL_ACTION_SECRET not set");
  const full = { jti: crypto.randomUUID(), exp: Date.now() + TOKEN_HOURS * 3600 * 1000, ...payload };
  const body = b64u(JSON.stringify(full));
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return body + "." + sig;
}

export function verify(token) {
  if (!SECRET) return { ok: false, error: "server not configured (no secret)" };
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return { ok: false, error: "malformed token" };
  const expect = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, error: "bad signature" };
  let p; try { p = JSON.parse(ub64u(body).toString()); } catch (e) { return { ok: false, error: "bad payload" }; }
  if (p.exp && Date.now() > p.exp) return { ok: false, error: "this link has expired" };
  return { ok: true, payload: p };
}

// One-time enforcement (file-backed; survives restarts).
export function isConsumed(jti) {
  if (!jti) return false;
  try { return fs.readFileSync(CONSUMED_FILE, "utf8").split(/\r?\n/).includes(jti); } catch (e) { return false; }
}
export function consume(jti) {
  if (!jti) return;
  try { fs.appendFileSync(CONSUMED_FILE, jti + "\n"); } catch (e) {}
}
