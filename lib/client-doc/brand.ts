import { PALETTE } from "./tokens";

// The one part of a client document that changes per client.
//
// Everything else about the design is Aventary's and fixed. A client brings a
// logo, a name and one accent colour, and those three reach into the document
// through a single CSS custom property and one <img>. That is the whole surface
// area, on purpose: a document that let each client supply a palette would stop
// looking like it came from us, which is the opposite of what a proposal is for.
//
// WHERE IT COMES FROM. `projects.public_meta` in Second Brain is jsonb and
// project-page-feed passes it through wholesale, so a brand is set by writing
// one object into a field that already exists — no migration, no edge-function
// change, no deploy:
//
//   {
//     "heading": "...",
//     "brand": {
//       "name":   "Prime Rock Realty",
//       "accent": "#1F4E79",
//       "logo":   "https://primerock.com/logo.svg"
//     }
//   }
//
// Anything missing falls back to Aventary's own, so a project with no brand
// block renders exactly as it did before.
//
// `logo` is the exception to "set it on the project". It is stored once on the
// COMPANY in the CRM (`companies.logo_url`) and project-page-feed fills it in
// from the project's companyId at request time, so every project for a client
// carries the same mark and a rebrand is a single edit. A logo written into
// public_meta.brand still wins — the feed only fills a field that is empty.
// Nothing changes on this side either way: a logo arrives in the brand object
// and is validated here exactly as before, whichever end supplied it.

export const AVENTARY_ACCENT = "#0E6B68";

export type DocBrand = {
  /** The client's name, for the logo's alt text and the monogram fallback. */
  name: string;
  /** The single per-client colour. Always a validated hex string. */
  accent: string;
  /** A darker step of the accent, for hovers and pressed states. Derived. */
  accentDeep: string;
  /** An absolute https logo URL, or null. */
  logo: string | null;
  /** Up to two letters, shown when there is no logo. Never empty. */
  mark: string;
  /** True when this document carries the client's own colour rather than ours. */
  custom: boolean;
};

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Accept a hex colour or nothing.
 *
 * Strict on purpose. This value is interpolated into a style attribute, so
 * "whatever the author typed" is not an acceptable input class — `red; }` in a
 * colour field would otherwise be a stylesheet. A regex that only admits hex
 * makes the whole question go away, and hex is what a brand guide gives you.
 */
export function safeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!HEX.test(v)) return null;
  return v.length === 4
    ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase()
    : v.toLowerCase();
}

/**
 * A darker step of a colour, for hover and pressed states.
 *
 * Derived rather than asked for. Requiring two colours per client means one day
 * getting a pair that do not belong together; one colour and a rule cannot
 * drift. 26% is the step between Aventary's own #0E6B68 and #0A514F, so the
 * house brand comes out of this function unchanged.
 */
export function darken(hex: string, amount = 0.26): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.max(0, Math.min(255, Math.round(c * (1 - amount))))
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * An absolute https URL, or null.
 *
 * https only, and no data: URIs. A logo is fetched by the reader's browser from
 * whatever host this names, so it is worth being plain that the value is a URL
 * to a real origin and not a payload smuggled through a text field.
 */
export function safeLogo(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Up to two initials from a name — the stand-in when there is no logo file.
 *
 * Most clients will never send a logo, and a blank space where an identity goes
 * looks like the page failed to load. A monogram in the client's own accent
 * reads as deliberate.
 */
export function monogram(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
  if (!words.length) return "A";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Aventary's own identity — the default every document falls back to. */
export function houseBrand(name = "Aventary"): DocBrand {
  return {
    name,
    accent: AVENTARY_ACCENT,
    accentDeep: darken(AVENTARY_ACCENT),
    logo: null,
    mark: monogram(name),
    custom: false
  };
}

/**
 * Resolve `public_meta.brand` into something renderable.
 *
 * Every field is independently optional and independently validated, so a
 * malformed colour costs you the colour and not the logo, and a brand object
 * that is entirely nonsense renders as the house brand rather than as an error.
 * A document is the wrong place to surface a configuration mistake to a client.
 */
export function resolveBrand(raw: unknown, fallbackName: string): DocBrand {
  const house = houseBrand(fallbackName || "Aventary");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return house;

  const b = raw as Record<string, unknown>;
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim() : house.name;
  const accent = safeHex(b.accent) ?? house.accent;
  const logo = safeLogo(b.logo);
  const mark =
    typeof b.mark === "string" && b.mark.trim()
      ? b.mark.trim().slice(0, 3).toUpperCase()
      : monogram(name);

  return {
    name,
    accent,
    accentDeep: safeHex(b.accent_deep) ?? darken(accent),
    logo,
    mark,
    custom: accent !== AVENTARY_ACCENT || Boolean(logo)
  };
}

/**
 * The custom properties a brand contributes, as a style object.
 *
 * Only these four names are dynamic. Everything else in the document comes from
 * the static stylesheet, so a brand can restyle the accent and nothing else —
 * which is the guarantee that makes accepting colour from a database safe.
 */
export function brandStyle(brand: DocBrand): Record<string, string> {
  return {
    "--accent": brand.accent,
    "--accent-2": brand.accentDeep,
    // A tint for backgrounds. color-mix keeps it correct for any accent without
    // shipping a second colour per client; the fallback below it is Aventary's
    // own soft teal, which is right for the default and acceptable for the rest.
    "--accent-soft": `color-mix(in srgb, ${brand.accent} 13%, ${PALETTE.surface})`,
    "--accent-line": `color-mix(in srgb, ${brand.accent} 34%, ${PALETTE.rule})`
  };
}
