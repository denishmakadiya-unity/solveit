import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { Logo, LogoMark } from "./ui";
import { useConfig } from "../lib/flags";
import { CATEGORIES } from "../registry/categories";
import { SITE } from "../config";

type Theme = "system" | "light" | "dark";

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>("system");
  useEffect(() => {
    try { setThemeState((localStorage.getItem("solveit:theme") as Theme) || "system"); } catch { /* ignore */ }
  }, []);
  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("solveit:theme", t); } catch { /* ignore */ }
    const root = document.documentElement;
    if (t === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
  };
  return [theme, setTheme];
}

function useOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut(); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onOut(); };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [active]);
}

const NAV = [
  { href: "/solve", label: "Solve a Problem", icon: "wand", primary: true },
  { href: "/tools", label: "All Tools", icon: "grid" },
  { href: "/workflows", label: "Workflows", icon: "workflow" },
  { href: "/templates", label: "Templates", icon: "layers", extra: true },
  { href: "/assistant", label: "AI Assistant", icon: "bot", extra: true },
  { href: "/workspace", label: "My Workspace", icon: "folder" },
];

function isActive(path: string, href: string) {
  return path === href || (href !== "/" && path.startsWith(href + "/"));
}

function ThemeMenu() {
  const [theme, setTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  const opts: { v: Theme; label: string; icon: string }[] = [
    { v: "light", label: "Light", icon: "sun" }, { v: "dark", label: "Dark", icon: "moon" }, { v: "system", label: "System", icon: "monitor" },
  ];
  return (
    <div className="rel" ref={ref}>
      <button className="icon-btn" aria-label="Color theme" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name={theme === "dark" ? "moon" : theme === "light" ? "sun" : "monitor"} />
      </button>
      {open && (
        <div className="menu-pop" role="menu" style={{ minWidth: 170 }}>
          {opts.map((o) => (
            <button key={o.v} role="menuitemradio" aria-checked={theme === o.v} onClick={() => { setTheme(o.v); setOpen(false); }}>
              <Icon name={o.icon} size={16} /> {o.label} {theme === o.v && <span className="sub"><Icon name="check" size={15} /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LanguageMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return (
    <div className="rel desktop-only" ref={ref}>
      <button className="icon-btn" aria-label="Language" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} style={{ width: "auto", padding: "0 10px", gap: 6, display: "inline-flex" }}>
        <Icon name="globe" /> <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>EN</span>
      </button>
      {open && (
        <div className="menu-pop" role="menu" style={{ minWidth: 260 }}>
          <button role="menuitemradio" aria-checked="true"><Icon name="check" size={15} /> English <span className="sub">Interface</span></button>
          <hr />
          <div style={{ padding: "6px 10px 8px", fontSize: "0.84rem", color: "var(--muted)" }}>
            The problem solver also understands <b style={{ color: "var(--ink-2)" }}>Hindi, Hinglish and Gujarati</b> — just type naturally.
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderSearch() {
  const [q, setQ] = useState("");
  return (
    <form className="header-search" role="search" action="/search" method="get" onSubmit={(e) => { if (!q.trim()) e.preventDefault(); }}>
      <Icon name="search" size={16} />
      <input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools & tasks" aria-label="Search tools and tasks" />
    </form>
  );
}

export function Header({ path }: { path: string }) {
  const cfg = useConfig();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
  }, [drawer]);
  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={(n.primary ? "nav-primary " : "") + (n.extra ? "nav-extra" : "")} aria-current={isActive(path, n.href) ? "page" : undefined}>
              {n.primary && <Icon name="wand" size={16} />}
              {n.label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <HeaderSearch />
          <LanguageMenu />
          <ThemeMenu />
          {cfg.accountsEnabled && (
            <a href="/account" className="btn btn-secondary btn-sm desktop-only">Sign in</a>
          )}
          <a href="/search" className="icon-btn search-compact" aria-label="Search"><Icon name="search" /></a>
          <button className="icon-btn mobile-only" aria-label="Open menu" aria-expanded={drawer} onClick={() => setDrawer(true)}><Icon name="menu" /></button>
        </div>
      </div>
      {drawer && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="row between" style={{ marginBottom: 10 }}>
              <span className="logo"><LogoMark size={28} /> <span>Solve<b>It</b></span></span>
              <button className="icon-btn" aria-label="Close menu" onClick={() => setDrawer(false)}><Icon name="x" /></button>
            </div>
            {NAV.map((n) => <a key={n.href} href={n.href}><Icon name={n.icon} /> {n.label}</a>)}
            <a href="/guides"><Icon name="book" /> Guides</a>
            <a href="/help"><Icon name="help" /> Help & FAQ</a>
            {cfg.accountsEnabled && <a href="/account"><Icon name="user" /> Sign in</a>}
          </div>
        </>
      )}
    </header>
  );
}

export function TabBar({ path }: { path: string }) {
  const tabs = [
    { href: "/solve", label: "Solve", icon: "wand" },
    { href: "/search", label: "Search", icon: "search" },
    { href: "/tools", label: "Tools", icon: "grid" },
    { href: "/workflows", label: "Workflows", icon: "workflow" },
    { href: "/workspace", label: "Workspace", icon: "folder" },
  ];
  return (
    <div className="tabbar">
      <nav aria-label="Quick navigation">
        {tabs.map((t) => (
          <a key={t.href} href={t.href} aria-current={isActive(path, t.href) || (t.href === "/solve" && path === "/") ? "page" : undefined}>
            <Icon name={t.icon} size={21} />
            {t.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

export function Footer() {
  const year = 2026;
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="stack-sm">
          <Logo />
          <p className="muted" style={{ maxWidth: 34 + "ch", marginTop: 6 }}>{SITE.tagline} Describe your task — SolveIt finds the right tools and builds the fastest solution.</p>
          <p className="row" style={{ gap: 8, marginTop: 8, color: "var(--ok)", fontSize: "0.88rem", fontWeight: 600 }}>
            <Icon name="shield-check" size={16} /> Most tools run entirely in your browser
          </p>
        </div>
        <div>
          <h4>Tools</h4>
          <ul>
            {CATEGORIES.slice(0, 6).map((c) => <li key={c.id}><a href={`/categories/${c.slug}`}>{c.name}</a></li>)}
          </ul>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li><a href="/solve">Solve a Problem</a></li>
            <li><a href="/workflows">Workflows</a></li>
            <li><a href="/workflows/builder">Workflow Builder</a></li>
            <li><a href="/templates">Templates</a></li>
            <li><a href="/assistant">AI Assistant</a></li>
            <li><a href="/workspace">My Workspace</a></li>
          </ul>
        </div>
        <div>
          <h4>Resources</h4>
          <ul>
            <li><a href="/guides">Guides</a></li>
            <li><a href="/help">Help & FAQ</a></li>
            <li><a href="/categories/ai-tools">AI Writing</a></li>
            <li><a href="/categories/business-tools">Business & Data</a></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a href="/about">About Us</a></li>
            <li><a href="/contact">Contact Us</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {year} SolveIt. All rights reserved.</span>
        <span>Free to use · No sign-up required</span>
      </div>
    </footer>
  );
}

export function Layout({ path, children }: { path: string; children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header path={path} />
      <main id="main">{children}</main>
      <Footer />
      <TabBar path={path} />
    </>
  );
}
