import type { Metadata, Viewport } from "next";
import { fontVars } from "../fonts";
import Journal from "../Journal";
import "../modeh.css";

export const metadata: Metadata = {
  title: "Modeh Ani — Journal",
  description: "What you wrote on past mornings, kept on this device.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1f3a68",
  maximumScale: 5,
};

export default function ModehJournalPage() {
  return (
    <div className={`modeh-page ${fontVars}`}>
      <Journal />
    </div>
  );
}
