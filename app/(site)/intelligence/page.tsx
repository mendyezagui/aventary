import MorningBrief from "@/components/MorningBrief";

const OG_IMAGE = "https://aventary.com/og-intelligence.png";
const PAGE_URL = "https://aventary.com/intelligence";
const TITLE = "Morning Intelligence Brief — Aventary";
const DESCRIPTION =
  "Top 5 most materially valuable pieces from 30+ voices across AI, Salesforce, and Revenue Operations. Updated daily at 6 AM PT.";

export const metadata = {
  title: "Morning Intelligence Brief",
  description: DESCRIPTION,
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    type: "website" as const,
    url: PAGE_URL,
    siteName: "Aventary",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Aventary Morning Intelligence Brief — top 5 signals across AI, Salesforce, and RevOps",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function IntelligencePage() {
  return (
    <div className="bg-[#f8f9ff] min-h-[calc(100vh-5rem)] -mt-20 pt-20">
      <MorningBrief />
    </div>
  );
}
