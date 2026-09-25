export type Guide = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readMins: number;
  tag: string;
  cta: { label: string; href: string };
  sections: { h: string; p: string[]; list?: string[] }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "reduce-pdf-size-for-whatsapp-and-email", title: "How to Reduce PDF Size for WhatsApp and Email", tag: "PDF",
    description: "Why PDFs get large, which compression mode to choose, and how to hit a target size like 2 MB or 200 KB.",
    date: "2026-09-10", readMins: 5, cta: { label: "Compress a PDF now", href: "/tools/pdf/compress-pdf" },
    sections: [
      { h: "Why PDFs get so large", p: [
        "Most oversized PDFs are made of images: scanned pages, phone photos or slides exported at print resolution. A single phone photo can be 4–8 MB, so a ten-page scan quickly passes 50 MB.",
        "Text itself is tiny. A 100-page text-only report is often under 1 MB."] },
      { h: "Pick the right compression mode", p: ["SolveIt offers three modes:"], list: [
        "Lossless — rewrites the PDF structure. Text stays selectable and quality is untouched. Best for digital documents.",
        "Balanced — renders pages at 120 DPI with good JPEG quality. Ideal for sharing on phones.",
        "Strong — lower resolution and quality for strict limits such as 200 KB upload portals."] },
      { h: "Hit an exact target size", p: [
        "Upload portals often require files under 200 KB, 500 KB or 1 MB. Use a target-size workflow such as ‘Upload-Portal PDF’: SolveIt compresses, checks the size and keeps optimizing until the file fits — or tells you honestly if it can't.",
        "If you can't reach a very small target, split the PDF and upload only the pages that are required."] },
      { h: "Privacy", p: ["Compression runs completely in your browser. Your document is never uploaded, which matters for ID proofs, bank statements and certificates."] },
    ],
  },
  {
    slug: "social-media-image-sizes-2026", title: "Social Media Image Sizes Cheat Sheet (2026)", tag: "Image",
    description: "The exact pixel sizes for Instagram, WhatsApp, YouTube, LinkedIn, X, Facebook and Pinterest — with one-click workflows.",
    date: "2026-09-05", readMins: 4, cta: { label: "Browse image workflows", href: "/workflows" },
    sections: [
      { h: "Instagram", p: ["Use these sizes for sharp results:"], list: ["Square post: 1080 × 1080 (1:1)", "Portrait post: 1080 × 1350 (4:5) — takes the most feed space", "Story and Reel cover: 1080 × 1920 (9:16)"] },
      { h: "YouTube, LinkedIn, X and Facebook", p: ["Headers and thumbnails are wide:"], list: ["YouTube thumbnail: 1280 × 720, under 2 MB", "LinkedIn banner: 1584 × 396", "X header: 1500 × 500", "Facebook cover: 1640 × 624", "Link preview (Open Graph): 1200 × 630"] },
      { h: "Keep files light", p: ["Platforms recompress uploads anyway. Sending a well-sized JPG at 85–90% quality avoids double compression artifacts and uploads faster on mobile data."] },
    ],
  },
  {
    slug: "how-emi-is-calculated", title: "How Loan EMI Is Calculated (With Examples)", tag: "Finance",
    description: "Understand the EMI formula, why early EMIs are mostly interest, and how tenure changes total cost.",
    date: "2026-08-28", readMins: 6, cta: { label: "Open EMI Calculator", href: "/tools/calculators/emi-calculator" },
    sections: [
      { h: "The formula", p: ["EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1)", "P is the loan amount, r is the monthly interest rate (annual rate ÷ 12 ÷ 100) and n is the number of monthly payments."] },
      { h: "Example", p: ["A ₹10,00,000 loan at 8.5% for 20 years gives an EMI of about ₹8,678. Over 240 months you pay roughly ₹20.83 lakh, so interest is about ₹10.83 lakh — more than the original loan."] },
      { h: "Why tenure matters", p: ["A longer tenure lowers the EMI but increases total interest. Cutting the same loan to 15 years raises the EMI to about ₹9,847 but saves around ₹3.1 lakh in interest."] },
      { h: "Before you decide", p: ["Add processing fees, insurance and prepayment charges from your lender's sanction letter. This article is for education, not financial advice."] },
    ],
  },
  {
    slug: "remove-location-from-photos", title: "Remove Hidden Location Data from Photos Before Sharing", tag: "Privacy",
    description: "Phone photos can reveal exactly where you live. Here's what EXIF metadata is and how to strip it in seconds.",
    date: "2026-08-20", readMins: 4, cta: { label: "Remove photo metadata", href: "/tools/image/image-metadata-remover" },
    sections: [
      { h: "What is EXIF?", p: ["EXIF is information your camera saves inside the photo: date, time, camera model and often GPS coordinates accurate to a few meters."] },
      { h: "Who can see it?", p: ["Some apps strip metadata when you upload, but many file-sharing methods, email attachments and marketplaces keep it. Anyone who downloads the original file can read it."] },
      { h: "How to remove it", p: ["Open the Image Metadata Remover, add your photos and download clean copies. SolveIt shows what it found (for example ‘GPS location’) and re-encodes the image so no hidden data remains."] },
    ],
  },
  {
    slug: "gst-calculation-guide-india", title: "GST Calculation in India: Inclusive vs Exclusive", tag: "Business",
    description: "How to add GST, remove GST from an inclusive price and split it into CGST, SGST or IGST.",
    date: "2026-08-12", readMins: 5, cta: { label: "Open GST Calculator", href: "/tools/calculators/gst-calculator" },
    sections: [
      { h: "Adding GST", p: ["GST amount = Base price × Rate ÷ 100. Final price = Base price + GST. Example: ₹1,000 at 18% → ₹180 GST → ₹1,180."] },
      { h: "Removing GST from an inclusive price", p: ["Base price = Inclusive price × 100 ÷ (100 + Rate). Example: ₹1,180 inclusive at 18% → base ₹1,000, GST ₹180."] },
      { h: "CGST, SGST and IGST", p: ["For sales within a state, the tax is split equally into CGST and SGST (9% + 9% for 18%). For inter-state sales, the full rate is charged as IGST."] },
    ],
  },
  {
    slug: "json-formatting-validation-basics", title: "JSON Basics: Formatting, Validation and Common Errors", tag: "Developer",
    description: "The five JSON mistakes that break APIs, and a clean workflow to validate, clean and minify payloads.",
    date: "2026-08-02", readMins: 5, cta: { label: "Run API-Ready JSON", href: "/workflows/api-ready-json" },
    sections: [
      { h: "The most common errors", p: ["Almost every invalid JSON document has one of these:"], list: ["Trailing commas after the last item", "Single quotes instead of double quotes", "Unquoted keys", "Comments (JSON does not allow them)", "Unescaped line breaks inside strings"] },
      { h: "Format for humans, minify for machines", p: ["Pretty-printed JSON is easier to review and diff. Minified JSON is smaller to send. The API-Ready JSON workflow does both: validate → format → clean → minify."] },
    ],
  },
];

export const guideBySlug = (s: string) => GUIDES.find((g) => g.slug === s);
