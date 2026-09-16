// Digital Asset Links for the Android TWA (Play Store wrapper). Served at
// /.well-known/assetlinks.json via a rewrite in next.config.mjs. It binds the
// installed Android app to tehillimcircle.com so the app opens WITHOUT the
// browser address bar.
//
// The defaults below are the app's real package id and the SHA-256 of the
// Bubblewrap-generated *upload* key — public information (assetlinks.json is a
// public file), baked in so the signed test build verifies out of the box.
//
// Google Play re-signs the uploaded app with its OWN key (Play App Signing), so
// the store build needs Google's fingerprint too. Add it (comma-separated,
// alongside the upload key) via the Cloudflare env — no redeploy needed:
//   ANDROID_PACKAGE_NAME  overrides the package id below
//   ANDROID_CERT_SHA256   extra fingerprint(s), merged into the defaults
export const dynamic = "force-dynamic";

const DEFAULT_PACKAGE = "app.tehillimcircle.twa";
const DEFAULT_FINGERPRINTS = [
  "B1:9D:1F:A5:6F:35:C6:51:1D:04:41:51:E7:9B:DE:BF:A8:23:2F:29:17:29:74:61:67:F3:EA:11:72:8D:63:6C",
];

export function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME?.trim() || DEFAULT_PACKAGE;
  const envSha = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const fingerprints = [...new Set([...DEFAULT_FINGERPRINTS, ...envSha])];
  const body =
    pkg && fingerprints.length
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: pkg,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [];
  return new Response(JSON.stringify(body, null, 2) + "\n", {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=300",
    },
  });
}
