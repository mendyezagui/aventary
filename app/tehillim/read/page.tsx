import type { Metadata } from "next";
import { Suspense } from "react";
import { hebrew } from "../fonts";
import TehillimReader from "../TehillimReader";
import "../tehillim.css";

export const metadata: Metadata = {
  title: "Tehillim — Read",
  description:
    "Read Tehillim in Hebrew with hands-free auto-scroll: today's portion (with the Elul and Ten Days additions), any Psalm, a name's Psalm 119 stanzas, or your saved Psalms.",
  robots: { index: false, follow: false },
};

export default function TehillimReadPage() {
  return (
    <div className={`tehillim-page ${hebrew.variable}`}>
      <Suspense fallback={<div className="scroll-area" />}>
        <TehillimReader />
      </Suspense>
    </div>
  );
}
