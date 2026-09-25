import type { TemplateCategoryId } from "./types";
import { WORKFLOWS } from "./workflows";

export type TemplateCategory = { id: TemplateCategoryId; name: string; icon: string; intro: string; tools: string[] };

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: "students", name: "Students", icon: "graduation", intro: "Assignments, exam forms and study notes — sized and formatted the way portals expect.",
    tools: ["jpg-to-pdf", "compress-pdf", "word-counter", "pdf-text-extractor", "age-calculator"] },
  { id: "business", name: "Business", icon: "briefcase", intro: "Product photos, invoices, pricing and reports for small businesses and freelancers.",
    tools: ["gst-calculator", "profit-margin-calculator", "roi-calculator", "discount-calculator", "merge-pdf"] },
  { id: "developers", name: "Developers", icon: "code", intro: "JSON clean-up, encoding, IDs and web-ready assets.",
    tools: ["json-formatter", "json-validator", "base64", "uuid-generator", "hash-generator"] },
  { id: "creators", name: "Creators", icon: "camera", intro: "Thumbnails, covers and blog images at the exact sizes each platform wants.",
    tools: ["image-resizer", "image-cropper", "image-compressor", "background-remover", "ai-rewriter"] },
  { id: "social-media", name: "Social Media", icon: "instagram", intro: "Perfectly sized posts, stories, covers and captions for every network.",
    tools: ["image-cropper", "image-resizer", "word-counter", "qr-code-generator"] },
  { id: "personal", name: "Personal", icon: "user", intro: "Everyday tasks: share photos privately, send documents, plan loans and keep passwords strong.",
    tools: ["emi-calculator", "password-generator", "image-metadata-remover", "unit-converter"] },
  { id: "documents", name: "Documents", icon: "file-text", intro: "Scans, forms, signatures and PDFs that meet upload limits the first time.",
    tools: ["compress-pdf", "jpg-to-pdf", "split-pdf", "merge-pdf", "image-compressor"] },
];

export const templateCategoryById = (id: string) => TEMPLATE_CATEGORIES.find((c) => c.id === id);
export const workflowsForAudience = (id: TemplateCategoryId) => WORKFLOWS.filter((w) => w.audience.includes(id));
