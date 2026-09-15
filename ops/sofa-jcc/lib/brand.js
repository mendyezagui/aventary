// SoFa JCC brand — the single locked source of truth for anything the
// associate draws.
//
// These values are NOT invented. The palette is sampled directly from the
// shul's own logo artwork (public/sofa-jcc/brand/logo-lockup-original.png) and
// the layout language is taken from the real Friday-night speaker flyer.
// Change them HERE, nowhere else.

export const BRAND = {
  // The shul's actual name. "The SoFa" is how it is known publicly; Beis
  // Chacham Yitzchak is what goes at the top of a flyer.
  name: "Beis Chacham Yitzchak",
  nameHe: "בית חכם יצחק",
  publicName: "The SoFa Jewish Community Center",
  shortName: "SoFa JCC",
  kicker: "Jewish Community Center",
  tagline: "Pray · Celebrate · Love · Friendship",
  site: "www.sofajcc.org",
  url: "https://www.sofajcc.org",
  city: "Los Angeles",
  // Placed top-right on every flyer, as on the shul's own.
  bh: 'ב"ה',
  shabbosGreeting: { he: "שבת שלום", en: "Good Shabbos" },
};

// Sampled from the logo artwork. Do not eyeball replacements.
export const COLORS = {
  navy: "#1c374a",       // the logo navy — rules, footer bar, body copy
  navyDeep: "#16293d",   // headings, the big display name
  navySoft: "#293c4b",   // the seated figures; secondary text
  gold: "#b79549",       // eyebrows, dividers, labels  (sampled from the sofa)
  goldLight: "#dcb96d",  // the dancer's disc; accents on navy
  olive: "#8f8f5a",      // the sofa's back panel; rare accent
  maroon: "#8b2635",     // section eyebrows and the emphasised phrase
  cream: "#f5edda",      // the parchment ground
  cream2: "#efe4cc",     // detail strip, subtle fills
  line: "#ddd0b4",       // hairlines on cream
  ink: "#1f2a33",
  muted: "#5c6470",
  white: "#ffffff",
};

// The house pairing: a serif for everything that carries weight, a system
// sans only for small uppercase labels. Both stacks stay web-safe because
// flyers render headless — a webfont that fails to load is a flyer that
// ships in the wrong typeface.
export const FONTS = {
  display: `"Georgia", "Times New Roman", "Liberation Serif", serif`,
  hebrew: `"Times New Roman", "Frank Ruehl CLM", "David", "FreeSerif", serif`,
  sans: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Liberation Sans", Helvetica, Arial, sans-serif`,
};

// Logo files live in public/ and are referenced by URL so the browser preview
// and the headless renderer resolve them identically.
export const LOGO = {
  lockup: "/sofa-jcc/brand/logo-lockup.png",   // sofa + wordmark, transparent
  mark: "/sofa-jcc/brand/logo-mark.png",       // sofa only, transparent
  dancer: "/sofa-jcc/brand/mark-dancer.png",   // gold-disc dancing chassid
};

/** Absolute URL for the headless renderer, which has no page origin. */
export const logoUrl = (key = "lockup", origin = "") =>
  `${origin || ""}${LOGO[key] || LOGO.lockup}`;

// Flyer canvas sizes. Letter is the default: the shul's own flyers are
// portrait sheets that get both printed and sent to WhatsApp.
export const CANVAS = {
  letter:   { w: 1275, h: 1650, label: "Letter @150dpi — print + WhatsApp (default)" },
  portrait: { w: 1080, h: 1350, label: "Portrait 4:5 — Instagram feed" },
  story:    { w: 1080, h: 1920, label: "Story 9:16 — status / reels" },
  square:   { w: 1080, h: 1080, label: "Square 1:1 — WhatsApp forward" },
};

// Locked rules, asserted in templates.js rather than merely documented.
export const RULES = {
  logoAlwaysPresent: true,
  bhAlwaysPresent: true,
  maxHeadlineChars: 34,
  maxSubheadChars: 92,
  requireFooter: true,
  allowedTemplates: ["speaker", "holiday", "weekly", "schedule", "guide", "card", "label"],
};
