import { BlockRenderer } from "@/components/Blocks";
import { RichDiagnostics } from "@/components/RichDiagnostics";
import { getPage } from "@/lib/cms";
import { notFound } from "next/navigation";

export const revalidate = 60;
export const metadata = {
  title: "Diagnostics",
  description:
    "Free revenue-leak diagnostics for RevOps and revenue leaders. Upload one CSV, get the number."
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
