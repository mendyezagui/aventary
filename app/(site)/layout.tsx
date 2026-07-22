import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AskAventary from "@/components/AskAventary";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pt-20">{children}</main>
      <Footer />
      <AskAventary />
    </>
  );
}
