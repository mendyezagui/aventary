// The toggle stamps data-theme on <html>; "system" clears it so the OS
// preference in the stylesheet takes over again.
export function applyTheme(theme: "light" | "dark" | "system"): void {
  try {
    if (theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  } catch {
    /* ignore */
  }
}

/** What the page is actually showing right now, following the OS on "system". */
export function effectiveDark(theme: "light" | "dark" | "system"): boolean {
  if (theme !== "system") return theme === "dark";
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}
