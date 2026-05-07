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
  // Cloudflare Workers Builds runs `next build` (not `next build --no-lint`),
  // so disable ESLint at build time. Keep dev/`npm run lint` working as usual.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false }
};

export default nextConfig;
