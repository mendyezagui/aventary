// Digital Asset Links for the Android TWA (Play Store wrapper). Served at
// /.well-known/assetlinks.json via a rewrite in next.config.mjs. It binds the
// installed Android app to tehillimcircle.com so the app opens WITHOUT the
// browser address bar.
//
// PWABuilder generates a signing key with a SHA-256 fingerprint. Put that (and
// the package name) into the Cloudflare env — no redeploy needed:
//   ANDROID_PACKAGE_NAME  e.g. app.tehillimcircle.twa
//   ANDROID_CERT_SHA256   the fingerprint(s), comma-separated
// Until they're set this returns an empty array (valid, verification pending).
export const dynamic = "force-dynamic";

export function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME?.trim();
  const sha = process.env.ANDROID_CERT_SHA256?.trim();
  const body =
    pkg && sha
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: pkg,
              sha256_cert_fingerprints: sha
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
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
