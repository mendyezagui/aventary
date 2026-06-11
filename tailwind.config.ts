import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Aventary brand palette — near-black + gold + off-white
        primary: "#C9A66B",           // gold — for dark grounds, fills, CTAs
        "primary-fixed": "#efe6d4",    // light gold tint (chips on light)
        "primary-fixed-dim": "#e3d4b3",
        "primary-container": "#C9A66B",
        "on-primary": "#0B0B0B",       // ink text on gold
        "on-primary-container": "#4a3a14",
        "on-primary-fixed": "#4a3a14",
        "on-primary-fixed-variant": "#6b5320",
        accent: "#7d6121",             // deep bronze — gold-family text accent on light (passes contrast)
        ink: "#0B0B0B",                // true brand black for dark sections/footer
        secondary: "#6B6B6B",
        "on-secondary": "#ffffff",
        "secondary-container": "#ECE9E1",
        tertiary: "#6B6B6B",
        "tertiary-container": "#9b9b9b",
        background: "#F7F7F7",
        surface: "#F7F7F7",
        "surface-bright": "#ffffff",
        "surface-dim": "#e6e3da",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2efe7",
        "surface-container": "#ECE9E1",
        "surface-container-high": "#E6E3DA",
        "surface-container-highest": "#E0DCD2",
        "surface-variant": "#E0DCD2",
        "on-surface": "#1A1A1A",
        "on-surface-variant": "#6B6B6B",
        "on-background": "#1A1A1A",
        "inverse-surface": "#0B0B0B",
        "inverse-on-surface": "#F7F7F7",
        "inverse-primary": "#C9A66B",
        outline: "#9a968c",
        "outline-variant": "#d8d4cb"
      },
      fontFamily: {
        headline: ["var(--font-headline)", "Fraunces", "Georgia", "serif"],
        body: ["var(--font-body)", "Hanken Grotesk", "Inter", "sans-serif"],
        label: ["var(--font-body)", "Hanken Grotesk", "sans-serif"]
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      maxWidth: { site: "1500px" }
    }
  },
  plugins: []
} satisfies Config;
