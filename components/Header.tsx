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
      <div className="flex justify-between items-center max-w-7xl mx-auto px-8 h-20">
        <Link href="/" className="text-2xl font-bold tracking-tighter font-headline">
          Aventary
        </Link>
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
        <div className="flex items-center gap-6">
          <Link
            href="/appointments"
            className="bg-primary text-on-primary px-8 py-3 rounded-full font-label font-medium hover:opacity-80 transition-opacity duration-300"
          >
            Book a Call
          </Link>
        </div>
      </div>
    </nav>
  );
}
