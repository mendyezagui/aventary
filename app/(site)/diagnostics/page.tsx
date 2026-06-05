import { BlockRenderer } from "@/components/Blocks";
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
  return <>{page.blocks.map((b) => <BlockRenderer key={b.id} block={b} />)}</>;
}
