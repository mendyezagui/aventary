import { Noto_Serif_Hebrew } from "next/font/google";

// Clean, well-hinted Hebrew serif with full nikkud + cantillation and heavy
// weights — thicker and crisper than the previous face for easier reading.
export const hebrew = Noto_Serif_Hebrew({
  subsets: ["hebrew"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-hebrew",
  display: "swap",
});
