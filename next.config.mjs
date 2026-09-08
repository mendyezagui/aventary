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
