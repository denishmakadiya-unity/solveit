import type { Category, CategoryId } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "pdf", slug: "pdf-tools", name: "PDF & Documents", short: "Compress, merge, split and convert PDFs.", icon: "file-text",
    intro: "Everything you need to get a PDF ready to send, print or submit. Every PDF tool runs in your browser, so your documents never leave your device.",
    faq: [
      { q: "Are my PDFs uploaded to a server?", a: "No. All PDF tools on SolveIt process files locally in your browser using JavaScript. Nothing is uploaded." },
      { q: "Is there a file size limit?", a: "You can process PDFs up to 100 MB. Very large files depend on your device's memory." },
    ],
  },
  {
    id: "image", slug: "image-tools", name: "Image", short: "Compress, resize, convert and clean photos.", icon: "image",
    intro: "Get any photo ready for a website, Instagram, WhatsApp or an online form. Resize, crop, convert, compress and strip hidden metadata — all on your device.",
    faq: [
      { q: "Which formats are supported?", a: "JPG, PNG and WebP work everywhere. GIF, BMP and AVIF work as input when your browser can read them." },
      { q: "Will compression reduce quality?", a: "Slightly, but you control the quality. At 75–85% most people can't see a difference, while the file gets much smaller." },
    ],
  },
  {
    id: "text", slug: "text-tools", name: "Text & Writing", short: "Count, clean, convert and compare text.", icon: "type",
    intro: "Fast helpers for writers, students and anyone who pastes text between apps: count words, fix capitalization, clean messy formatting and compare two versions.",
    faq: [{ q: "Is my text stored?", a: "No. Text tools run entirely in your browser and nothing you type is sent anywhere." }],
  },
  {
    id: "calculators", slug: "calculators", name: "Calculators", short: "EMI, GST, age, percentage and more.", icon: "calculator",
    intro: "Accurate everyday calculators with clear breakdowns — loan EMIs, GST, discounts, percentages, age and unit conversions.",
    faq: [{ q: "How accurate are the results?", a: "Calculations use standard formulas with full precision and are rounded only for display. For financial decisions, confirm final figures with your bank or accountant." }],
  },
  {
    id: "developer", slug: "developer-tools", name: "Developer", short: "JSON, Base64, UUID and QR codes.", icon: "code",
    intro: "Small, dependable utilities for developers: format and validate JSON, encode Base64, generate UUIDs and QR codes — with no data leaving the page.",
    faq: [{ q: "Can I paste sensitive data such as API responses?", a: "Yes. Developer tools run locally in your browser and never send your input to a server." }],
  },
  {
    id: "security", slug: "security-tools", name: "Security", short: "Passwords and hashes.", icon: "shield-check",
    intro: "Create strong passwords, check how strong an existing one is and generate file or text hashes. All randomness comes from your browser's cryptographic generator.",
    faq: [{ q: "Do you see the passwords I generate or check?", a: "No. Generation and checking happen on your device. Passwords are never transmitted or stored." }],
  },
  {
    id: "business", slug: "business-tools", name: "Business & Data", short: "Margins, ROI and CSV/JSON conversion.", icon: "briefcase",
    intro: "Quick numbers and data conversions for small businesses and analysts: profit margin, markup, ROI, and clean conversion between CSV and JSON.",
    faq: [{ q: "Can I convert large CSV files?", a: "Yes. Files of several megabytes convert in seconds in the browser." }],
  },
  {
    id: "ai", slug: "ai-tools", name: "AI Writing", short: "Summarize, rewrite and draft emails.", icon: "sparkles",
    intro: "Writing helpers that summarize long text, rewrite in a different tone and draft emails. They work on-device by default, and use secure server AI when it is enabled.",
    faq: [
      { q: "Is my text sent to an AI provider?", a: "Only when you choose AI mode and it is available. On-device mode never sends your text anywhere. The page always shows which mode is active." },
    ],
  },
];

export const categoryById = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;
export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
