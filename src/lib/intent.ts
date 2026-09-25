// Local, deterministic intent engine. Understands English, Hindi, Hinglish and Gujarati
// (romanized and native script) without calling any AI service.
import { toolById, toolHref } from "../registry/tools";
import { workflowBySlug } from "../registry/workflows";

type Concept = string;

// concept -> synonyms. Latin entries match on word boundaries; Indic-script entries match as substrings.
const LEX: Record<Concept, string[]> = {
  pdf: ["pdf", "pdfs", "पीडीएफ", "પીડીએફ", "document", "doc", "documents", "dastavej"],
  image: ["image", "images", "photo", "photos", "pic", "pics", "picture", "pictures", "img", "foto", "tasveer", "tasvir", "chitra", "fotu", "फोटो", "तस्वीर", "इमेज", "ફોટો", "છબી", "ઈમેજ", "selfie", "screenshot", "jpg", "jpeg", "png", "webp"],
  small: ["small", "smaller", "compress", "compression", "reduce", "shrink", "size", "kb", "mb", "chhota", "chota", "choti", "chhoti", "kam", "kum", "ghatana", "ochhu", "ochhi", "ochu", "nanu", "nani", "nano", "lightweight", "light", "optimize", "optimise", "छोटा", "कम", "साइज", "નાની", "નાનું", "ઓછું", "ઓછી", "સાઇઝ", "too large", "too big", "heavy", "bada", "motu", "moti", "large"],
  resize: ["resize", "dimension", "dimensions", "pixel", "pixels", "px", "width", "height", "scale", "bada karna", "lambai"],
  crop: ["crop", "cut", "trim image", "square", "katna", "kaatna", "kapvu"],
  convert: ["convert", "conversion", "change format", "badlo", "badalna"],
  merge: ["merge", "combine", "join", "together", "jodna", "jodo", "ek karna", "ek sath", "ek saath", "bhegu", "bhega", "one file", "single pdf", "multiple pdf", "several pdf", "जोड़", "જોડ"],
  split: ["split", "separate", "extract page", "extract pages", "alag", "alg", "juda", "judu", "specific pages", "some pages"],
  whatsapp: ["whatsapp", "whats app", "wa", "watsapp", "whatsap", "व्हाट्सएप", "વોટ્સએપ"],
  email: ["email", "e-mail", "gmail", "outlook", "mail", "attachment", "attach"],
  website: ["website", "web", "site", "blog", "wordpress", "shopify", "webpage", "seo", "vebsite"],
  instagram: ["instagram", "insta", "ig", "reel", "reels"],
  story: ["story", "stories", "status", "9:16", "vertical"],
  youtube: ["youtube", "yt"],
  linkedin: ["linkedin"],
  facebook: ["facebook", "fb"],
  twitter: ["twitter", "x header"],
  product: ["product", "products", "amazon", "flipkart", "meesho", "ecommerce", "e-commerce", "listing", "catalog", "shop", "store"],
  passport: ["passport", "visa", "35x45", "id photo"],
  form: ["form", "exam", "application", "portal", "sarkari", "govt", "government", "upload", "ssc", "upsc", "bank exam", "job form", "admit"],
  signature: ["signature", "sign", "hastakshar", "sahi", "सिग्नेचर", "हस्ताक्षर", "સહી"],
  background: ["background", "bg", "backdrop", "piche", "peeche", "पृष्ठभूमि", "બેકગ્રાઉન્ડ"],
  remove: ["remove", "delete", "hatana", "hatao", "nikalo", "nikalna", "kadhvu", "kadho", "erase", "without"],
  transparent: ["transparent", "no background", "png logo"],
  logo: ["logo"],
  metadata: ["metadata", "exif", "gps", "location", "private", "privacy", "hidden data"],
  text: ["text", "words", "paragraph", "content", "lines", "likhai", "shabd", "शब्द", "ટેક્સ્ટ", "essay", "article"],
  count: ["count", "counter", "how many words", "ginti", "ginna", "kitne shabd", "length", "characters", "character"],
  casechg: ["uppercase", "lowercase", "capital", "caps", "title case", "sentence case", "camelcase", "snake case", "case"],
  clean: ["clean", "cleanup", "tidy", "extra spaces", "line breaks", "messy", "saaf", "saf", "fix"],
  compare: ["compare", "difference", "diff", "farak", "fark", "antar", "tulna", "changes between"],
  emi: ["emi", "loan", "installment", "instalment", "kist", "hapto", "hapta", "હપ્તો", "किस्त", "ईएमआई", "home loan", "car loan", "personal loan"],
  gst: ["gst", "tax", "cgst", "sgst", "igst", "जीएसटी"],
  discount: ["discount", "sale", "off", "coupon", "chhoot", "chhut", "chut", "offer"],
  percent: ["percent", "percentage", "%", "pratishat", "taka", "टका", "प्रतिशत"],
  age: ["age", "umar", "umr", "ummar", "janm", "birth", "birthday", "dob", "date of birth", "umra", "उम्र", "ઉંમર", "janmdin"],
  unit: ["unit", "units", "cm", "inch", "inches", "kg", "lbs", "pound", "celsius", "fahrenheit", "meter", "feet", "foot", "gaj", "bigha", "acre", "km", "miles", "liters", "litre"],
  json: ["json", "api", "payload"],
  validate: ["validate", "valid", "check", "error", "errors", "lint", "broken"],
  minify: ["minify", "minified", "compact", "one line"],
  pretty: ["format", "pretty", "beautify", "indent", "readable"],
  base64: ["base64", "base 64", "encode", "decode", "data uri"],
  uuid: ["uuid", "guid", "unique id", "random id"],
  qr: ["qr", "qrcode", "qr code", "scan code", "upi qr", "barcode"],
  password: ["password", "passwords", "passcode", "pass", "पासवर्ड", "પાસવર્ડ"],
  strength: ["strong", "strength", "weak", "secure", "safe", "majboot", "mazboot"],
  generate: ["generate", "generator", "create", "make", "banao", "banana", "banavo", "new"],
  hash: ["hash", "sha", "sha256", "sha-256", "md5", "checksum"],
  margin: ["margin", "markup", "profit", "munafa", "nafa", "labh", "selling price", "cost price"],
  roi: ["roi", "return on investment", "returns", "investment", "cagr", "nivesh"],
  csv: ["csv", "excel", "spreadsheet", "sheet", "sheets", "xls"],
  summarize: ["summarize", "summarise", "summary", "tldr", "short version", "saar", "saransh", "key points", "gist"],
  rewrite: ["rewrite", "paraphrase", "rephrase", "formal", "polish", "improve writing", "better words", "professional tone"],
  writeemail: ["write email", "email draft", "draft email", "write mail", "mail likho", "email likho", "leave application", "follow up email", "compose"],
  scan: ["scan", "scanned", "notes", "handwritten", "camscanner", "pages photo"],
  assignment: ["assignment", "homework", "classroom", "submit"],
  thumbnail: ["thumbnail", "thumb", "preview"],
  print: ["print", "printing", "printer", "4x6"],
  wallpaper: ["wallpaper", "lock screen", "background image"],
  receipt: ["receipt", "receipts", "bill", "bills", "invoice", "expense"],
  topdf: ["to pdf", "into pdf", "as pdf", "make pdf", "create pdf", "pdf banana", "pdf banao", "pdf ma", "pdf me", "pdf mein"],
  toimage: ["to jpg", "to image", "to png", "as image", "into image", "pdf to photo", "jpg ma", "image me"],
  extract: ["extract", "copy text", "get text", "read text", "text nikalo", "text from"],
  dp: ["dp", "profile", "avatar", "display picture", "profile pic"],
  webp: ["webp"],
  jpgfmt: ["jpg", "jpeg"],
  pngfmt: ["png"],
  slug: ["slug", "permalink", "url"],
  duplicates: ["duplicate", "duplicates", "unique", "dedupe", "repeated"],
  unsupported: ["heic", "heif", "docx", "word to pdf", "pdf to word", "pptx", "ppt", "powerpoint", "video", "mp4", "mp3", "audio", "ocr", "translate", "excel to pdf", "edit pdf", "sign pdf", "unlock pdf", "protect pdf", "password protect", "watermark", "rotate pdf", "gif", "svg to png"],
  calculate: ["calculate", "calculator", "calc", "nikalo", "kitna", "kitni", "ketlu", "ketli", "ketla", "how much"],
};

