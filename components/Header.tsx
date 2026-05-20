import Link from "next/link";

const nav = [
  { href: "/insights", label: "Insights" },
  { href: "/intelligence", label: "Intelligence" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export default function Header() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl">
      <div className="flex justify-between items-center max-w-7xl mx-auto px-6 md:px-8 h-20 gap-3">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tighter font-headline shrink-0"
        >
          Aventary
        </Link>

        {/* Desktop nav (md and up) */}
        <div className="hidden md:flex items-center space-x-10 font-headline tracking-tight">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-zinc-600 hover:text-zinc-900 transition-colors"
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
              className="list-none cursor-pointer p-2 -mr-2 text-zinc-700 hover:text-zinc-900 [&::-webkit-details-marker]:hidden"
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
              className="absolute right-0 top-full mt-3 w-56 bg-surface border border-black/10 rounded-2xl shadow-xl overflow-hidden"
            >
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  role="menuitem"
                  className="block px-5 py-3 font-headline tracking-tight text-zinc-700 hover:bg-zinc-100 transition-colors border-b border-black/5 last:border-b-0"
                >
                  {n.label}
                </Link>
              ))}
            </div>
          </details>

          <Link
            href="/appointments"
            className="bg-primary text-on-primary px-5 md:px-8 py-3 rounded-full font-label font-medium hover:opacity-80 transition-opacity duration-300 text-sm md:text-base whitespace-nowrap"
          >
            Book a Call
          </Link>
        </div>
      </div>
    </nav>
  );
}
