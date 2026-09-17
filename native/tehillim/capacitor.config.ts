import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Unlike Carpool Circle, this app does NOT point at a server: `webDir` is the
 * built bundle, so the whole of Tehillim — text, daily portion, saved Psalms —
 * opens with the phone in airplane mode. That is the reason the app exists
 * alongside the website, and the reason it is not a wrapped web page.
 */
const config: CapacitorConfig = {
  appId: "com.tehillimcircle.app",
  appName: "Tehillim",
  webDir: "dist",
  ios: {
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: true,
  },
};

export default config;
