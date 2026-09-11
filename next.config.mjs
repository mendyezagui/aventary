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
                    {
                        // The Tehillim app has moved to its own domain. Send the
                        // old aventary.com/tehillim URLs (and everything under
                        // them, query strings preserved) to tehillimcircle.com.
                        // Scoped to the aventary.com host so it never fires on
                        // tehillimcircle.com itself (which serves the real
                        // /tehillim/* app) — that would loop. Temporary for now
                        // (not cached hard), so it stays easy to undo.
                        source: "/tehillim",
                        has: [{ type: "host", value: "aventary.com" }],
                        destination: "https://tehillimcircle.com/tehillim",
                        permanent: false
                    },
                    {
                        source: "/tehillim/:path*",
                        has: [{ type: "host", value: "aventary.com" }],
                        destination: "https://tehillimcircle.com/tehillim/:path*",
                        permanent: false
                    },
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
