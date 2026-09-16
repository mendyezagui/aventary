"use client";

import { useEffect } from "react";

// Registers the Tehillim service worker at the origin root so it controls the
// whole app (tehillimcircle.com/ and /tehillim/*). No-op where unsupported.
export default function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* registration blocked / offline — ignore */
      });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
