import { BlockRenderer } from "@/components/Blocks";
import CalendlyEmbed from "@/components/Calendly";
import { getPage } from "@/lib/cms";
import { SEED } from "@/lib/seed";

export const revalidate = 60;
export const metadata = { title: "Book a Call" };

export default async function AppointmentsPage() {
  const page = (await getPage("appointments")) ?? SEED.appointments;
  // Render the page's content blocks (hero, etc.) but swap the contact form
  // for the live Calendly scheduler so visitors can book directly.
  return (
    <>
      {page.blocks
        .filter((b) => b.type !== "form_anchor" && b.type !== "calendly")
        .map((b) => (
          <BlockRenderer key={b.id} block={b} />
        ))}
      <CalendlyEmbed url="https://calendly.com/mendy-aventary" />
    </>
  );
}
