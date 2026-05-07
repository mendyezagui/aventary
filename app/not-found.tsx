import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-8 py-32 max-w-5xl mx-auto text-center">
      <div className="inline-flex items-center px-4 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label text-sm mb-8">
        Page not found
      </div>
      <h1 className="font-headline text-6xl md:text-8xl font-bold editorial-gap leading-[1.05]">
        404<span className="text-primary italic">.</span>
      </h1>
      <p className="mt-6 text-lg text-on-surface-variant">That page doesn't exist.</p>
      <Link
        href="/"
        className="mt-10 inline-block bg-primary text-on-primary px-10 py-4 rounded-full font-label font-bold"
      >
        Back home
      </Link>
    </div>
  );
}
