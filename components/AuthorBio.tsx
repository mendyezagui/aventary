import Link from "next/link";

export function AuthorBio() {
  return (
    <aside className="mt-16 bg-surface-container-lowest p-8 md:p-10 rounded-3xl soft-lift">
      <div className="flex items-start gap-6">
        <div
          aria-hidden="true"
          className="shrink-0 w-16 h-16 rounded-full bg-primary text-on-primary font-headline font-bold text-2xl flex items-center justify-center"
        >
          M
        </div>
        <div className="flex-1">
          <div className="text-primary font-label font-bold text-xs tracking-widest uppercase mb-2">
            Written by
          </div>
          <h3 className="font-headline text-xl md:text-2xl font-bold mb-3">
            Mendy Ezagui
          </h3>
          <p className="text-on-surface-variant text-base leading-relaxed mb-2">
            Founder of <strong>Aventary</strong>, helping B2B sales teams scale with Salesforce RevOps tech and AI strategy. <strong>MBA in Finance</strong> from Baruch&rsquo;s Zicklin School of Business. <strong>Salesforce Certified 14x</strong> &mdash; including all three Generative AI credentials.
          </p>
          <p className="text-on-surface-variant text-base leading-relaxed mb-5">
            5 years at <strong>PwC</strong> Technology &amp; Transformation Advisory: drove <strong>$1B+ in transformation value</strong> across 20+ programs, led 100+ executive workshops, and built PwC&rsquo;s first client-facing AI Sales Agent.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://www.linkedin.com/in/mendyezagui/"
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary font-label font-bold text-sm underline"
            >
              Connect on LinkedIn
            </a>
            <span className="text-on-surface-variant">·</span>
            <Link
              href="/contact"
              className="text-primary font-label font-bold text-sm underline"
            >
              Book a call
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
