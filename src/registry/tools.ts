import type { CategoryId, FAQ, ProcessingMode, ToolDefinition } from "./types";

type Def = {
  id: string; name: string; category: CategoryId; icon: string; description: string; intro: string;
  howTo: string[]; faq: FAQ[]; keywords: string[]; mode?: ProcessingMode; popular?: boolean; featured?: boolean; isNew?: boolean;
  title?: string; next?: ToolDefinition["next"];
};

const t = (d: Def): ToolDefinition => ({
  id: d.id,
  slug: d.id,
  name: d.name,
  category: d.category,
  description: d.description,
  processingMode: d.mode || "client",
  icon: d.icon,
  popular: d.popular,
  featured: d.featured,
  isNew: d.isNew,
  keywords: d.keywords,
  seo: {
    title: d.title || `${d.name} — Free, Private & Fast`,
    description: d.description + (d.mode === "hybrid" ? " Works on-device, with optional AI mode." : " Runs in your browser — no upload, no sign-up."),
    keywords: d.keywords,
  },
  intro: d.intro,
  howTo: d.howTo,
  faq: d.faq,
  next: d.next,
});

export const TOOLS: ToolDefinition[] = [
  // ───────────── PDF ─────────────
  t({
    id: "compress-pdf", name: "Compress PDF", category: "pdf", icon: "shrink", popular: true, featured: true,
    description: "Reduce PDF file size for WhatsApp, email or upload portals — with an optional target size.",
    intro: "Large PDFs bounce off email limits and upload forms. Compress PDF shrinks your document by re-encoding page images at a quality you choose, or by optimizing its internal structure without touching quality.",
    howTo: ["Choose your PDF.", "Pick a compression level or set a target size such as 2 MB.", "Download the smaller PDF."],
    faq: [
      { q: "What is the difference between Lossless and Strong compression?", a: "Lossless rewrites the PDF structure and keeps text selectable. Strong converts every page to an optimized image, which gives the biggest savings — ideal for scanned documents — but text is no longer selectable." },
      { q: "Can I compress a PDF to under 200 KB for a government form?", a: "Yes. Choose Strong, set the target to 200 KB and SolveIt lowers quality step by step until the file fits, when possible." },
      { q: "Is the compressed PDF safe to share?", a: "Yes. It is a standard PDF created on your device." },
    ],
    keywords: ["compress pdf", "reduce pdf size", "pdf smaller", "shrink pdf", "pdf for whatsapp", "pdf under 1mb", "pdf size kam"],
    next: [
      { label: "Email-ready PDF", href: "/workflows/email-ready-pdf" },
      { label: "WhatsApp-ready PDF", href: "/workflows/whatsapp-ready-pdf" },
      { label: "Merge PDF", href: "/tools/pdf/merge-pdf" },
      { label: "Convert PDF to JPG", href: "/tools/pdf/pdf-to-jpg" },
    ],
  }),
  t({
    id: "merge-pdf", name: "Merge PDF", category: "pdf", icon: "combine", popular: true,
    description: "Combine several PDFs into one document in the order you choose.",
    intro: "Put certificates, invoices or assignment pages together into a single, tidy PDF. Drag files into order, then merge — nothing is uploaded.",
    howTo: ["Add two or more PDFs.", "Reorder them with the arrows.", "Merge and download one combined PDF."],
    faq: [
      { q: "Is there a limit on the number of files?", a: "You can merge up to 50 PDFs at once." },
      { q: "Are bookmarks and links kept?", a: "Page content, text and images are kept. Document-level bookmarks from the source files are not carried over." },
    ],
    keywords: ["merge pdf", "combine pdf", "join pdf", "pdf together", "multiple pdf to one"],
    next: [{ label: "Compress PDF", href: "/tools/pdf/compress-pdf" }, { label: "Split PDF", href: "/tools/pdf/split-pdf" }],
  }),
  t({
    id: "split-pdf", name: "Split PDF", category: "pdf", icon: "split",
    description: "Extract pages or split a PDF into separate files by page range.",
    intro: "Pull out just the pages you need, or break a long PDF into single pages. Use ranges like 1-3, 5, 8-10.",
    howTo: ["Choose a PDF.", "Type page ranges or choose ‘Every page’.", "Download the extracted PDF or a ZIP of all parts."],
    faq: [{ q: "How do I write page ranges?", a: "Separate ranges with commas: 1-3, 5, 9-12. Each range becomes its own file when you pick ‘Each range as a file’." }],
    keywords: ["split pdf", "extract pages", "separate pdf pages", "pdf pages alag"],
    next: [{ label: "Merge PDF", href: "/tools/pdf/merge-pdf" }, { label: "PDF to JPG", href: "/tools/pdf/pdf-to-jpg" }],
  }),
  t({
    id: "jpg-to-pdf", name: "JPG to PDF", category: "pdf", icon: "file-image", popular: true,
    description: "Turn photos and scans into a single PDF with A4 or fit-to-image pages.",
    intro: "Convert phone photos of notes, receipts or documents into one clean PDF. Choose page size, orientation and margins.",
    howTo: ["Add one or more images (JPG, PNG, WebP).", "Choose page size and margin.", "Create and download your PDF."],
    faq: [{ q: "Can I convert PNG or WebP too?", a: "Yes. Any image your browser can open is converted." }],
    keywords: ["jpg to pdf", "image to pdf", "photo to pdf", "png to pdf", "scan to pdf"],
    next: [{ label: "Compress PDF", href: "/tools/pdf/compress-pdf" }, { label: "Student assignment PDF", href: "/workflows/student-assignment-pdf" }],
  }),
  t({
    id: "pdf-to-jpg", name: "PDF to JPG", category: "pdf", icon: "images",
    description: "Convert every PDF page into a high-quality JPG image.",
    intro: "Need a page as an image for WhatsApp, slides or social media? Convert PDF pages to JPG at the resolution you need.",
    howTo: ["Choose a PDF.", "Pick resolution and quality.", "Download single images or a ZIP of all pages."],
    faq: [{ q: "What resolution should I pick?", a: "150 DPI is great for screens and sharing; 300 DPI is best for printing." }],
    keywords: ["pdf to jpg", "pdf to image", "pdf to png", "convert pdf page to photo"],
    next: [{ label: "Compress images", href: "/tools/image/image-compressor" }],
  }),
  t({
    id: "pdf-text-extractor", name: "PDF Text Extractor", category: "pdf", icon: "scan-text",
    description: "Copy all selectable text out of a PDF, page by page.",
    intro: "Extract the text layer from a PDF to edit, quote or search it. Works for digital PDFs; scanned images contain no text layer.",
    howTo: ["Choose a PDF.", "Review text page by page.", "Copy it or download as a .txt file."],
    faq: [{ q: "Why is my scanned PDF empty?", a: "Scanned PDFs are pictures of pages and have no text layer. Text extraction needs a digitally created PDF." }],
    keywords: ["pdf to text", "extract text from pdf", "copy text pdf", "pdf text"],
    next: [{ label: "Word Counter", href: "/tools/text/word-counter" }, { label: "AI Summarizer", href: "/tools/ai/ai-text-summarizer" }],
  }),

  // ───────────── IMAGE ─────────────
  t({
    id: "image-compressor", name: "Image Compressor", category: "image", icon: "image-down", popular: true, featured: true,
    description: "Shrink JPG, PNG and WebP photos — set a quality or an exact target size in KB.",
    intro: "Make photos load faster and fit upload limits. Choose a quality level or enter a target such as 100 KB and SolveIt finds the best quality that fits.",
    howTo: ["Add one or more images.", "Choose quality or a target size.", "Download your compressed images."],
    faq: [
      { q: "How do I compress a photo to under 50 KB?", a: "Switch to ‘Target size’, enter 50 KB and compress. If needed, SolveIt also reduces dimensions to reach the target." },
      { q: "Which format gives the smallest file?", a: "WebP is usually 25–35% smaller than JPG at the same visual quality." },
    ],
    keywords: ["compress image", "reduce photo size", "image size kb", "photo compressor", "image under 100kb", "photo size kam"],
    next: [
      { label: "Website-ready image", href: "/workflows/website-image" },
      { label: "Instagram-ready", href: "/workflows/instagram-post" },
      { label: "WhatsApp-ready", href: "/workflows/whatsapp-image" },
      { label: "Create thumbnail", href: "/workflows/thumbnail" },
    ],
  }),
  t({
    id: "image-resizer", name: "Image Resizer", category: "image", icon: "scaling", popular: true,
    description: "Resize photos by pixels or percentage, with presets for Instagram, YouTube and more.",
    intro: "Change image dimensions exactly. Keep the aspect ratio, fill a frame or fit inside it, with ready presets for social platforms.",
    howTo: ["Add images.", "Enter width and height or pick a preset.", "Download resized images."],
    faq: [{ q: "What does ‘Cover’ mean?", a: "Cover fills the whole frame and trims edges that don't fit. ‘Contain’ fits the whole image inside the frame and adds a background." }],
    keywords: ["resize image", "photo resize", "change image dimensions", "resize photo pixels", "photo nani karvi"],
    next: [{ label: "Compress", href: "/tools/image/image-compressor" }, { label: "Crop", href: "/tools/image/image-cropper" }],
  }),
  t({
    id: "image-converter", name: "Image Converter", category: "image", icon: "repeat",
    description: "Convert images between JPG, PNG and WebP in one click.",
    intro: "Switch formats for compatibility or smaller files: PNG to JPG for photos, JPG to WebP for websites, WebP to PNG for editing.",
    howTo: ["Add images.", "Choose the output format.", "Download converted files."],
    faq: [{ q: "What happens to transparency when converting to JPG?", a: "JPG can't store transparency, so transparent areas are filled with the background color you pick (white by default)." }],
    keywords: ["convert image", "png to jpg", "jpg to webp", "webp to png", "image format"],
    next: [{ label: "Compress", href: "/tools/image/image-compressor" }],
  }),
  t({
    id: "image-cropper", name: "Image Cropper", category: "image", icon: "crop",
    description: "Crop photos freely or to exact ratios like 1:1, 4:5 and 16:9.",
    intro: "Drag to select the area you want to keep. Lock to a social media ratio for perfect framing.",
    howTo: ["Add an image.", "Drag on the image to select an area, or choose a ratio.", "Crop and download."],
    faq: [{ q: "Does cropping reduce quality?", a: "No. Cropping keeps the original pixels of the selected area." }],
    keywords: ["crop image", "crop photo", "image cropper", "square crop", "cut photo"],
    next: [{ label: "Resize", href: "/tools/image/image-resizer" }, { label: "Compress", href: "/tools/image/image-compressor" }],
  }),
  t({
    id: "background-remover", name: "Background Remover", category: "image", icon: "eraser",
    description: "Remove plain or solid backgrounds from product photos and logos to get a transparent PNG.",
    intro: "Ideal for product shots on white, logos and signatures. SolveIt detects the background color from the image edges and removes it, with adjustable tolerance and edge softness.",
    howTo: ["Add an image with a plain background.", "Adjust tolerance until the background disappears.", "Download a transparent PNG."],
    faq: [
      { q: "Does it work with busy backgrounds?", a: "This version is designed for plain or solid backgrounds such as studio, white-wall or scanned signatures. Complex scenes need an AI model, which we plan to add." },
      { q: "Can I replace the background with a color?", a: "Yes. Choose a fill color instead of transparent before downloading." },
    ],
    keywords: ["remove background", "transparent png", "background remover", "remove white background", "signature transparent"],
    next: [{ label: "Product image", href: "/workflows/product-image" }, { label: "Resize", href: "/tools/image/image-resizer" }],
  }),
  t({
    id: "image-metadata-remover", name: "Image Metadata Remover", category: "image", icon: "shield-off",
    description: "Strip EXIF data such as GPS location, camera model and date before sharing photos.",
    intro: "Photos from phones often carry your exact GPS location. SolveIt shows what hidden data is inside and removes all of it by re-encoding the image cleanly.",
    howTo: ["Add photos.", "See which metadata was found.", "Download clean copies."],
    faq: [{ q: "What metadata is removed?", a: "All of it — EXIF (including GPS), XMP, IPTC and embedded thumbnails. Only the visible image is kept." }],
    keywords: ["remove exif", "remove gps from photo", "strip metadata", "photo privacy", "exif remover"],
    next: [{ label: "Compress", href: "/tools/image/image-compressor" }],
  }),

  // ───────────── TEXT ─────────────
  t({
    id: "word-counter", name: "Word Counter", category: "text", icon: "whole-word", popular: true,
    description: "Count words, characters, sentences and reading time as you type.",
    intro: "Check essay length, social post limits and reading time instantly. Works for English, Hindi, Gujarati and other languages.",
    howTo: ["Paste or type your text.", "See counts update live.", "Check keyword density for your top words."],
    faq: [{ q: "How is reading time calculated?", a: "Reading time assumes 230 words per minute; speaking time assumes 140 words per minute." }],
    keywords: ["word counter", "character count", "count words", "letter count", "essay word count"],
    next: [{ label: "Text Cleaner", href: "/tools/text/text-cleaner" }, { label: "AI Summarizer", href: "/tools/ai/ai-text-summarizer" }],
  }),
  t({
    id: "case-converter", name: "Case Converter", category: "text", icon: "case-sensitive",
    description: "Convert text to UPPERCASE, lowercase, Title Case, Sentence case, camelCase and more.",
    intro: "Fix accidental caps lock, format headings or rename variables. One click converts everything.",
    howTo: ["Paste text.", "Choose a case.", "Copy the result."],
    faq: [{ q: "Does Title Case keep small words lowercase?", a: "Yes. Words like a, an, the, of and in stay lowercase unless they start the title." }],
    keywords: ["case converter", "uppercase", "lowercase", "title case", "camelcase", "snake case"],
  }),
  t({
    id: "text-cleaner", name: "Text Cleaner", category: "text", icon: "eraser",
    description: "Remove extra spaces, empty lines, line breaks, duplicates and HTML from pasted text.",
    intro: "Text copied from PDFs, emails and websites is full of broken lines and stray spaces. Pick what to clean and get tidy text instantly.",
    howTo: ["Paste messy text.", "Tick the clean-up options you need.", "Copy the clean text."],
    faq: [{ q: "Can it fix text copied from a PDF?", a: "Yes. Use ‘Join broken lines’ to merge lines that were split mid-sentence." }],
    keywords: ["clean text", "remove extra spaces", "remove line breaks", "remove duplicate lines", "strip html"],
  }),
  t({
    id: "text-compare", name: "Text Compare", category: "text", icon: "git-compare",
    description: "Compare two texts and highlight added, removed and changed lines.",
    intro: "Spot what changed between two versions of a document, contract or code snippet with a clear line-by-line diff.",
    howTo: ["Paste the original on the left.", "Paste the changed version on the right.", "Review highlighted differences."],
    faq: [{ q: "Is the comparison case-sensitive?", a: "By default yes. Tick ‘Ignore case’ or ‘Ignore whitespace’ to relax it." }],
    keywords: ["text compare", "diff checker", "compare text", "find difference"],
  }),

  // ───────────── CALCULATORS ─────────────
  t({
    id: "percentage-calculator", name: "Percentage Calculator", category: "calculators", icon: "percent",
    description: "Find X% of a number, what percent one number is of another, and percentage change.",
    intro: "Three everyday percentage questions answered instantly, with the formula shown so you can check the math.",
    howTo: ["Pick the question you want answered.", "Enter the numbers.", "Read the answer and formula."],
    faq: [{ q: "How is percentage change calculated?", a: "(New − Old) ÷ Old × 100. A positive result is an increase; negative is a decrease." }],
    keywords: ["percentage calculator", "percent of", "percentage change", "percentage increase"],
  }),
  t({
    id: "age-calculator", name: "Age Calculator", category: "calculators", icon: "cake",
    description: "Exact age in years, months and days, plus days until your next birthday.",
    intro: "Calculate exact age on any date — useful for exam eligibility, forms and birthdays.",
    howTo: ["Enter date of birth.", "Optionally change the ‘as on’ date.", "See age and next birthday."],
    faq: [{ q: "Can I calculate age on a past or future date?", a: "Yes. Change the ‘Age on’ date — useful when a form asks for age as on a cut-off date." }],
    keywords: ["age calculator", "calculate age", "date of birth age", "age as on date"],
  }),
  t({
    id: "emi-calculator", name: "EMI Calculator", category: "calculators", icon: "landmark", popular: true, featured: true,
    description: "Monthly EMI, total interest and a year-by-year repayment schedule for any loan.",
    intro: "Plan a home, car or personal loan. See your monthly EMI, how much interest you'll pay in total, and how the balance falls each year.",
    howTo: ["Enter loan amount, interest rate and tenure.", "Review EMI and total interest.", "Check the yearly schedule."],
    faq: [
      { q: "What formula is used?", a: "EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1), where P is the principal, r the monthly interest rate and n the number of months." },
      { q: "Does this include processing fees?", a: "No. Add fees and insurance separately; they vary by lender." },
    ],
    keywords: ["emi calculator", "loan emi", "home loan emi", "car loan emi", "emi ketli", "emi kitni"],
    next: [{ label: "ROI Calculator", href: "/tools/business/roi-calculator" }, { label: "Percentage Calculator", href: "/tools/calculators/percentage-calculator" }],
  }),
  t({
    id: "gst-calculator", name: "GST Calculator", category: "calculators", icon: "receipt", popular: true,
    description: "Add or remove GST at 5%, 12%, 18% or 28% with a CGST, SGST and IGST split.",
    intro: "Work out GST-inclusive and GST-exclusive prices for invoices and quotes, with the tax split shown the way Indian invoices need it.",
    howTo: ["Enter amount.", "Choose rate and whether GST is included.", "Read base price, tax and split."],
    faq: [{ q: "When do I use CGST + SGST vs IGST?", a: "CGST + SGST applies to sales within the same state; IGST applies to inter-state sales. The total tax is the same." }],
    keywords: ["gst calculator", "gst inclusive", "remove gst", "cgst sgst", "gst 18 percent"],
  }),
  t({
    id: "discount-calculator", name: "Discount Calculator", category: "calculators", icon: "tag",
    description: "Final price and savings after one or two stacked discounts.",
    intro: "See exactly what you'll pay in a sale — including an extra coupon on top of the listed discount.",
    howTo: ["Enter the original price.", "Enter discount and any extra discount.", "See final price and savings."],
    faq: [{ q: "Is 40% + 10% the same as 50%?", a: "No. Stacked discounts apply one after the other: 40% then 10% equals 46% in total." }],
    keywords: ["discount calculator", "sale price", "percent off", "final price after discount"],
  }),
  t({
    id: "unit-converter", name: "Unit Converter", category: "calculators", icon: "ruler",
    description: "Convert length, weight, temperature, area, volume, speed, data and time.",
    intro: "Metric, imperial and Indian units in one place — including gaj, bigha and quintal.",
    howTo: ["Pick a unit type.", "Enter a value and choose units.", "Read the result and all conversions."],
    faq: [{ q: "Which bigha value do you use?", a: "Bigha varies by state. We use 27,225 sq ft (common in parts of Gujarat/Rajasthan) and show it clearly." }],
    keywords: ["unit converter", "cm to inch", "kg to lbs", "celsius to fahrenheit", "sq ft to gaj"],
  }),

  // ───────────── DEVELOPER ─────────────
  t({
    id: "json-formatter", name: "JSON Formatter", category: "developer", icon: "braces", popular: true,
    description: "Pretty-print JSON with 2, 4 spaces or tabs, and optionally sort keys.",
    intro: "Turn a wall of JSON into readable, indented text. Sort keys for easier diffs.",
    howTo: ["Paste JSON.", "Choose indentation.", "Copy or download formatted JSON."],
    faq: [{ q: "Does formatting change my data?", a: "No. Only whitespace changes unless you choose to sort keys." }],
    keywords: ["json formatter", "pretty print json", "beautify json", "format json"],
    next: [{ label: "API-ready JSON", href: "/workflows/api-ready-json" }, { label: "Validate", href: "/tools/developer/json-validator" }],
  }),
  t({
    id: "json-validator", name: "JSON Validator", category: "developer", icon: "badge-check",
    description: "Check if JSON is valid and see the exact line and column of any error.",
    intro: "Find the stray comma or missing quote fast. Errors are pinpointed with line, column and a helpful hint.",
    howTo: ["Paste JSON.", "Validate.", "Jump to the reported line to fix it."],
    faq: [{ q: "Does it allow comments or trailing commas?", a: "Standard JSON doesn't. The validator reports them as errors, and ‘Clean JSON’ in the API-ready workflow can remove trailing commas." }],
    keywords: ["json validator", "validate json", "json lint", "check json"],
  }),
  t({
    id: "json-minifier", name: "JSON Minifier", category: "developer", icon: "minimize",
    description: "Remove whitespace to make JSON as small as possible.",
    intro: "Shrink JSON payloads and config for production. Shows the size saved.",
    howTo: ["Paste JSON.", "Minify.", "Copy the compact result."],
    faq: [{ q: "Is minified JSON still valid?", a: "Yes. Only unnecessary whitespace is removed." }],
    keywords: ["json minify", "compress json", "minify json"],
  }),
  t({
    id: "base64", name: "Base64 Encoder / Decoder", category: "developer", icon: "binary",
    description: "Encode and decode Base64 text or files, with URL-safe and UTF-8 support.",
    intro: "Convert text or small files to Base64 and back — handy for data URIs, tokens and API testing.",
    howTo: ["Choose Encode or Decode.", "Paste text or pick a file.", "Copy the result."],
    faq: [{ q: "Does it handle emojis and Hindi text?", a: "Yes. Text is encoded as UTF-8, so every language and emoji round-trips correctly." }],
    keywords: ["base64 encode", "base64 decode", "base64 converter", "data uri"],
  }),
  t({
    id: "uuid-generator", name: "UUID Generator", category: "developer", icon: "fingerprint",
    description: "Generate random version 4 UUIDs in bulk.",
    intro: "Create unique IDs for databases and tests using your browser's cryptographic random generator.",
    howTo: ["Choose how many.", "Pick a format.", "Copy them all."],
    faq: [{ q: "Are these UUIDs truly unique?", a: "Version 4 UUIDs have 122 random bits; a collision is practically impossible." }],
    keywords: ["uuid generator", "guid", "uuid v4", "random id"],
  }),
  t({
    id: "qr-code-generator", name: "QR Code Generator", category: "developer", icon: "qr-code", popular: true,
    description: "Create QR codes for links, text, Wi-Fi, UPI and contact details. Download PNG or SVG.",
    intro: "Make a scannable QR code for a website, Wi-Fi network, UPI payment or plain text. Choose colors, size and error correction.",
    howTo: ["Choose a type and enter details.", "Adjust colors and size.", "Download as PNG or SVG."],
    faq: [
      { q: "Do these QR codes expire?", a: "No. The data is stored inside the code itself, so it works forever." },
      { q: "What is error correction?", a: "Higher levels let the code scan even when partly damaged or covered, at the cost of a denser pattern." },
    ],
    keywords: ["qr code generator", "create qr", "upi qr", "wifi qr", "qr for link"],
  }),

  // ───────────── SECURITY ─────────────
  t({
    id: "password-generator", name: "Password Generator", category: "security", icon: "key-round", popular: true,
    description: "Create strong random passwords or memorable passphrases.",
    intro: "Generate passwords with the length and characters you need, or an easy-to-type passphrase — using cryptographically secure randomness.",
    howTo: ["Choose length and character types.", "Generate.", "Copy and store it in your password manager."],
    faq: [{ q: "How long should a password be?", a: "At least 14 characters for important accounts. Longer is always stronger." }],
    keywords: ["password generator", "strong password", "random password", "passphrase"],
    next: [{ label: "Check strength", href: "/tools/security/password-strength-checker" }],
  }),
  t({
    id: "password-strength-checker", name: "Password Strength Checker", category: "security", icon: "shield-check",
    description: "See how strong a password is, how long it would take to crack and how to improve it.",
    intro: "Test a password privately. SolveIt checks length, variety, common patterns and known weak passwords — nothing leaves your device.",
    howTo: ["Type a password.", "Read the score and estimated crack time.", "Follow the suggestions."],
    faq: [{ q: "Is it safe to type my real password here?", a: "The check runs entirely in your browser and nothing is sent or stored. Still, consider testing a similar password rather than your exact one." }],
    keywords: ["password strength", "check password", "how strong is my password"],
  }),
  t({
    id: "hash-generator", name: "Hash Generator", category: "security", icon: "hash",
    description: "Generate MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes of text or files.",
    intro: "Verify downloads and compare files by their checksum. Hash text or any file locally.",
    howTo: ["Type text or choose a file.", "See all hashes at once.", "Compare with an expected checksum."],
    faq: [{ q: "Which hash should I use?", a: "SHA-256 for anything security-related. MD5 and SHA-1 are fine for checksums but are not collision-resistant." }],
    keywords: ["hash generator", "sha256", "md5", "checksum", "file hash"],
  }),

  // ───────────── BUSINESS ─────────────
  t({
    id: "profit-margin-calculator", name: "Profit Margin Calculator", category: "business", icon: "trending-up",
    description: "Margin, markup and profit from cost and price — or find the price for a target margin.",
    intro: "Price products with confidence. Understand the difference between margin and markup and find the selling price for the margin you want.",
    howTo: ["Enter cost and selling price, or cost and target margin.", "Read margin, markup and profit."],
    faq: [{ q: "What's the difference between margin and markup?", a: "Margin is profit ÷ selling price. Markup is profit ÷ cost. A 50% markup is a 33.3% margin." }],
    keywords: ["profit margin", "markup calculator", "selling price", "margin calculator"],
  }),
  t({
    id: "roi-calculator", name: "ROI Calculator", category: "business", icon: "piggy-bank",
    description: "Return on investment, net gain and annualized return (CAGR).",
    intro: "Compare investments fairly. Get total ROI and the annualized return over any period.",
    howTo: ["Enter amount invested and final value.", "Enter the duration.", "Read ROI and annualized return."],
    faq: [{ q: "Why is annualized return lower than total ROI?", a: "Annualized return spreads growth across each year and accounts for compounding, so it's the fair way to compare different time periods." }],
    keywords: ["roi calculator", "return on investment", "cagr", "investment return"],
  }),
  t({
    id: "csv-to-json", name: "CSV to JSON", category: "business", icon: "table",
    description: "Convert CSV or spreadsheet exports to a JSON array, with automatic delimiter detection.",
    intro: "Turn Excel or Google Sheets exports into JSON for APIs and apps. Handles quoted fields, commas inside values and semicolon or tab delimiters.",
    howTo: ["Paste CSV or choose a file.", "Confirm header row and delimiter.", "Copy or download JSON."],
    faq: [{ q: "Are numbers converted?", a: "Yes, when ‘Detect numbers’ is on. Leading-zero values like phone numbers and PIN codes stay as text." }],
    keywords: ["csv to json", "excel to json", "convert csv", "spreadsheet to json"],
  }),
  t({
    id: "json-to-csv", name: "JSON to CSV", category: "business", icon: "file-json",
    description: "Convert a JSON array to CSV that opens cleanly in Excel or Google Sheets.",
    intro: "Flatten nested JSON objects into columns and export a spreadsheet-ready CSV.",
    howTo: ["Paste a JSON array or choose a file.", "Review the column preview.", "Download CSV."],
    faq: [{ q: "How are nested objects handled?", a: "Nested fields become dotted column names like address.city. Arrays are written as JSON text." }],
    keywords: ["json to csv", "json to excel", "export json", "convert json"],
  }),

  // ───────────── AI ─────────────
  t({
    id: "ai-text-summarizer", name: "AI Text Summarizer", category: "ai", icon: "sparkles", mode: "hybrid", isNew: true,
    description: "Summarize long articles, notes and reports into key points.",
    intro: "Get the gist of long text in seconds. On-device mode picks the most important sentences; AI mode writes a fresh summary when available.",
    howTo: ["Paste text.", "Choose length.", "Copy the summary."],
    faq: [{ q: "What is on-device mode?", a: "An extractive summarizer that runs in your browser and selects the most informative sentences. It never sends your text anywhere." }],
    keywords: ["summarize text", "ai summarizer", "summary generator", "tldr"],
  }),
  t({
    id: "ai-rewriter", name: "AI Rewriter", category: "ai", icon: "pen-line", mode: "hybrid", isNew: true,
    description: "Rewrite text to be clearer, more formal, friendlier or shorter.",
    intro: "Polish a message, post or paragraph. Choose a tone and SolveIt rewrites it — on-device for quick clean-ups, or with AI when available.",
    howTo: ["Paste text.", "Choose a tone.", "Copy the rewritten version."],
    faq: [{ q: "What does on-device mode change?", a: "It fixes spacing and capitalization, removes filler phrases and adjusts contractions for tone. AI mode fully rephrases sentences." }],
    keywords: ["rewrite text", "paraphrase", "ai rewriter", "make text formal"],
  }),
  t({
    id: "ai-email-writer", name: "AI Email Writer", category: "ai", icon: "mail", mode: "hybrid", isNew: true,
    description: "Draft professional emails from a few bullet points.",
    intro: "Tell SolveIt who you're writing to, why and the key points — get a well-structured email with a subject line.",
    howTo: ["Choose the email purpose and tone.", "Add key points.", "Copy the draft and personalize."],
    faq: [{ q: "Can I use it for leave applications and follow-ups?", a: "Yes. Pick the purpose and the draft follows a professional structure for it." }],
    keywords: ["email writer", "write email", "ai email", "leave application email", "follow up email"],
  }),
];

export const TOOL_COUNT = TOOLS.length;

export const toolById = (id: string) => TOOLS.find((t) => t.id === id);
export const toolsByCategory = (c: CategoryId) => TOOLS.filter((t) => t.category === c);
export const toolHref = (t: ToolDefinition) => `/tools/${t.category}/${t.slug}`;
