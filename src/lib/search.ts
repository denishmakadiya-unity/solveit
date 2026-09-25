import { TOOLS, toolHref } from "../registry/tools";
import { WORKFLOWS } from "../registry/workflows";
import { GUIDES } from "../registry/guides";
import { CATEGORIES } from "../registry/categories";
import { detectConcepts, normalize, solve } from "./intent";

export const PROBLEMS = [
  { text: "My PDF is too large", href: "/tools/pdf/compress-pdf", tags: ["pdf", "small"] },
  { text: "I need several PDFs together", href: "/tools/pdf/merge-pdf", tags: ["pdf", "merge"] },
  { text: "I only need a few pages from a PDF", href: "/tools/pdf/split-pdf", tags: ["pdf", "split"] },
  { text: "My PDF won't upload to a government portal", href: "/workflows/govt-portal-pdf", tags: ["pdf", "form", "small"] },
  { text: "I have photos of documents and need one PDF", href: "/workflows/scan-to-pdf", tags: ["image", "pdf", "scan", "topdf"] },
  { text: "My photo is too big to upload", href: "/tools/image/image-compressor", tags: ["image", "small", "form"] },
  { text: "My images make my website slow", href: "/workflows/website-image", tags: ["image", "website", "small"] },
  { text: "My photo doesn't fit Instagram", href: "/workflows/instagram-post", tags: ["image", "instagram", "crop"] },
  { text: "I don't want to share my location in photos", href: "/tools/image/image-metadata-remover", tags: ["image", "metadata"] },
  { text: "I need a transparent logo", href: "/workflows/transparent-logo", tags: ["image", "logo", "transparent", "background"] },
  { text: "The exam form says photo must be under 50 KB", href: "/workflows/exam-form-photo", tags: ["image", "form", "small"] },
  { text: "How much EMI will I pay?", href: "/tools/calculators/emi-calculator", tags: ["emi", "calculate"] },
  { text: "What is the price without GST?", href: "/tools/calculators/gst-calculator", tags: ["gst"] },
  { text: "My JSON has an error somewhere", href: "/tools/developer/json-validator", tags: ["json", "validate"] },
  { text: "I need to send spreadsheet data to an API", href: "/workflows/spreadsheet-to-api", tags: ["csv", "json"] },
  { text: "Text copied from a PDF has broken lines", href: "/workflows/fix-pdf-copied-text", tags: ["text", "pdf", "clean"] },
  { text: "I need a strong password", href: "/tools/security/password-generator", tags: ["password", "generate"] },
  { text: "I need a QR code for my UPI or website", href: "/tools/developer/qr-code-generator", tags: ["qr"] },
  { text: "This text is too long to read", href: "/tools/ai/ai-text-summarizer", tags: ["summarize", "text"] },
  { text: "I don't know how to write this email", href: "/tools/ai/ai-email-writer", tags: ["writeemail", "email"] },
];

function scoreText(qTokens: string[], hay: string, weight: number) {
  let s = 0;
  for (const t of qTokens) {
    if (t.length < 2) continue;
    if (hay.includes(t)) s += weight * (hay.startsWith(t) || hay.includes(" " + t) ? 1.3 : 1);
  }
  return s;
}

export type SearchResults = ReturnType<typeof search>;

export function search(query: string) {
  const q = normalize(query);
  const tokens = q.split(" ").filter(Boolean);
  const concepts = detectConcepts(query);
  const intent = solve(query);

  const tools = TOOLS.map((t) => {
    const cat = CATEGORIES.find((c) => c.id === t.category)!;
    let s = scoreText(tokens, t.name.toLowerCase(), 6) + scoreText(tokens, t.keywords.join(" | ").toLowerCase(), 3) +
      scoreText(tokens, t.description.toLowerCase(), 1) + scoreText(tokens, cat.name.toLowerCase(), 2);
    if (q && t.name.toLowerCase().includes(q)) s += 20;
    if (intent?.tool?.id === t.id) s += 25;
    return { item: t, href: toolHref(t), score: s };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);

  const workflows = WORKFLOWS.map((w) => {
    let s = scoreText(tokens, w.name.toLowerCase(), 5) + scoreText(tokens, w.keywords.join(" | "), 3) + scoreText(tokens, w.goal.toLowerCase(), 1);
    if (intent?.workflow?.slug === w.slug) s += 25;
    if (concepts.has("pdf") && w.input === "pdf") s += 2;
    if (concepts.has("image") && w.input === "image") s += 1;
    return { item: w, href: `/workflows/${w.slug}`, score: s };
  }).filter((r) => r.score > 1.5).sort((a, b) => b.score - a.score);

  const problems = PROBLEMS.map((p) => {
    let s = p.tags.filter((t) => concepts.has(t)).length * 3 + scoreText(tokens, p.text.toLowerCase(), 1);
    return { ...p, score: s };
  }).filter((p) => p.score >= 3).sort((a, b) => b.score - a.score);

  const guides = GUIDES.map((g) => ({ item: g, href: `/guides/${g.slug}`, score: scoreText(tokens, (g.title + " " + g.description + " " + g.tag).toLowerCase(), 1) }))
    .filter((g) => g.score >= 1).sort((a, b) => b.score - a.score);

  return {
    query,
    intent,
    tools: tools.slice(0, 12),
    workflows: workflows.slice(0, 8),
    problems: problems.slice(0, 5),
    guides: guides.slice(0, 3),
    empty: !tools.length && !workflows.length && !problems.length && !intent,
  };
}
