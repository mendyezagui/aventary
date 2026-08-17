import { Frank_Ruhl_Libre } from "next/font/google";

// The classic printed-Tehillim Hebrew serif, shared by the home hub and the reader.
export const hebrew = Frank_Ruhl_Libre({
  subsets: ["hebrew"],
  weight: ["400", "500", "700"],
  variable: "--font-hebrew",
  display: "swap",
});
