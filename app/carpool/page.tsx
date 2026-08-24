import type { Metadata, Viewport } from "next";
import CarpoolApp from "./CarpoolApp";
import "./carpool.css";

export const metadata: Metadata = {
  title: "Carpool — live pickup",
  description:
    "See where the carpool driver is right now, and get a buzz a minute before they reach your door.",
  robots: { index: false, follow: false },
  manifest: "/carpool/manifest.webmanifest",
  applicationName: "Carpool",
  appleWebApp: {
    capable: true,
    title: "Carpool",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: [{ url: "/carpool/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/carpool/apple-touch-icon.png", sizes: "180x180" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function CarpoolPage() {
  return (
    <div className="cp-page">
      <CarpoolApp />
    </div>
  );
}
