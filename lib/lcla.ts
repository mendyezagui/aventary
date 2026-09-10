// Shared bits for the password-gated LCLA proposal page.
//
// The gate is a shared password, which suits what it protects: a client proposal
// that several people at a school need to open, not an account system. What it
// must NOT do is put that password in the repository, so it lives only in
// LCLA_PASSWORD and the page fails closed when that is unset.
//
// The cookie stores a SHA-256 of the password rather than the password itself,
// so a leaked cookie does not hand over the phrase people type. Web Crypto is
// used rather than node:crypto because this runs on Cloudflare Workers.

export const LCLA_COOKIE = "lcla_access";

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The cookie value a correct password produces, or null if no password is configured. */
export async function expectedToken(): Promise<string | null> {
  const password = process.env.LCLA_PASSWORD;
  if (!password) return null;
  return sha256Hex(password);
}

/** Length-independent comparison, so a wrong guess takes the same time as a right one. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
