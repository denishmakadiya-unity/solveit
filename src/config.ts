// Global site configuration and launch feature flags.
// Runtime overrides come from /api/config (admin-controlled), see lib/flags.ts.

export const SITE = {
  name: "SolveIt",
  tagline: "Your Problem. Our Tools.",
  url: "https://getsolveit.com", // overridden at build time by the SITE_URL env var
  description:
    "Describe your task in simple words. SolveIt finds the right tools and builds the fastest solution — PDF, image, text, developer and calculator tools that run in your browser.",
  supportEmail: "support@getsolveit.com",
  twitter: "",
};

// Google AdSense publisher ID, e.g. "ca-pub-1234567890123456".
// Paste yours here; the build adds the AdSense code + verification tag to every page and writes ads.txt.
export const ADSENSE_CLIENT = "";

export type FeatureFlags = {
  adsEnabled: boolean;
  subscriptionEnabled: boolean;
  aiCreditsEnabled: boolean;
  affiliateEnabled: boolean;
  businessPlansEnabled: boolean;
  accountsEnabled: boolean;
  mandatoryLogin: boolean;
  aiEnabled: boolean;
  analyticsEnabled: boolean;
};

export const DEFAULT_FLAGS: FeatureFlags = {
  adsEnabled: true,
  subscriptionEnabled: false,
  aiCreditsEnabled: false,
  affiliateEnabled: false,
  businessPlansEnabled: false,
  accountsEnabled: false,
  mandatoryLogin: false,
  aiEnabled: true, // AI tools use the server only when an API key is configured; otherwise they run in on-device mode
  analyticsEnabled: true,
};

export const LIMITS = {
  imageMaxMB: 40,
  pdfMaxMB: 100,
  textMaxChars: 2_000_000,
  maxFiles: 50,
};
