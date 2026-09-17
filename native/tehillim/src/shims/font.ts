/**
 * Stands in for `next/font/google`.
 *
 * Next downloads these at build time and hands back a generated class name. The
 * app has to work with no network at all, so the two Hebrew faces are bundled
 * as woff2 in `public/fonts` and declared in `fonts.css`; this shim only has to
 * return the CSS variable names that `fonts.ts` composes into `fontVars`.
 */
type FontResult = { variable: string; className: string; style: { fontFamily: string } };

function font(variable: string, family: string): FontResult {
  return { variable, className: variable, style: { fontFamily: family } };
}

export function Frank_Ruhl_Libre(_options?: unknown): FontResult {
  return font("font-hebrew", "'Frank Ruhl Libre'");
}

export function Assistant(_options?: unknown): FontResult {
  return font("font-sans-hebrew", "'Assistant'");
}
