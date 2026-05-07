import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full py-16 px-8 mt-12 bg-zinc-100 font-body text-sm tracking-wide">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 max-w-7xl mx-auto">
        <div className="flex flex-col gap-6">
          <div className="text-lg font-bold text-zinc-800 tracking-tighter font-headline">Aventary</div>
          <p className="text-zinc-500 max-w-xs">
            AI-first product strategy, fractional CPO/CTO leadership, and RevOps for non-tech companies.
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <h5 className="font-bold text-zinc-800">Company</h5>
          <ul className="flex flex-col gap-3">
            <li><Link className="text-zinc-500 hover:text-primary transition-colors" href="/insights">Insights</Link></li>
            <li><Link className="text-zinc-500 hover:text-primary transition-colors" href="/about">About</Link></li>
            <li><Link className="text-zinc-500 hover:text-primary transition-colors" href="/appointments">Book a call</Link></li>
          </ul>
        </div>
        <div className="flex flex-col gap-6">
          <h5 className="font-bold text-zinc-800">Connect</h5>
          <ul className="flex flex-col gap-3">
            <li><a className="text-zinc-500 hover:text-primary transition-colors" href="https://www.linkedin.com" target="_blank" rel="noopener">LinkedIn</a></li>
            <li><Link className="text-zinc-500 hover:text-primary transition-colors" href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div className="flex flex-col gap-6">
          <h5 className="font-bold text-zinc-800">Legal</h5>
          <ul className="flex flex-col gap-3">
            <li><Link className="text-zinc-500 hover:text-primary transition-colors" href="#">Privacy Policy</Link></li>
            <li><Link className="text-zinc-500 hover:text-primary transition-colors" href="#">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-zinc-200 flex justify-between items-center text-zinc-400">
        <div>© {new Date().getFullYear()} Aventary. AI-first leadership &amp; RevOps.</div>
        <div className="flex gap-6">
          <span className="material-symbols-outlined text-xl">language</span>
          <span className="material-symbols-outlined text-xl">diversity_3</span>
        </div>
      </div>
    </footer>
  );
}
