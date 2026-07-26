/** SoFa JCC — Tailwind build config (design system from Stitch) */
module.exports = {
  content: ["./*.html"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-background": "#1b1b1d", "on-secondary-fixed-variant": "#5d4201", "surface": "#fcf8fa",
        "surface-dim": "#dcd9db", "tertiary": "#000000", "warm-oak": "#8B5E3C", "outline": "#76777d",
        "tertiary-fixed": "#e4e2de", "inverse-on-surface": "#f3f0f2", "on-surface-variant": "#45464d",
        "on-primary": "#ffffff", "on-primary-container": "#7c839b", "surface-container-low": "#f6f3f5",
        "surface-variant": "#e4e2e4", "deep-charcoal": "#1E1E1E", "on-tertiary-fixed": "#1b1c1a",
        "inverse-primary": "#bec6e0", "surface-container-highest": "#e4e2e4", "on-secondary": "#ffffff",
        "background": "#fcf8fa", "on-tertiary-fixed-variant": "#474744", "secondary": "#775a19",
        "on-error": "#ffffff", "secondary-fixed-dim": "#e9c176", "on-primary-fixed-variant": "#3f465c",
        "on-secondary-container": "#785a1a", "tertiary-fixed-dim": "#c8c6c3", "surface-container-high": "#eae7e9",
        "inverse-surface": "#303032", "on-error-container": "#93000a", "soft-cream": "#F9F6F0",
        "surface-container-lowest": "#ffffff", "outline-variant": "#c6c6cd", "surface-bright": "#fcf8fa",
        "on-secondary-fixed": "#261900", "primary-fixed-dim": "#bec6e0", "sage-status": "#4A6741",
        "tertiary-container": "#1b1c1a", "on-primary-fixed": "#131b2e", "on-tertiary-container": "#848481",
        "surface-container": "#f0edef", "secondary-container": "#fed488", "on-tertiary": "#ffffff",
        "error": "#ba1a1a", "primary": "#000000", "on-surface": "#1b1b1d", "surface-tint": "#565e74",
        "primary-container": "#131b2e", "primary-fixed": "#dae2fd", "secondary-fixed": "#ffdea5",
        "error-container": "#ffdad6"
      },
      borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
      spacing: {
        "section-gap": "4rem", "stack-lg": "2.25rem", "container-max": "1280px", "stack-sm": "0.5rem",
        "stack-md": "1.5rem", "margin-mobile": "1rem", "gutter": "2rem"
      },
      fontFamily: {
        "label-caps": ["Inter", "sans-serif"], "headline-sm": ["Playfair Display", "serif"],
        "body-md": ["Inter", "sans-serif"], "display-lg": ["Playfair Display", "serif"],
        "button": ["Inter", "sans-serif"], "headline-md": ["Playfair Display", "serif"],
        "display-lg-mobile": ["Playfair Display", "serif"], "body-lg": ["Inter", "sans-serif"]
      },
      fontSize: {
        "label-caps": ["12px", { lineHeight: "1", letterSpacing: "0.1em", fontWeight: "600" }],
        "headline-sm": ["24px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "button": ["14px", { lineHeight: "1", letterSpacing: "0.02em", fontWeight: "500" }],
        "headline-md": ["32px", { lineHeight: "1.3", fontWeight: "600" }],
        "display-lg-mobile": ["36px", { lineHeight: "1.2", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }]
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};