type Intent = {
  id: string; goal: string; all: Concept[]; any?: Concept[]; none?: Concept[];
  tool?: string; workflow?: string; expected: string; weight?: number;
};

// Ordered from most to least specific. Scores decide the final winner.
const INTENTS: Intent[] = [
  // PDF
  { id: "pdf-whatsapp", goal: "Make your PDF small enough for WhatsApp", all: ["pdf", "whatsapp"], any: ["small"], tool: "compress-pdf", workflow: "whatsapp-ready-pdf", expected: "A PDF under 2 MB that opens quickly on phones." },
  { id: "pdf-email", goal: "Fit your PDF under email attachment limits", all: ["pdf", "email"], any: ["small"], none: ["writeemail"], tool: "compress-pdf", workflow: "email-ready-pdf", expected: "A PDF under 10 MB, quality kept where possible." },
  { id: "pdf-portal", goal: "Compress a PDF for an upload portal", all: ["pdf", "form"], any: ["small"], tool: "compress-pdf", workflow: "govt-portal-pdf", expected: "A PDF under 200 KB for strict upload limits." },
  { id: "pdf-merge-compress", goal: "Combine PDFs into one small file", all: ["pdf", "merge", "small"], tool: "merge-pdf", workflow: "merge-and-compress-pdf", expected: "One compressed PDF with all pages in order." },
  { id: "pdf-merge", goal: "Combine several PDFs into one", all: ["pdf", "merge"], tool: "merge-pdf", workflow: "merge-and-compress-pdf", expected: "A single PDF with all files in your chosen order." },
  { id: "pdf-small", goal: "Reduce your PDF file size", all: ["pdf", "small"], tool: "compress-pdf", workflow: "pdf-under-1mb", expected: "A smaller PDF — choose lossless, balanced or strong compression." },
  { id: "pdf-split", goal: "Extract pages from your PDF", all: ["pdf", "split"], none: ["image", "toimage", "scan", "topdf"], tool: "split-pdf", workflow: "extract-first-pages", expected: "A new PDF with only the pages you need." },
  { id: "pdf-to-image", goal: "Turn PDF pages into images", all: ["pdf", "toimage"], tool: "pdf-to-jpg", workflow: "pdf-pages-to-images", expected: "One JPG per page." },
  { id: "pdf-to-image2", goal: "Turn PDF pages into images", all: ["pdf", "image", "convert"], none: ["topdf"], tool: "pdf-to-jpg", workflow: "pdf-pages-to-images", expected: "One JPG per page.", weight: -1 },
  { id: "pdf-text", goal: "Copy the text out of your PDF", all: ["pdf", "extract"], tool: "pdf-text-extractor", workflow: "pdf-to-clean-text", expected: "Clean, copyable text from every page." },
  { id: "pdf-text2", goal: "Copy the text out of your PDF", all: ["pdf", "text"], none: ["small", "merge"], tool: "pdf-text-extractor", workflow: "pdf-to-clean-text", expected: "Clean, copyable text from every page.", weight: -1 },
  { id: "print-pdf", goal: "Prepare a document for printing", all: ["pdf", "print"], tool: "compress-pdf", workflow: "print-ready-document", expected: "A print-quality optimized PDF." },
  { id: "assignment", goal: "Submit handwritten pages as one PDF", all: ["assignment"], tool: "jpg-to-pdf", workflow: "student-assignment-pdf", expected: "One A4 PDF under 5 MB." },
  { id: "scan-pdf", goal: "Turn scans or photos into a PDF", all: ["scan"], tool: "jpg-to-pdf", workflow: "scan-to-pdf", expected: "One compact A4 PDF." },
  { id: "receipts", goal: "Bundle receipts into a PDF", all: ["receipt"], none: ["gst"], tool: "jpg-to-pdf", workflow: "receipts-to-pdf", expected: "One PDF with a page per receipt." },
  { id: "img-to-pdf", goal: "Convert images to a PDF", all: ["image", "topdf"], tool: "jpg-to-pdf", workflow: "scan-to-pdf", expected: "A single PDF made from your images." },
  { id: "img-to-pdf2", goal: "Convert images to a PDF", all: ["image", "pdf", "convert"], none: ["toimage"], tool: "jpg-to-pdf", workflow: "scan-to-pdf", expected: "A single PDF made from your images.", weight: -1 },
  // Image
  { id: "passport", goal: "Make a passport-size photo", all: ["passport"], tool: "image-resizer", workflow: "passport-photo", expected: "413 × 531 px JPG under 200 KB." },
  { id: "signature", goal: "Prepare your signature for an online form", all: ["signature"], tool: "background-remover", workflow: "signature-for-form", expected: "280 × 120 JPG under 20 KB." },
  { id: "exam-photo", goal: "Resize a photo for an exam or job form", all: ["image", "form"], any: ["small"], tool: "image-compressor", workflow: "exam-form-photo", expected: "200 × 230 JPG under 50 KB." },
  { id: "img-website", goal: "Optimize an image for your website", all: ["image", "website"], any: ["small"], tool: "image-compressor", workflow: "website-image", expected: "A fast-loading WebP, typically 70–90% smaller." },
  { id: "website-only", goal: "Optimize images for your website", all: ["website"], any: ["small"], tool: "image-compressor", workflow: "website-image", expected: "A fast-loading WebP, typically 70–90% smaller.", weight: -1 },
  { id: "img-story", goal: "Size a photo for Stories or Status", all: ["story"], tool: "image-cropper", workflow: "instagram-story", expected: "1080 × 1920 JPG that fills the screen." },
  { id: "img-instagram", goal: "Make your image Instagram-ready", all: ["instagram"], tool: "image-cropper", workflow: "instagram-post", expected: "1080 × 1080 JPG, perfectly framed." },
  { id: "img-whatsapp-dp", goal: "Create a WhatsApp profile photo", all: ["dp"], any: ["whatsapp"], tool: "image-cropper", workflow: "whatsapp-dp", expected: "640 × 640 square JPG." },
  { id: "img-whatsapp", goal: "Get a photo ready for WhatsApp", all: ["image", "whatsapp"], any: ["small"], tool: "image-compressor", workflow: "whatsapp-image", expected: "JPG under 400 KB with location data removed." },
  { id: "whatsapp-only", goal: "Get a photo ready for WhatsApp", all: ["whatsapp"], tool: "image-compressor", workflow: "whatsapp-image", expected: "JPG under 400 KB with location data removed.", weight: -2 },
  { id: "youtube", goal: "Create a YouTube thumbnail", all: ["youtube"], tool: "image-resizer", workflow: "youtube-thumbnail", expected: "1280 × 720 JPG under 2 MB." },
  { id: "linkedin", goal: "Make a LinkedIn banner", all: ["linkedin"], tool: "image-resizer", workflow: "linkedin-banner", expected: "1584 × 396 JPG." },
  { id: "facebook", goal: "Make a Facebook cover", all: ["facebook"], tool: "image-resizer", workflow: "facebook-cover", expected: "1640 × 624 JPG." },
  { id: "twitter", goal: "Make an X (Twitter) header", all: ["twitter"], tool: "image-resizer", workflow: "x-header", expected: "1500 × 500 JPG." },
  { id: "product", goal: "Prepare product photos for your store", all: ["product"], tool: "background-remover", workflow: "product-image", expected: "2000 × 2000 JPG on a clean white background." },
  { id: "logo-transparent", goal: "Make your logo background transparent", all: ["logo"], any: ["background", "transparent", "remove"], tool: "background-remover", workflow: "transparent-logo", expected: "Transparent PNG logo." },
  { id: "remove-bg", goal: "Remove the background from an image", all: ["background", "remove"], tool: "background-remover", workflow: "transparent-logo", expected: "A transparent or white-background PNG." },
  { id: "transparent", goal: "Make an image background transparent", all: ["transparent"], tool: "background-remover", expected: "A transparent PNG." },
  { id: "metadata", goal: "Remove hidden location data from photos", all: ["metadata"], tool: "image-metadata-remover", workflow: "private-photo", expected: "Clean photos with no GPS or camera data." },
  { id: "thumbnail", goal: "Create thumbnails", all: ["thumbnail"], none: ["youtube", "pdf"], tool: "image-resizer", workflow: "thumbnail", expected: "400 × 300 WebP thumbnails." },
  { id: "wallpaper", goal: "Fit a photo as wallpaper", all: ["wallpaper"], tool: "image-resizer", workflow: "phone-wallpaper", expected: "Screen-sized JPG." },
  { id: "print-photo", goal: "Prepare photos for printing", all: ["image", "print"], tool: "image-resizer", workflow: "print-photo-4x6", expected: "300 DPI 4×6 JPG." },
  { id: "img-webp", goal: "Convert images to WebP", all: ["image", "webp"], tool: "image-converter", workflow: "website-image", expected: "WebP images, usually 25–35% smaller than JPG." },
  { id: "webp-only", goal: "Convert WebP images", all: ["webp"], tool: "image-converter", workflow: "webp-to-png", expected: "PNG or JPG files that open anywhere.", weight: -2 },
  { id: "img-convert", goal: "Convert image format", all: ["image", "convert"], none: ["pdf", "topdf"], tool: "image-converter", workflow: "png-to-jpg", expected: "Images in the format you need." },
  { id: "img-crop", goal: "Crop your image", all: ["crop"], none: ["pdf"], tool: "image-cropper", expected: "A cropped image at the ratio you choose." },
  { id: "img-resize", goal: "Resize your image", all: ["image", "resize"], tool: "image-resizer", expected: "An image at the exact dimensions you need." },
  { id: "img-small", goal: "Reduce your image file size", all: ["image", "small"], tool: "image-compressor", workflow: "image-under-100kb", expected: "A smaller image at the quality or size you choose." },
  { id: "resize-only", goal: "Resize your image", all: ["resize"], tool: "image-resizer", expected: "An image at the exact dimensions you need.", weight: -2 },
  // Calculators
  { id: "emi", goal: "Calculate your loan EMI", all: ["emi"], tool: "emi-calculator", expected: "Monthly EMI, total interest and a yearly schedule." },
  { id: "gst", goal: "Calculate GST", all: ["gst"], tool: "gst-calculator", expected: "Base price, GST amount and CGST/SGST split." },
  { id: "discount", goal: "Work out a discounted price", all: ["discount"], none: ["gst"], tool: "discount-calculator", expected: "Final price and total savings." },
  { id: "age", goal: "Calculate exact age", all: ["age"], tool: "age-calculator", expected: "Age in years, months and days." },
  { id: "unit", goal: "Convert units", all: ["unit"], none: ["image", "pdf"], tool: "unit-converter", expected: "The converted value and related units." },
  { id: "margin", goal: "Calculate profit margin", all: ["margin"], tool: "profit-margin-calculator", expected: "Margin, markup and profit." },
  { id: "roi", goal: "Calculate return on investment", all: ["roi"], tool: "roi-calculator", expected: "Total ROI and annualized return." },
  { id: "percent", goal: "Calculate a percentage", all: ["percent"], none: ["gst", "discount"], tool: "percentage-calculator", expected: "The percentage answer with formula." },
  // Developer / data
  { id: "json-api", goal: "Make JSON API-ready", all: ["json"], any: ["clean", "minify", "api"], tool: "json-formatter", workflow: "api-ready-json", expected: "Validated, cleaned and minified JSON." },
  { id: "json-validate", goal: "Check if your JSON is valid", all: ["json", "validate"], tool: "json-validator", workflow: "readable-json", expected: "Valid/invalid result with exact error location." },
  { id: "json-minify", goal: "Minify JSON", all: ["json", "minify"], tool: "json-minifier", workflow: "api-ready-json", expected: "The smallest valid JSON." },
  { id: "json-format", goal: "Format JSON so it's readable", all: ["json", "pretty"], tool: "json-formatter", workflow: "readable-json", expected: "Indented, readable JSON." },
  { id: "csv-json", goal: "Convert CSV to JSON", all: ["csv", "json"], tool: "csv-to-json", workflow: "spreadsheet-to-api", expected: "A JSON array of rows." },
  { id: "json-excel", goal: "Open JSON in a spreadsheet", all: ["json", "csv"], any: ["convert"], tool: "json-to-csv", workflow: "json-to-spreadsheet", expected: "A CSV that opens in Excel.", weight: -1 },
  { id: "json-only", goal: "Work with JSON", all: ["json"], tool: "json-formatter", workflow: "api-ready-json", expected: "Formatted and validated JSON.", weight: -2 },
  { id: "csv-only", goal: "Convert spreadsheet data", all: ["csv"], tool: "csv-to-json", workflow: "spreadsheet-to-api", expected: "Clean JSON from your CSV.", weight: -2 },
  { id: "base64", goal: "Encode or decode Base64", all: ["base64"], tool: "base64", expected: "Base64 encoded or decoded output." },
  { id: "uuid", goal: "Generate UUIDs", all: ["uuid"], tool: "uuid-generator", expected: "Random v4 UUIDs." },
  { id: "qr", goal: "Create a QR code", all: ["qr"], tool: "qr-code-generator", expected: "A scannable QR code as PNG or SVG." },
  { id: "pw-check", goal: "Check how strong your password is", all: ["password", "strength"], none: ["generate"], tool: "password-strength-checker", expected: "Strength score, crack time and tips." },
  { id: "pw-gen", goal: "Generate a strong password", all: ["password"], tool: "password-generator", expected: "A strong random password or passphrase." },
  { id: "hash", goal: "Generate a hash or checksum", all: ["hash"], tool: "hash-generator", expected: "MD5 and SHA hashes." },
  { id: "slug", goal: "Create a URL slug", all: ["slug"], none: ["qr"], tool: "case-converter", workflow: "url-slug", expected: "an-seo-friendly-slug" },
  // Text & AI
  { id: "write-email", goal: "Draft an email", all: ["writeemail"], tool: "ai-email-writer", expected: "A structured email with subject line." },
  { id: "summarize", goal: "Summarize text", all: ["summarize"], tool: "ai-text-summarizer", expected: "The key points in a few sentences." },
  { id: "rewrite", goal: "Rewrite text in a better tone", all: ["rewrite"], tool: "ai-rewriter", expected: "A clearer, polished version." },
  { id: "word-count", goal: "Count words and characters", all: ["count"], none: ["image", "pdf"], tool: "word-counter", expected: "Words, characters, sentences and reading time." },
  { id: "duplicates", goal: "Remove duplicate lines", all: ["duplicates"], tool: "text-cleaner", workflow: "dedupe-list", expected: "A list with unique lines only." },
  { id: "case", goal: "Change text case", all: ["casechg"], tool: "case-converter", expected: "Text in the case you choose." },
  { id: "compare", goal: "Compare two texts", all: ["compare"], tool: "text-compare", expected: "Highlighted differences line by line." },
  { id: "text-clean", goal: "Clean up messy text", all: ["text", "clean"], tool: "text-cleaner", workflow: "clean-pasted-text", expected: "Tidy text without extra spaces or broken lines." },
  { id: "clean-only", goal: "Clean up messy text", all: ["clean"], none: ["json", "image", "pdf"], tool: "text-cleaner", workflow: "clean-pasted-text", expected: "Tidy text.", weight: -2 },
  // generic fallbacks
  { id: "pdf-generic", goal: "Work with your PDF", all: ["pdf"], tool: "compress-pdf", expected: "Pick a PDF tool below.", weight: -4 },
  { id: "image-generic", goal: "Work with your image", all: ["image"], tool: "image-compressor", workflow: "website-image", expected: "Pick an image tool below.", weight: -4 },
  { id: "text-generic", goal: "Work with your text", all: ["text"], tool: "word-counter", expected: "Pick a text tool below.", weight: -4 },
];

