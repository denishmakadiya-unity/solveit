export type ProcessingMode = "client" | "server" | "hybrid";

export type FAQ = { q: string; a: string };

export type CategoryId =
  | "pdf"
  | "image"
  | "text"
  | "calculators"
  | "developer"
  | "security"
  | "business"
  | "ai";

export type Category = {
  id: CategoryId;
  slug: string; // /categories/<slug>
  name: string;
  short: string;
  intro: string;
  icon: string;
  faq: FAQ[];
};

export type ToolDefinition = {
  id: string;
  slug: string; // /tools/<category>/<slug>
  name: string;
  category: CategoryId;
  description: string;
  processingMode: ProcessingMode;
  icon: string;
  popular?: boolean;
  featured?: boolean;
  isNew?: boolean;
  keywords: string[];
  seo: { title: string; description: string; keywords: string[] };
  intro: string;
  howTo: string[];
  faq: FAQ[];
  next?: { label: string; href: string; hint?: string }[];
};

export type ItemKind = "image" | "pdf" | "text" | "json" | "csv";

export type StepParam =
  | { key: string; label: string; type: "number"; min?: number; max?: number; step?: number; unit?: string }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; type: "boolean" }
  | { key: string; label: string; type: "text"; placeholder?: string };

export type StepDefinition = {
  id: string;
  name: string;
  short: string;
  accepts: ItemKind[];
  produces: ItemKind | "same";
  icon: string;
  params: StepParam[];
  defaults: Record<string, any>;
  toolSlug?: string;
};

export type WorkflowStep = { step: string; params?: Record<string, any> };

export type Workflow = {
  slug: string;
  name: string;
  goal: string;
  description: string;
  input: ItemKind;
  inputLabel: string;
  multiple?: boolean;
  steps: WorkflowStep[];
  output: string;
  audience: TemplateCategoryId[];
  keywords: string[];
  icon: string;
  popular?: boolean;
};

export type TemplateCategoryId =
  | "students"
  | "business"
  | "developers"
  | "creators"
  | "social-media"
  | "personal"
  | "documents";
