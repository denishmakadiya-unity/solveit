import type { ComponentType } from "react";
import type { ToolProps } from "./common";

type Loader = () => Promise<ComponentType<ToolProps>>;
const pdf = () => import("./pdfTools");
const image = () => import("./imageTools");
const text = () => import("./textTools");
const calc = () => import("./calcTools");
const dev = () => import("./devTools");
const ai = () => import("./aiTools");

export const TOOL_COMPONENTS: Record<string, Loader> = {
  "compress-pdf": () => pdf().then((m) => m.CompressPdf),
  "merge-pdf": () => pdf().then((m) => m.MergePdf),
  "split-pdf": () => pdf().then((m) => m.SplitPdf),
  "jpg-to-pdf": () => pdf().then((m) => m.JpgToPdf),
  "pdf-to-jpg": () => pdf().then((m) => m.PdfToJpg),
  "pdf-text-extractor": () => pdf().then((m) => m.PdfTextExtractor),
  "image-compressor": () => image().then((m) => m.ImageCompressor),
  "image-resizer": () => image().then((m) => m.ImageResizer),
  "image-converter": () => image().then((m) => m.ImageConverter),
  "image-cropper": () => image().then((m) => m.ImageCropper),
  "background-remover": () => image().then((m) => m.BackgroundRemover),
  "image-metadata-remover": () => image().then((m) => m.MetadataRemover),
  "word-counter": () => text().then((m) => m.WordCounter),
  "case-converter": () => text().then((m) => m.CaseConverter),
  "text-cleaner": () => text().then((m) => m.TextCleaner),
  "text-compare": () => text().then((m) => m.TextCompare),
  "percentage-calculator": () => calc().then((m) => m.PercentageCalculator),
  "age-calculator": () => calc().then((m) => m.AgeCalculator),
  "emi-calculator": () => calc().then((m) => m.EmiCalculator),
  "gst-calculator": () => calc().then((m) => m.GstCalculator),
  "discount-calculator": () => calc().then((m) => m.DiscountCalculator),
  "unit-converter": () => calc().then((m) => m.UnitConverter),
  "json-formatter": () => dev().then((m) => m.JsonFormatter),
  "json-validator": () => dev().then((m) => m.JsonValidator),
  "json-minifier": () => dev().then((m) => m.JsonMinifier),
  base64: () => dev().then((m) => m.Base64Tool),
  "uuid-generator": () => dev().then((m) => m.UuidGenerator),
  "qr-code-generator": () => dev().then((m) => m.QrCodeGenerator),
  "password-generator": () => dev().then((m) => m.PasswordGenerator),
  "password-strength-checker": () => dev().then((m) => m.PasswordStrengthChecker),
  "hash-generator": () => dev().then((m) => m.HashGenerator),
  "profit-margin-calculator": () => calc().then((m) => m.ProfitMarginCalculator),
  "roi-calculator": () => calc().then((m) => m.RoiCalculator),
  "csv-to-json": () => dev().then((m) => m.CsvToJson),
  "json-to-csv": () => dev().then((m) => m.JsonToCsv),
  "ai-text-summarizer": () => ai().then((m) => m.AiSummarizer),
  "ai-rewriter": () => ai().then((m) => m.AiRewriter),
  "ai-email-writer": () => ai().then((m) => m.AiEmailWriter),
};
