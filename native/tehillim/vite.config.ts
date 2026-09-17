import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// The app's source of truth is the web route in ../../app/tehillim. Nothing is
// copied here: this build imports those files directly and swaps the three
// Next-only pieces (font loader, router, search params) for local shims, so the
// website and the iOS app can never drift apart.
export default defineConfig({
  base: "./",
  resolve: {
    alias: [
      {
        find: "next/font/google",
        replacement: fileURLToPath(new URL("./src/shims/font.ts", import.meta.url)),
      },
      {
        find: "@/lib/supabase/client",
        replacement: fileURLToPath(new URL("./src/shims/supabase.ts", import.meta.url)),
      },
      {
        find: "next/navigation",
        replacement: fileURLToPath(new URL("./src/shims/navigation.ts", import.meta.url)),
      },
    ],
  },
  // `account.ts` gates every network feature on these two being set. The app
  // ships them empty, which is what makes it an offline Tehillim rather than a
  // client for the website.
  define: {
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(""),
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(""),
  },
  plugins: [react()],
  build: { outDir: "dist", assetsInlineLimit: 0 },
});
