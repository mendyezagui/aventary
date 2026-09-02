import { Frank_Ruhl_Libre, Assistant } from "next/font/google";

// Frank Ruhl Libre for the liturgy — the classic Hebrew book serif, which is
// what the words look like in a siddur. Assistant carries the English around it.
export const hebrewSerif = Frank_Ruhl_Libre({
  subsets: ["hebrew"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-he",
  display: "swap",
});

export const uiSans = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

export const fontVars = `${hebrewSerif.variable} ${uiSans.variable}`;
