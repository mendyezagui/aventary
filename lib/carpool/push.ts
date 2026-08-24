// Web Push (RFC 8030 / 8291 / 8292) implemented on Web Crypto only.
//
// The `web-push` npm package assumes Node's crypto; this app deploys to
// Cloudflare Workers, so the VAPID signature and the aes128gcm payload
// encryption are done here with primitives both runtimes have.
//
// Generate a key pair once and put it in the environment:
//   npx web-push generate-vapid-keys
//     VAPID_PUBLIC_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY  (same value)
//     VAPID_PRIVATE_KEY                                (server only)
//     VAPID_SUBJECT=mailto:you@example.com

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushMessage = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  kind?: string;
};

export type PushResult = {
  ok: boolean;
  status: number;
  /** The subscription is dead (unsubscribed or expired) — delete the row. */
  gone: boolean;
  error?: string;
};

const enc = new TextEncoder();

function b64urlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function bytesToB64url(input: Uint8Array | ArrayBuffer): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * WebCrypto's typings want an ArrayBuffer-backed view, and a Uint8Array is
 * only ArrayBufferLike. Copying into a fresh buffer keeps every call site
 * honest across TypeScript versions.
 */
function ab(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** HKDF extract+expand in one call — exactly what RFC 8291 asks for. */
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  bytes: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ab(ikm), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: ab(salt), info: ab(info) },
    key,
    bytes * 8
  );
  return new Uint8Array(bits);
}

export type VapidKeys = { publicKey: string; privateKey: string; subject: string };

export function vapidFromEnv(): VapidKeys | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:noreply@aventary.com";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

/** Signed VAPID JWT identifying this server to the push service. */
async function vapidAuthHeader(endpoint: string, keys: VapidKeys): Promise<string> {
  const audience = new URL(endpoint).origin;
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = bytesToB64url(
    enc.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: keys.subject
      })
    )
  );
  const signingInput = `${header}.${claims}`;

  const pub = b64urlToBytes(keys.publicKey);
  const priv = b64urlToBytes(keys.privateKey);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error("VAPID public key must be a 65-byte uncompressed P-256 point");
  }
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    d: bytesToB64url(priv),
    ext: true
  };
  const signingKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    ab(enc.encode(signingInput))
  );

  return `vapid t=${signingInput}.${bytesToB64url(signature)}, k=${keys.publicKey}`;
}

/**
 * Encrypt the payload for one subscription (aes128gcm, single record).
 * Body layout: salt(16) | record size(4) | key id length(1) | public key(65) | ciphertext
 */
async function encryptPayload(
  plaintext: string,
  sub: PushSubscriptionRecord
): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(sub.p256dh);
  const authSecret = b64urlToBytes(sub.auth);

  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
  const uaKey = await crypto.subtle.importKey(
    "raw",
    ab(uaPublic),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, ephemeral.privateKey, 256)
  );

  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  // 0x02 is the padding delimiter that marks the final record.
  const record = concat(enc.encode(plaintext), new Uint8Array([0x02]));
  const aesKey = await crypto.subtle.importKey("raw", ab(cek), "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: ab(nonce) }, aesKey, ab(record))
  );

  const head = new Uint8Array(16 + 4 + 1 + 65);
  head.set(salt, 0);
  new DataView(head.buffer).setUint32(16, 4096); // record size
  head[20] = asPublic.length;
  head.set(asPublic, 21);
  return concat(head, ciphertext);
}

/** Deliver one notification. Never throws — inspect the result. */
export async function sendPush(
  sub: PushSubscriptionRecord,
  message: PushMessage,
  opts: { ttlSeconds?: number; urgency?: "very-low" | "low" | "normal" | "high"; keys?: VapidKeys } = {}
): Promise<PushResult> {
  const keys = opts.keys ?? vapidFromEnv();
  if (!keys) {
    return { ok: false, status: 0, gone: false, error: "VAPID keys not configured" };
  }

  try {
    const body = await encryptPayload(JSON.stringify(message), sub);
    const headers: Record<string, string> = {
      Authorization: await vapidAuthHeader(sub.endpoint, keys),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      // A "one minute away" alert is worthless late — expire it quickly.
      TTL: String(opts.ttlSeconds ?? 120),
      Urgency: opts.urgency ?? "high"
    };
    if (message.tag) headers.Topic = message.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);

    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers,
      body: ab(body)
    });

    return {
      ok: res.ok,
      status: res.status,
      gone: res.status === 404 || res.status === 410,
      error: res.ok ? undefined : `${res.status} ${await res.text().catch(() => "")}`.trim()
    };
  } catch (e) {
    return { ok: false, status: 0, gone: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Copy for each ping kind, in one place so the app and the push agree. */
export function pingCopy(
  kind: string,
  driverName: string,
  opts: { stopLabel?: string; message?: string; etaSeconds?: number | null } = {}
): PushMessage {
  const who = driverName || "Your driver";
  switch (kind) {
    case "one_minute":
      return {
        title: "1 minute away",
        body: `${who} is about a minute away — kids outside, please.`,
        kind
      };
    case "heads_up":
      return {
        title: "On the way",
        body: `${who} has started the route${
          opts.etaSeconds ? ` — about ${Math.round(opts.etaSeconds / 60)} min to you` : ""
        }.`,
        kind
      };
    case "arrived":
      return { title: "Outside now", body: `${who} is at your door.`, kind };
    case "waiting":
      return { title: "Still waiting", body: `${who} is outside waiting.`, kind };
    case "skipped":
      return {
        title: "Stop skipped",
        body: `${who} had to move on. Please call to sort out pickup.`,
        kind
      };
    case "running_late":
      return {
        title: "Running late",
        body: opts.message || `${who} is running late this morning.`,
        kind
      };
    default:
      return { title: who, body: opts.message || "New carpool message", kind };
  }
}
