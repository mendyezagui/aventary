import { BlockRenderer } from "@/components/Blocks";
import { getPage } from "@/lib/cms";
import { SEED } from "@/lib/seed";

export const revalidate = 60;
export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const page = (await getPage("contact")) ?? SEED.contact;
  return <>{page.blocks.map((b) => <BlockRenderer key={b.id} block={b} />)}</>;
}
