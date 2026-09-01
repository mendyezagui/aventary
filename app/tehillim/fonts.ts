import { Frank_Ruhl_Libre, Assistant } from "next/font/google";

// Two reading faces the user can switch between:
// - Traditional: Frank Ruhl Libre — the classic Hebrew book/newspaper serif.
// - Clean: Assistant — a crisp humanist sans, easiest on the eyes on screen.
export const serifHe = Frank_Ruhl_Libre({
  subsets: ["hebrew"],
  weight: ["500", "600", "700"],
  variable: "--font-hebrew",
  display: "swap",
});
export const sansHe = Assistant({
  subsets: ["hebrew"],
  weight: ["500", "600", "700"],
  variable: "--font-sans-hebrew",
  display: "swap",
});

// Apply both font CSS variables on the page wrapper.
export const fontVars = `${serifHe.variable} ${sansHe.variable}`;