const hasIndic = (s: string) => /[ऀ-૿]/.test(s);

export function normalize(q: string) {
  return (q || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[“”"'`’‘]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}%:\s.\-x]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RE_CACHE = new Map<string, RegExp>();
function termRe(term: string) {
  let re = RE_CACHE.get(term);
  if (!re) {
    re = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])${escapeRe(term)}(?=$|[^\\p{L}\\p{M}\\p{N}])`, "u");
    RE_CACHE.set(term, re);
  }
  return re;
}

export function detectConcepts(q: string): Set<Concept> {
  const n = normalize(q);
  const found = new Set<Concept>();
  if (!n) return found;
  for (const [concept, terms] of Object.entries(LEX)) {
    for (const term of terms) {
      if (hasIndic(term) ? n.includes(term) : termRe(term).test(n)) { found.add(concept); break; }
    }
  }
  // Numeric size hints like "200kb", "2 mb"
  if (/\d+\s?(kb|mb)\b/.test(n)) found.add("small");
  // "jpg to pdf" style
  if (/\b(jpg|jpeg|png|image|photo|images|photos)s? (to|into|ma|me|mein) pdf\b/.test(n)) found.add("topdf");
  if (/\bpdf (to|into|ma|me|mein) (jpg|jpeg|png|image|images|photo|photos)\b/.test(n)) found.add("toimage");
  return found;
}

export type SolveResult = {
  query: string;
  goal: string;
  intentId: string;
  confidence: "high" | "medium" | "low";
  tool?: { id: string; name: string; href: string; description: string };
  workflow?: { slug: string; name: string; href: string; steps: string[]; output: string };
  expected: string;
  alternatives: { goal: string; href: string; label: string }[];
  concepts: string[];
  sizeHintKB?: number;
  unsupported?: boolean;
};

export function solve(query: string): SolveResult | null {
  const concepts = detectConcepts(query);
  if (!concepts.size) return null;
  const scored: { intent: Intent; score: number }[] = [];
  for (const intent of INTENTS) {
    if (!intent.all.every((c) => concepts.has(c))) continue;
    if (intent.none?.some((c) => concepts.has(c))) continue;
    const anyHits = intent.any?.filter((c) => concepts.has(c)).length || 0;
    if (intent.any && !anyHits && intent.id === "logo-transparent") continue;
    const score = intent.all.length * 10 + anyHits * 4 + (intent.weight || 0) * 3;
    scored.push({ intent, score });
  }
  if (concepts.has("unsupported")) {
    const alt = scored.sort((a, b) => b.score - a.score).slice(0, 3);
    return {
      query, goal: "We don't have a tool for this yet", intentId: "unsupported", confidence: "low", expected:
        "We've recorded this request — the most-requested missing tools are built first.",
      alternatives: alt.map((s) => { const t = s.intent.tool ? toolById(s.intent.tool) : undefined; return t ? { goal: s.intent.goal, href: toolHref(t), label: t.name } : null; })
        .filter(Boolean) as SolveResult["alternatives"],
      concepts: [...concepts], unsupported: true,
    };
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].intent;
  const tool = best.tool ? toolById(best.tool) : undefined;
  const wf = best.workflow ? workflowBySlug(best.workflow) : undefined;
  const n = normalize(query);
  const m = n.match(/(\d+(?:\.\d+)?)\s?(kb|mb)\b/);
  const sizeHintKB = m ? Math.round(parseFloat(m[1]) * (m[2] === "mb" ? 1024 : 1)) : undefined;

  const seen = new Set<string>([best.id]);
  const alternatives: SolveResult["alternatives"] = [];
  for (const s of scored.slice(1)) {
    if (alternatives.length >= 3) break;
    const t = s.intent.tool ? toolById(s.intent.tool) : undefined;
    const w2 = s.intent.workflow ? workflowBySlug(s.intent.workflow) : undefined;
    const key = (w2?.slug || "") + (t?.id || "");
    if (seen.has(key) || (t?.id === tool?.id && (!w2 || w2.slug === wf?.slug)) || (w2 && w2.slug === wf?.slug)) continue;
    seen.add(key);
    if (w2) alternatives.push({ goal: s.intent.goal, href: `/workflows/${w2.slug}`, label: w2.name });
    else if (t) alternatives.push({ goal: s.intent.goal, href: toolHref(t), label: t.name });
  }
  const top = scored[0].score;
  return {
    query,
    goal: best.goal,
    intentId: best.id,
    confidence: top >= 20 ? "high" : top >= 8 ? "medium" : "low",
    tool: tool ? { id: tool.id, name: tool.name, href: toolHref(tool), description: tool.description } : undefined,
    workflow: wf ? { slug: wf.slug, name: wf.name, href: `/workflows/${wf.slug}`, steps: wf.steps.map((s) => s.step), output: wf.output } : undefined,
    expected: best.expected,
    alternatives,
    concepts: [...concepts],
    sizeHintKB,
  };
}

export const EXAMPLE_PROMPTS = [
  "Make PDF smaller",
  "Resize my photo",
  "Convert JPG to PDF",
  "Calculate EMI",
  "Clean my JSON",
  "Create QR code",
];

export const MULTILINGUAL_EXAMPLES = [
  "Make my PDF smaller for WhatsApp",
  "Photo ko website ke liye optimize karna hai",
  "Mare PDF nu size ochhu karvu che",
  "loan ni EMI ketli aavse",
  "Make this image Instagram-ready",
  "photo nani karvi che",
];
