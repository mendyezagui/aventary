import { BlockRenderer } from "@/components/Blocks";
import { RichDiagnostics } from "@/components/RichDiagnostics";
import { getPage } from "@/lib/cms";
import { notFound } from "next/navigation";

export const revalidate = 60;

const OG_IMAGE = "https://aventary.com/og-diagnostics.png";
const PAGE_URL = "https://aventary.com/diagnostics";
const TITLE = "Revenue Leak Detection Kit — Aventary";
const DESCRIPTION =
  "Free RevOps diagnostics: X-ray your pipeline and forecast from one CSV and see how much of your reported revenue you can actually trust.";

export const metadata = {
  title: "Revenue Leak Detection Kit",
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
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
        alt: "Aventary Revenue Leak Detection Kit — free RevOps pipeline and forecast diagnostic",
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

export default async function DiagnosticsPage() {
  const page = await getPage("diagnostics");
  if (!page) notFound();

  // Rich designed page (pages.body_html) — render full-bleed, skip blocks.
  if (page.body_html) {
    return (
      <>
        <div dangerouslySetInnerHTML={{ __html: page.body_html }} />
        <RichDiagnostics />
      </>
    );
  }

  return <>{page.blocks.map((b) => <BlockRenderer key={b.id} block={b} />)}</>;
}
