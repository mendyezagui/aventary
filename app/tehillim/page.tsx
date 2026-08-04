import type { Metadata } from "next";
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
};

export default function TehillimPage() {
  return (
    <div className={`tehillim-page ${hebrew.variable}`}>
      <TehillimReader />
    </div>
  );
}
