import MorningBrief from "@/components/MorningBrief";

export const metadata = {
  title: "Morning Intelligence Brief",
  description: "Top 5 most materially valuable pieces from 30 voices across AI, Salesforce, and Revenue Operations. Updated daily at 6 AM PST.",
};

export default function IntelligencePage() {
  return (
    <div className="bg-[#080808] min-h-[calc(100vh-5rem)] -mt-20 pt-20">
      <MorningBrief />
    </div>
  );
}
