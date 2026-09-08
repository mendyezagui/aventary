import type { Metadata } from "next";
import { fontVars } from "../fonts";
import VoiceCheck from "./VoiceCheck";
import "../tehillim.css";

export const metadata: Metadata = {
  title: "Tehillim — Voice check",
  description:
    "Hear the Hebrew voices your device has, to test reading Tehillim aloud with the browser's built-in speech.",
  robots: { index: false, follow: false },
};

export default function TehillimVoiceCheckPage() {
  return (
    <div className={`tehillim-page ${fontVars}`}>
      <VoiceCheck />
    </div>
  );
}
