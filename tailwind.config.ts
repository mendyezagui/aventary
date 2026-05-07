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
        // Material 3 inspired Aventary palette
        primary: "#584cc4",
        "primary-fixed": "#e4dfff",
        "primary-fixed-dim": "#c5c0ff",
        "primary-container": "#8f85ff",
        "on-primary": "#ffffff",
        "on-primary-container": "#240992",
        "on-primary-fixed": "#150067",
        "on-primary-fixed-variant": "#4032ab",
        secondary: "#5f5e5e",
        "on-secondary": "#ffffff",
        "secondary-container": "#e4e2e1",
        tertiary: "#5f5e5e",
        "tertiary-container": "#969494",
        background: "#fcf9f8",
        surface: "#fcf9f8",
        "surface-bright": "#fcf9f8",
        "surface-dim": "#dcd9d9",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f6f3f2",
        "surface-container": "#f0eded",
        "surface-container-high": "#eae7e7",
        "surface-container-highest": "#e5e2e1",
        "surface-variant": "#e5e2e1",
        "on-surface": "#1c1b1b",
        "on-surface-variant": "#474553",
        "on-background": "#1c1b1b",
        "inverse-surface": "#313030",
        "inverse-on-surface": "#f3f0ef",
        "inverse-primary": "#c5c0ff",
        outline: "#787585",
        "outline-variant": "#c8c4d5"
      },
      fontFamily: {
        headline: ["var(--font-headline)", "Space Grotesk", "sans-serif"],
        body: ["var(--font-body)", "Inter", "sans-serif"],
        label: ["var(--font-headline)", "Space Grotesk", "sans-serif"]
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      maxWidth: { site: "1500px" }
    }
  },
  plugins: []
} satisfies Config;
