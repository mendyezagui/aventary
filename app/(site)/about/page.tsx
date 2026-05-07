import { BlockRenderer } from "@/components/Blocks";
import { getPage } from "@/lib/cms";
import { SEED } from "@/lib/seed";

export const revalidate = 60;
export const metadata = { title: "About" };

export default async function AboutPage() {
  const page = (await getPage("about")) ?? SEED.about;
  return <>{page.blocks.map((b) => <BlockRenderer key={b.id} block={b} />)}</>;
}
