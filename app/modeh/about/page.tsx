import type { Metadata, Viewport } from "next";
import { fontVars } from "../fonts";
import About from "../About";
import "../modeh.css";

export const metadata: Metadata = {
  title: "Modeh Ani — The text & the questions",
  description:
    "Which siddur each nusach was transcribed from, what changes between them, and why the written question rotates.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1f3a68",
  maximumScale: 5,
};

export default function ModehAboutPage() {
  return (
    <div className={`modeh-page ${fontVars}`}>
      <About />
    </div>
  );
}
