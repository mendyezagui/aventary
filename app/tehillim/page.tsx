import type { Metadata, Viewport } from "next";
import { fontVars } from "./fonts";
import HomeTehillim from "./HomeTehillim";
import "./tehillim.css";

export const metadata: Metadata = {
  title: "Tehillim — Psalms",
  description:
    "A Tehillim (Psalms) home: today's daily portion with the Elul and Ten Days of Repentance additions, Tehillim for a name (Psalm 119), saved Psalms for kaddish and family, and hands-free auto-scroll.",
  robots: { index: false, follow: false },
  manifest: "/tehillim/manifest.webmanifest",
  applicationName: "Tehillim",
  appleWebApp: {
    capable: true,
    title: "Tehillim",
    statusBarStyle: "black-translucent",
  },
  // Override the site-wide Aventary icon for this route.
  icons: {
    icon: [
      { url: "/tehillim/icon.svg", type: "image/svg+xml" },
      { url: "/tehillim/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/tehillim/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/tehillim/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2b3a80",
};

export default function TehillimHome() {
  return (
    <div className={`tehillim-page ${fontVars}`}>
      <HomeTehillim />
    </div>
  );
}
