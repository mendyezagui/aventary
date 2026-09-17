/**
 * The two `next/navigation` hooks the Tehillim route uses, backed by the hash.
 *
 * The app has exactly two screens — the home and the reader — and the reader
 * reads its mode from the query string. A hash route gives us both without a
 * router dependency, and it keeps working from `file://` inside the app bundle,
 * which a history-based router does not.
 */
import { useEffect, useState } from "react";

function currentHash() {
  return typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "");
}

/** Subscribes a component to hash changes and returns the current hash route. */
export function useHashRoute() {
  const [route, setRoute] = useState(currentHash);
  useEffect(() => {
    const onChange = () => setRoute(currentHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function useRouter() {
  return {
    // The web route pushes absolute paths like `/tehillim/read?mode=day`. Only
    // the part after the last slash matters here, so it is mapped onto the hash.
    push(href: string) {
      const [path, query] = href.split("?");
      const screen = path.replace(/^.*\//, "") || "home";
      window.location.hash = query ? `${screen}?${query}` : screen;
    },
    replace(href: string) {
      this.push(href);
    },
    back() {
      window.history.back();
    },
    forward() {
      window.history.forward();
    },
    refresh() {},
    prefetch() {},
  };
}

export function useSearchParams() {
  const route = useHashRoute();
  return new URLSearchParams(route.split("?")[1] ?? "");
}

export function usePathname() {
  const route = useHashRoute();
  return "/" + route.split("?")[0];
}
