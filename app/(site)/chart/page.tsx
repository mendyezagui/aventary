import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
    title: "My AI Learning Curve — Interactive Chart",
    description:
          "40 months of AI adoption across Claude, ChatGPT, Gemini, Salesforce AI, Creative AI, and Codex. Interactive D3.js visualization by Mendy Ezagui.",
    openGraph: {
          title: "My AI Learning Curve — 40 Months Across Six AI Ecosystems",
          description:
                  "Interactive chart: 40 months of AI adoption across six platforms. By Mendy Ezagui.",
          images: [
                  "https://cdn.prod.website-files.com/5ebcc45eccf7ae99a53f0374/6a19daa76f1e8f4218d9d041_og-hype-cycle.png",
                ],
    },
    twitter: { card: "summary_large_image" },
};

export default async function ChartPage() {
    const html = await fetch(
          "https://uclyawqdeabjsrejfdlw.supabase.co/functions/v1/hype-cycle?html",
      { next: { revalidate: 300 } }
        ).then((r) => r.text());

  return (
        <section className="w-full max-w-5xl mx-auto px-4 py-12">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                      My AI Learning Curve
              </h1>h1>
              <p className="text-gray-500 mb-8">
                      40 months &middot; six AI ecosystems &middot; thousands of conversations
                      &middot; March&nbsp;2023 to June&nbsp;2026
              </p>p>
        
              <div className="w-full rounded-lg overflow-hidden border border-gray-200">
                      <iframe
                                  srcDoc={html}
                                  sandbox="allow-scripts"
                                  className="w-full border-0"
                                  style={{ height: "620px" }}
                                  title="AI Hype Cycle Interactive Chart"
                                />
              </div>div>
        
              <p className="text-sm text-gray-400 mt-4">
                      Click or hover any milestone to see details. Toggle platforms in the
                      legend.
              </p>p>
        </section>section>
      );
}</section>
