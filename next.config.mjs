/** @type {import('next').NextConfig} */
const nextConfig = {
        reactStrictMode: true,
        images: {
                    remotePatterns: [
                        { protocol: "https", hostname: "images.squarespace-cdn.com" },
                        { protocol: "https", hostname: "images.unsplash.com" },
                        { protocol: "https", hostname: "**.supabase.co" }
                                ]
        },
        experimental: {},
        async rewrites() {
                // tehillimcircle.com is a second domain on this same Worker that
                // serves the Tehillim app as its own site. Show the Tehillim home
                // at that domain's root (its deeper links already use /tehillim/*).
                // Host-scoped, so aventary.com is unaffected. Runs at the routing
                // layer; the www→apex redirect below normalises the host first.
                return {
                    beforeFiles: [
                        {
                            source: "/",
                            has: [{ type: "host", value: "tehillimcircle.com" }],
                            destination: "/tehillim"
                        },
                        {
                            // Android's app-verification file. It lives under a
                            // dotfolder, which Next won't serve from /public, so
                            // route it to a tiny env-driven API handler instead.
                            // Empty (valid) until ANDROID_PACKAGE_NAME /
                            // ANDROID_CERT_SHA256 are set from the PWABuilder key.
                            source: "/.well-known/assetlinks.json",
                            destination: "/api/assetlinks"
                        }
                    ]
                };
        },
        async redirects() {
                return [
                    {
                        // The admin panel is an aventary.com thing — it must not be
                        // reachable on the Tehillim domain, so nobody stumbles onto
                        // its "admins only" login there. Bounce any /admin* on
                        // tehillimcircle.com back to the Tehillim home. (Note: this
                        // deliberately does NOT touch /auth/callback, which the
                        // Tehillim sign-in needs on this domain.)
                        source: "/admin/:path*",
                        has: [{ type: "host", value: "tehillimcircle.com" }],
                        destination: "https://tehillimcircle.com/",
                        permanent: false
                    },
                    {
                        source: "/admin",
                        has: [{ type: "host", value: "tehillimcircle.com" }],
                        destination: "https://tehillimcircle.com/",
                        permanent: false
                    },
                    // NOTE: aventary.com/tehillim used to 302 to
                    // tehillimcircle.com/tehillim. That redirect is gone, because
                    // it made aventary.com/tehillim only as reachable as
                    // tehillimcircle.com — and on 17 Sep 2026 that domain started
                    // answering NXDOMAIN from its own Cloudflare nameservers while
                    // the zone still read "active", taking the app, its privacy
                    // policy and its account-deletion page down with it.
                    //
                    // aventary.com/tehillim now serves the app directly, as the
                    // fallback it was supposed to be. It stays until the Play and
                    // App Store builds are public, then this route goes for good —
                    // Tehillim is not meant to live under this domain.
                    {
                        // /about, /contact and /appointments merged into one page.
                        // Permanent so the old URLs' search equity moves across;
                        // the fragments land people on the right section.
                        source: "/about",
                        destination: "/contact#about",
                        permanent: true
                    },
                    {
                        source: "/appointments",
                        destination: "/contact#book",
                        permanent: true
                    },
                    {
                        // /lcla moved to the /c/<slug> client-page system. The old
                        // link is already circulating, so it is a permanent redirect
                        // rather than a removal — and the same password still works
                        // on the other side of it.
                        source: "/lcla",
                        destination: "/c/lcla",
                        permanent: true
                    },
                    {
                        // BBDC proposal moved into the gated /c/<slug> client-page
                        // system. The old public /bbdc page is removed, so send its
                        // (already-circulating) URL to the new gated one.
                        source: "/bbdc",
                        destination: "/c/bbdc",
                        permanent: true
                    },
                    {
                        source: "/bbdc/",
                        destination: "/c/bbdc",
                        permanent: true
                    },
                    {
                        // Canonical host: www.* → apex. Handled at the routing layer
                        // (runs before middleware, no function invocation), so it covers
                        // every path without billing serverless CPU. Replaces the old
                        // middleware redirect. The morning-brief Worker is only routed on
                        // the apex, so this keeps /intelligence's fetch("/api/morning-brief")
                        // on the canonical host.
                        source: "/:path*",
                        has: [{ type: "host", value: "www.(?<host>.*)" }],
                        destination: "https://:host/:path*",
                        permanent: true
                    }
                ];
        },
        // Cloudflare Workers Builds runs 'next build' (not 'next build --no-lint'),
        // so disable ESLint at build time. Keep dev/'npm run lint' working as usual.
        eslint: { ignoreDuringBuilds: true },
        typescript: { ignoreBuildErrors: false }
};
export default nextConfig;
