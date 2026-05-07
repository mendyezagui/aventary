import { BlockRenderer } from "@/components/Blocks";
import { getPage } from "@/lib/cms";
import { SEED } from "@/lib/seed";

export const revalidate = 60;

export default async function HomePage() {
  const page = (await getPage("home")) ?? SEED.home;
  return (
    <>
      {page.blocks.map((b) => (
        <BlockRenderer key={b.id} block={b} />
      ))}
    </>
  );
}
