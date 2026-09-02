import type { Metadata, Viewport } from "next";
import { fontVars } from "./fonts";
import Home from "./Home";
import "./modeh.css";

export const metadata: Metadata = {
  title: "Modeh Ani — Morning Blessings",
  description:
    "Birchot HaShachar as a morning sit: the blessings said on waking, one at a time, with what each one is noticing and room to write down what you're grateful for.",
  robots: { index: false, follow: false },
  manifest: "/modeh/manifest.webmanifest",
  applicationName: "Modeh Ani",
  appleWebApp: {
    capable: true,
    title: "Modeh Ani",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/modeh/icon.svg", type: "image/svg+xml" },
      { url: "/modeh/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/modeh/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/modeh/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1f3a68",
  maximumScale: 5,
};

export default function ModehHome() {
  return (
    <div className={`modeh-page ${fontVars}`}>
      <Home />
    </div>
  );
}
