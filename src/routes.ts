import { TOOLS, toolHref } from "./registry/tools";
import { CATEGORIES, categoryById } from "./registry/categories";
import { WORKFLOWS } from "./registry/workflows";
import { TEMPLATE_CATEGORIES } from "./registry/templates";
import { GUIDES } from "./registry/guides";
import { SITE } from "./config";

export type Route = {
  path: string;
  page: string;
  params?: Record<string, string>;
  title: string;
  description: string;
  noindex?: boolean;
  priority?: number;
  jsonLd?: object[];
};

const crumbs = (items: [string, string][]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE.url + path })),
});
const faqLd = (faq: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export function getRoutes(): Route[] {
  const r: Route[] = [
    {
      path: "/", page: "home", priority: 1,
      title: "SolveIt — Your Problem. Our Tools.",
      description: SITE.description,
      jsonLd: [
        { "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url, potentialAction: { "@type": "SearchAction", target: `${SITE.url}/search?q={query}`, "query-input": "required name=query" } },
        { "@context": "https://schema.org", "@type": "Organization", name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon-512.png` },
      ],
    },
    { path: "/search", page: "search", title: "Search Tools & Workflows | SolveIt", description: "Search SolveIt tools, workflows and guides by name or by describing your problem.", noindex: true },
    { path: "/solve", page: "solve", priority: 0.9, title: "Solve a Problem — Describe It in Your Words | SolveIt", description: "Type what you want to get done in English, Hindi, Hinglish or Gujarati. SolveIt recommends the right tool or a complete workflow." },
    { path: "/tools", page: "all-tools", priority: 0.9, title: `All ${TOOLS.length} Tools — PDF, Image, Text, Developer & Calculators | SolveIt`, description: `Browse ${TOOLS.length} free, private tools: compress PDF, resize images, EMI and GST calculators, JSON formatter, QR codes and more.` },
    { path: "/workflows", page: "workflows", priority: 0.9, title: `${WORKFLOWS.length} Ready-Made Workflows | SolveIt`, description: "Multi-step solutions for common goals: WhatsApp-ready PDFs, website images, Instagram posts, API-ready JSON and more — upload once." },
    { path: "/workflows/builder", page: "builder", priority: 0.6, title: "Workflow Builder — Chain Tools Together | SolveIt", description: "Build your own multi-step workflow: resize, crop, convert, compress and more. Upload once and run every step in your browser." },
    { path: "/templates", page: "templates", priority: 0.7, title: "Templates for Students, Business, Developers & Creators | SolveIt", description: "Ready-made recipes grouped by who you are: students, business, developers, creators, social media, personal and documents." },
    { path: "/assistant", page: "assistant", priority: 0.6, title: "AI Assistant — Turn Any Request into a Workflow | SolveIt", description: "Describe a task in plain language and get a ready-to-run workflow. Understands English, Hindi, Hinglish and Gujarati." },
    { path: "/workspace", page: "workspace", title: "My Workspace | SolveIt", description: "Your recent results, saved workflows and favorite tools — stored privately in your browser.", noindex: true },
    { path: "/result", page: "result", title: "Your Result | SolveIt", description: "Your latest SolveIt result.", noindex: true },
    { path: "/account", page: "account", title: "Account | SolveIt", description: "Optional SolveIt account. Every tool works without signing in.", noindex: true },
    { path: "/pricing", page: "pricing", title: "Pricing | SolveIt", description: "SolveIt is free. Pro and Business plans are planned for the future.", noindex: true },
    { path: "/guides", page: "guides", priority: 0.7, title: "Guides & Tutorials | SolveIt", description: "Practical guides on PDF sizes, social image sizes, EMI, GST, photo privacy and JSON." },
    { path: "/help", page: "help", priority: 0.5, title: "Help & FAQ | SolveIt", description: "Answers to common questions about SolveIt tools, privacy, file limits and troubleshooting." },
    { path: "/about", page: "about", priority: 0.4, title: "About Us | SolveIt", description: "SolveIt is a problem-first utility workspace: describe what you need and get the fastest solution." },
    { path: "/contact", page: "contact", priority: 0.4, title: "Contact Us | SolveIt", description: "Contact the SolveIt team for support, feedback or tool requests." },
    { path: "/privacy", page: "privacy", priority: 0.3, title: "Privacy Policy | SolveIt", description: "How SolveIt processes files and data. Most tools run entirely in your browser." },
    { path: "/terms", page: "terms", priority: 0.3, title: "Terms of Service | SolveIt", description: "The terms for using SolveIt." },
    { path: "/admin", page: "admin", title: "Admin | SolveIt", description: "SolveIt administration.", noindex: true },
    { path: "/404", page: "notfound", title: "Page Not Found | SolveIt", description: "The page you're looking for doesn't exist.", noindex: true },
  ];

  for (const c of CATEGORIES) {
    r.push({
      path: `/categories/${c.slug}`, page: "category", params: { slug: c.slug }, priority: 0.8,
      title: `${c.name} Tools — Free & Private | SolveIt`, description: `${c.short} ${c.intro.split(". ")[0]}.`,
      jsonLd: [crumbs([["Home", "/"], ["All Tools", "/tools"], [c.name, `/categories/${c.slug}`]]), faqLd(c.faq)],
    });
  }
  for (const t of TOOLS) {
    const c = categoryById(t.category);
    r.push({
      path: toolHref(t), page: "tool", params: { id: t.id }, priority: t.popular ? 0.9 : 0.8,
      title: `${t.seo.title} | SolveIt`, description: t.seo.description,
      jsonLd: [
        crumbs([["Home", "/"], [c.name, `/categories/${c.slug}`], [t.name, toolHref(t)]]),
        { "@context": "https://schema.org", "@type": "SoftwareApplication", name: t.name, applicationCategory: "UtilitiesApplication", operatingSystem: "Any (web browser)", url: SITE.url + toolHref(t), description: t.description, offers: { "@type": "Offer", price: "0", priceCurrency: "INR" } },
        faqLd(t.faq),
      ],
    });
  }
  for (const w of WORKFLOWS) {
    r.push({
      path: `/workflows/${w.slug}`, page: "workflow", params: { slug: w.slug }, priority: w.popular ? 0.8 : 0.6,
      title: `${w.name} — ${w.steps.length}-Step Workflow | SolveIt`, description: `${w.goal} ${w.description}`.slice(0, 158),
      jsonLd: [
        crumbs([["Home", "/"], ["Workflows", "/workflows"], [w.name, `/workflows/${w.slug}`]]),
        { "@context": "https://schema.org", "@type": "HowTo", name: w.name, description: w.goal, step: w.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.step })) },
      ],
    });
  }
  for (const tc of TEMPLATE_CATEGORIES) {
    r.push({ path: `/templates/${tc.id}`, page: "template-category", params: { id: tc.id }, priority: 0.6, title: `Templates for ${tc.name} | SolveIt`, description: tc.intro });
  }
  for (const g of GUIDES) {
    r.push({
      path: `/guides/${g.slug}`, page: "guide", params: { slug: g.slug }, priority: 0.6, title: `${g.title} | SolveIt`, description: g.description,
      jsonLd: [{ "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.description, datePublished: g.date, dateModified: g.date, author: { "@type": "Organization", name: SITE.name }, publisher: { "@type": "Organization", name: SITE.name } }],
    });
  }
  return r;
}
