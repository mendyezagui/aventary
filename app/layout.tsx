import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const headline = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-headline",
  display: "swap"
});
const body = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.aventary.com"),
  title: { default: "Aventary | AI-Driven Leadership & Strategy", template: "%s — Aventary" },
  description:
    "Aventary builds AI-first product strategies, fractional CPO/CTO leadership, and RevOps systems for non-tech companies — every lead contacted, every time.",
  openGraph: {
    title: "Aventary",
    url: "https://www.aventary.com",
    siteName: "Aventary",
    type: "website"
  },
  twitter: { card: "summary" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${headline.variable} ${body.variable}`}>
      <body className="bg-background text-on-background font-body selection:bg-primary-fixed selection:text-on-primary-fixed">
        {children}
      </body>
    </html>
  );
}
