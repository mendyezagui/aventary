import { BlockRenderer } from "@/components/Blocks";
import { getPage } from "@/lib/cms";
import { SEED } from "@/lib/seed";

export const revalidate = 60;
export const metadata = { title: "Appointments" };

export default async function AppointmentsPage() {
  const page = (await getPage("appointments")) ?? SEED.appointments;
  return <>{page.blocks.map((b) => <BlockRenderer key={b.id} block={b} />)}</>;
}
