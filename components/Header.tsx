import Link from "next/link";

const nav = [
  { href: "/insights", label: "Insights" },
  { href: "/intelligence", label: "Intelligence" },
  { href: "/diagnostics", label: "Diagnostics" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export default function Header() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-ink/85 backdrop-blur-xl border-b border-white/10">
      <div className="flex justify-between items-center max-w-7xl mx-auto px-6 md:px-8 h-20 gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 text-inverse-on-surface"
          aria-label="Aventary home"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3.5 L19.5 20.5 L4.5 20.5 Z" />
            <path d="M12 3.5 L12 13.5" />
          </svg>
          <span className="font-label text-base font-semibold tracking-[0.3em] uppercase">Aventary</span>
        </Link>

        {/* Desktop nav (md and up) */}
        <div className="hidden md:flex items-center gap-9 font-label text-xs tracking-[0.18em] uppercase">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-white/60 hover:text-white transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          {/* Mobile hamburger — pure CSS via <details>/<summary>, no JS so it
              works under Brave shields. Hidden on md and up. */}
          <details className="md:hidden relative group">
            <summary
              aria-label="Open navigation menu"
              className="list-none cursor-pointer p-2 -mr-2 text-white/70 hover:text-white [&::-webkit-details-marker]:hidden"
            >
              {/* Hamburger icon when closed */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="block group-open:hidden"
              >
                <path
                  d="M3 6h18M3 12h18M3 18h18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {/* Close icon when open */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="hidden group-open:block"
              >
                <path
                  d="M6 6l12 12M6 18L18 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </summary>

            <div
              role="menu"
              className="absolute right-0 top-full mt-3 w-56 bg-ink border border-white/10 rounded-lg shadow-xl overflow-hidden"
            >
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  role="menuitem"
                  className="block px-5 py-3 font-label text-xs tracking-[0.16em] uppercase text-white/70 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                >
                  {n.label}
                </Link>
              ))}
            </div>
          </details>

          <Link
            href="/appointments"
            className="bg-primary text-on-primary px-5 md:px-7 py-3 rounded-[2px] font-label font-semibold text-xs tracking-[0.16em] uppercase hover:opacity-90 transition-opacity duration-300 whitespace-nowrap"
          >
            Book a Call
          </Link>
        </div>
      </div>
    </nav>
  );
}
