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
        async redirects() {
                return [
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
