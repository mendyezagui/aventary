import type { Metadata, Viewport } from "next";
import { Frank_Ruhl_Libre } from "next/font/google";
import TehillimReader from "./TehillimReader";
import "./tehillim.css";

const hebrew = Frank_Ruhl_Libre({
  subsets: ["hebrew"],
  weight: ["400", "500", "700"],
  variable: "--font-hebrew",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tehillim — Psalms",
  description:
    "Read Tehillim (Psalms 1–150) in Hebrew with the daily portion by the day of the Hebrew month, jump to any Psalm, and hands-free auto-scroll with adjustable speed.",
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

export default function TehillimPage() {
  return (
    <div className={`tehillim-page ${hebrew.variable}`}>
      <TehillimReader />
    </div>
  );
}
