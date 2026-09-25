import type { StepDefinition } from "./types";

const FORMAT_OPTS = [
  { value: "jpeg", label: "JPG" },
  { value: "webp", label: "WebP" },
  { value: "png", label: "PNG" },
];

export const STEPS: StepDefinition[] = [
  // ── Image ──
  {
    id: "resize", name: "Resize", short: "Change dimensions", accepts: ["image"], produces: "same", icon: "scaling", toolSlug: "image/image-resizer",
    params: [
      { key: "width", label: "Width", type: "number", min: 1, max: 12000, unit: "px" },
      { key: "height", label: "Height", type: "number", min: 1, max: 12000, unit: "px" },
      { key: "fit", label: "Fit", type: "select", options: [
        { value: "inside", label: "Fit inside (keep ratio)" }, { value: "cover", label: "Fill frame (crop edges)" }, { value: "contain", label: "Fit with background" }] },
      { key: "background", label: "Background", type: "text", placeholder: "#ffffff" },
    ],
    defaults: { width: 1600, height: 1600, fit: "inside", background: "#ffffff" },
  },
  {
    id: "crop-ratio", name: "Crop", short: "Center-crop to a ratio", accepts: ["image"], produces: "same", icon: "crop", toolSlug: "image/image-cropper",
    params: [{ key: "ratio", label: "Aspect ratio", type: "select", options: ["1:1", "4:5", "3:4", "2:3", "3:2", "4:3", "16:9", "9:16"].map((r) => ({ value: r, label: r })) }],
    defaults: { ratio: "1:1" },
  },
  {
    id: "convert", name: "Convert", short: "Change format", accepts: ["image"], produces: "same", icon: "repeat", toolSlug: "image/image-converter",
    params: [{ key: "format", label: "Format", type: "select", options: FORMAT_OPTS }, { key: "quality", label: "Quality", type: "number", min: 10, max: 100, unit: "%" }],
    defaults: { format: "webp", quality: 90 },
  },
  {
    id: "compress", name: "Compress", short: "Reduce file size", accepts: ["image"], produces: "same", icon: "image-down", toolSlug: "image/image-compressor",
    params: [{ key: "quality", label: "Quality", type: "number", min: 10, max: 100, unit: "%" }],
    defaults: { quality: 80 },
  },
  {
    id: "ensure-size", name: "Check file size", short: "Optimize until under a limit", accepts: ["image"], produces: "same", icon: "gauge",
    params: [{ key: "maxKB", label: "Maximum size", type: "number", min: 5, max: 50000, unit: "KB" }],
    defaults: { maxKB: 500 },
  },
  {
    id: "strip-metadata", name: "Remove metadata", short: "Strip EXIF & GPS", accepts: ["image"], produces: "same", icon: "shield-off", toolSlug: "image/image-metadata-remover",
    params: [], defaults: {},
  },
  {
    id: "remove-bg", name: "Remove background", short: "Plain backgrounds", accepts: ["image"], produces: "same", icon: "eraser", toolSlug: "image/background-remover",
    params: [
      { key: "tolerance", label: "Tolerance", type: "number", min: 1, max: 120 },
      { key: "fill", label: "Fill", type: "select", options: [{ value: "transparent", label: "Transparent" }, { value: "#ffffff", label: "White" }] },
    ],
    defaults: { tolerance: 40, fill: "transparent" },
  },
  {
    id: "images-to-pdf", name: "Images to PDF", short: "Combine into one PDF", accepts: ["image"], produces: "pdf", icon: "file-image", toolSlug: "pdf/jpg-to-pdf",
    params: [
      { key: "pageSize", label: "Page size", type: "select", options: [{ value: "a4", label: "A4" }, { value: "letter", label: "US Letter" }, { value: "fit", label: "Same as image" }] },
      { key: "margin", label: "Margin", type: "number", min: 0, max: 100, unit: "pt" },
    ],
    defaults: { pageSize: "a4", margin: 24 },
  },
  // ── PDF ──
  {
    id: "pdf-compress", name: "Compress PDF", short: "Smaller PDF", accepts: ["pdf"], produces: "same", icon: "shrink", toolSlug: "pdf/compress-pdf",
    params: [
      { key: "mode", label: "Mode", type: "select", options: [{ value: "lossless", label: "Lossless (keep text)" }, { value: "balanced", label: "Balanced" }, { value: "strong", label: "Strong" }] },
    ],
    defaults: { mode: "balanced" },
  },
  {
    id: "pdf-ensure-size", name: "Check PDF size", short: "Optimize if necessary", accepts: ["pdf"], produces: "same", icon: "gauge",
    params: [{ key: "maxKB", label: "Maximum size", type: "number", min: 20, max: 200000, unit: "KB" }],
    defaults: { maxKB: 2048 },
  },
  {
    id: "pdf-merge", name: "Merge PDFs", short: "Combine files", accepts: ["pdf"], produces: "same", icon: "combine", toolSlug: "pdf/merge-pdf",
    params: [], defaults: {},
  },
  {
    id: "pdf-pages", name: "Select pages", short: "Keep a page range", accepts: ["pdf"], produces: "same", icon: "split", toolSlug: "pdf/split-pdf",
    params: [{ key: "ranges", label: "Pages", type: "text", placeholder: "1-3, 5" }],
    defaults: { ranges: "1" },
  },
  {
    id: "pdf-to-images", name: "PDF to JPG", short: "Pages as images", accepts: ["pdf"], produces: "image", icon: "images", toolSlug: "pdf/pdf-to-jpg",
    params: [{ key: "dpi", label: "Resolution", type: "number", min: 50, max: 300, unit: "DPI" }],
    defaults: { dpi: 150 },
  },
  {
    id: "pdf-text", name: "Extract text", short: "PDF to text", accepts: ["pdf"], produces: "text", icon: "scan-text", toolSlug: "pdf/pdf-text-extractor",
    params: [], defaults: {},
  },
  // ── JSON / data ──
  { id: "json-validate", name: "Validate JSON", short: "Stop on errors", accepts: ["json", "text"], produces: "json", icon: "badge-check", toolSlug: "developer/json-validator", params: [], defaults: {} },
  {
    id: "json-clean", name: "Clean JSON", short: "Remove nulls & empties", accepts: ["json"], produces: "json", icon: "eraser",
    params: [{ key: "removeNull", label: "Remove null values", type: "boolean" }, { key: "removeEmpty", label: "Remove empty strings, arrays and objects", type: "boolean" }],
    defaults: { removeNull: true, removeEmpty: true },
  },
  { id: "json-sort", name: "Sort keys", short: "Alphabetical keys", accepts: ["json"], produces: "json", icon: "arrow-up-down", params: [], defaults: {} },
  {
    id: "json-format", name: "Format JSON", short: "Pretty print", accepts: ["json"], produces: "json", icon: "braces", toolSlug: "developer/json-formatter",
    params: [{ key: "indent", label: "Indent", type: "select", options: [{ value: "2", label: "2 spaces" }, { value: "4", label: "4 spaces" }, { value: "tab", label: "Tab" }] }],
    defaults: { indent: "2" },
  },
  { id: "json-minify", name: "Minify JSON", short: "Smallest size", accepts: ["json"], produces: "json", icon: "minimize", toolSlug: "developer/json-minifier", params: [], defaults: {} },
  { id: "json-to-csv", name: "JSON to CSV", short: "Spreadsheet output", accepts: ["json"], produces: "csv", icon: "table", toolSlug: "business/json-to-csv", params: [], defaults: {} },
  { id: "csv-to-json", name: "CSV to JSON", short: "JSON array", accepts: ["csv", "text"], produces: "json", icon: "file-json", toolSlug: "business/csv-to-json", params: [], defaults: {} },
  // ── Text ──
  {
    id: "text-clean", name: "Clean text", short: "Spaces, lines, HTML", accepts: ["text"], produces: "text", icon: "eraser", toolSlug: "text/text-cleaner",
    params: [
      { key: "trim", label: "Trim lines", type: "boolean" },
      { key: "collapse", label: "Collapse extra spaces", type: "boolean" },
      { key: "emptyLines", label: "Remove empty lines", type: "boolean" },
      { key: "joinLines", label: "Join broken lines", type: "boolean" },
      { key: "dedupe", label: "Remove duplicate lines", type: "boolean" },
      { key: "html", label: "Strip HTML tags", type: "boolean" },
      { key: "quotes", label: "Straighten smart quotes", type: "boolean" },
    ],
    defaults: { trim: true, collapse: true, emptyLines: false, joinLines: false, dedupe: false, html: true, quotes: true },
  },
  {
    id: "text-case", name: "Change case", short: "Title, upper, slug…", accepts: ["text"], produces: "text", icon: "case-sensitive", toolSlug: "text/case-converter",
    params: [{ key: "mode", label: "Case", type: "select", options: [
      { value: "title", label: "Title Case" }, { value: "sentence", label: "Sentence case" }, { value: "upper", label: "UPPERCASE" },
      { value: "lower", label: "lowercase" }, { value: "kebab", label: "kebab-case" }, { value: "snake", label: "snake_case" }, { value: "camel", label: "camelCase" }] }],
    defaults: { mode: "title" },
  },
  {
    id: "text-limit", name: "Check length", short: "Warn over a limit", accepts: ["text"], produces: "text", icon: "gauge",
    params: [{ key: "maxChars", label: "Max characters", type: "number", min: 1, max: 1000000 }, { key: "truncate", label: "Trim to the limit", type: "boolean" }],
    defaults: { maxChars: 2200, truncate: false },
  },
  { id: "base64-encode", name: "Base64 encode", short: "Encode as Base64", accepts: ["text", "json", "csv"], produces: "text", icon: "binary", toolSlug: "developer/base64", params: [], defaults: {} },
];

export const stepById = (id: string) => STEPS.find((s) => s.id === id);

export function stepOutputKind(stepId: string, inputKind: string): string {
  const s = stepById(stepId);
  if (!s) return inputKind;
  return s.produces === "same" ? inputKind : s.produces;
}

export function compatibleSteps(kind: string) {
  return STEPS.filter((s) => s.accepts.includes(kind as any));
}
