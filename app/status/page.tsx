import StatusLight from "./StatusLight";

export const metadata = {
  title: "Meeting Light",
  description: "Live traffic-light status of your calendar — green when clear, yellow before a meeting, red when you're on one.",
  robots: { index: false, follow: false }
};

// This page is a live dashboard; never statically cache it.
export const dynamic = "force-dynamic";

export default function StatusPage() {
  return <StatusLight />;
}
