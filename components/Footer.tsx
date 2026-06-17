import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full py-20 px-8 bg-ink text-white/55 font-body text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 max-w-7xl mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2.5 text-inverse-on-surface">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3.5 L19.5 20.5 L4.5 20.5 Z" />
              <path d="M12 3.5 L12 13.5" />
            </svg>
            <span className="font-label text-base font-semibold tracking-[0.3em] uppercase">Aventary</span>
          </div>
          <p className="text-primary font-label text-xs tracking-[0.22em] uppercase">Strategy. AI. Impact.</p>
          <p className="text-white/50 max-w-xs leading-relaxed">
            AI-first product strategy, fractional CPO/CTO leadership, and RevOps for non-tech companies.
          </p>
          <a
            href="https://www.toptal.com/product-managers/resume/mendy-ezagui#NYlE8k"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2.5 w-fit rounded-[2px] border border-primary/30 bg-primary/5 px-3.5 py-2 hover:border-primary/60 transition-colors"
          >
            <span className="material-symbols-outlined text-primary text-[20px]">verified</span>
            <span className="leading-tight">
              <span className="block text-white/90 font-label text-[11px] font-semibold tracking-[0.14em] uppercase">Top 3% of Talent</span>
              <span className="block text-white/45 text-[11px]">Vetted by Toptal</span>
            </span>
          </a>
        </div>
        <div className="flex flex-col gap-6">
          <h5 className="font-label text-xs font-semibold tracking-[0.18em] uppercase text-white/90">Company</h5>
          <ul className="flex flex-col gap-3">
            <li><Link className="text-white/55 hover:text-primary transition-colors" href="/insights">Insights</Link></li>
            <li><Link className="text-white/55 hover:text-primary transition-colors" href="/intelligence">Intelligence</Link></li>
            <li><Link className="text-white/55 hover:text-primary transition-colors" href="/about">About</Link></li>
            <li><Link className="text-white/55 hover:text-primary transition-colors" href="/appointments">Book a call</Link></li>
          </ul>
        </div>
        <div className="flex flex-col gap-6">
          <h5 className="font-label text-xs font-semibold tracking-[0.18em] uppercase text-white/90">Connect</h5>
          <ul className="flex flex-col gap-3">
            <li><a className="text-white/55 hover:text-primary transition-colors" href="https://www.linkedin.com" target="_blank" rel="noopener">LinkedIn</a></li>
            <li><Link className="text-white/55 hover:text-primary transition-colors" href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div className="flex flex-col gap-6">
          <h5 className="font-label text-xs font-semibold tracking-[0.18em] uppercase text-white/90">Legal</h5>
          <ul className="flex flex-col gap-3">
            <li><Link className="text-white/55 hover:text-primary transition-colors" href="#">Privacy Policy</Link></li>
            <li><Link className="text-white/55 hover:text-primary transition-colors" href="#">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-white/10 flex justify-between items-center text-white/40">
        <div>© {new Date().getFullYear()} Aventary. AI-first leadership &amp; RevOps.</div>
        <div className="flex gap-6">
          <span className="material-symbols-outlined text-xl">language</span>
          <span className="material-symbols-outlined text-xl">diversity_3</span>
        </div>
      </div>
    </footer>
  );
}
