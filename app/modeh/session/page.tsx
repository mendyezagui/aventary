import type { Metadata, Viewport } from "next";
import { fontVars } from "../fonts";
import Session from "../Session";
import "../modeh.css";

export const metadata: Metadata = {
  title: "Modeh Ani — This morning",
  description:
    "The morning blessings, one at a time, with the reflection that goes with each one.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1f3a68",
  maximumScale: 5,
};

export default function ModehSessionPage() {
  return (
    <div className={`modeh-page ${fontVars}`}>
      <Session />
    </div>
  );
}
