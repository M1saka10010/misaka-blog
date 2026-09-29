import { useEffect, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { Form, Link, NavLink, Outlet, useLocation, useNavigation, type LoaderFunctionArgs } from "react-router";

import { ElectricMark } from "~/components/public/electric-mark";
import { CloseIcon, MenuIcon, MonitorIcon, MoonIcon, SearchIcon, SunIcon } from "~/components/public/icons";
import { normalizeTimeZone } from "~/lib/public-context";
import { getDatabase } from "~/server/database.server";
import { getArchiveMonths, getPopularTags, getSiteSettings } from "~/server/db/public";
import { getEnvironment } from "~/server/env.server";

export async function loader({}: LoaderFunctionArgs) {
  const db = getDatabase();
  const timeZone = normalizeTimeZone(getEnvironment().TIMEZONE);
  const [settings, popularTags, recentArchive] = await Promise.all([
    getSiteSettings(db),
    getPopularTags(db, 8),
    getArchiveMonths(db, 6),
  ]);
  return { settings, popularTags, recentArchive, timeZone };
}

type ThemeChoice = "system" | "light" | "dark";

const THEME_OPTIONS = [
  { value: "system", label: "跟随系统", Icon: MonitorIcon },
  { value: "light", label: "浅色", Icon: SunIcon },
  { value: "dark", label: "深色", Icon: MoonIcon },
] as const;

function ThemeSwitcher({ value, onChange }: { value: ThemeChoice; onChange: (next: ThemeChoice) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-line p-0.5" role="group" aria-label="主题切换">
      {THEME_OPTIONS.map(({ value: option, label, Icon }) => (
        <button
          key={option}
          type="button"
          title={label}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`grid h-9 w-9 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:h-8 md:w-8 ${value === option ? "bg-accent-soft text-accent-ink" : "text-muted hover:text-ink"}`}
        >
          <Icon className="h-4 w-4" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}

function HeaderLink({ to, children }: { to: string; children: React.ReactNode }) {
  return <NavLink viewTransition to={to} className={({ isActive }) => `relative inline-flex min-h-11 items-center px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${isActive ? "text-accent-ink" : "text-ink-soft hover:text-ink"}`}>{({ isActive }) => <>{isActive && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-accent" />}{children}</>}</NavLink>;
}

export default function PublicLayout({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>(loaderData.settings.themeMode);
  const location = useLocation();
  const navigation = useNavigation();
  const { settings, timeZone } = loaderData;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 读者主题偏好：与 root.tsx 内联脚本读取同一个 localStorage 键
  useEffect(() => {
    try {
      const stored = localStorage.getItem("misaka-theme");
      if (stored === "light" || stored === "dark" || stored === "system") setTheme(stored);
    } catch { /* localStorage 不可用时保持站主默认 */ }
  }, []);

  // 背景图预加载完成后移除 pending 标记，触发主色 → 图像的淡入
  useEffect(() => {
    const scene = document.querySelector(".site-scene");
    if (!settings.backgroundUrl || !scene?.hasAttribute("data-bg-pending")) return;
    const image = new Image();
    const done = () => scene.removeAttribute("data-bg-pending");
    image.onload = done;
    image.onerror = done;
    image.src = settings.backgroundUrl;
    return () => { image.onload = null; image.onerror = null; };
  }, [settings.backgroundUrl]);

  const backgroundStyle = {
    "--background-image": settings.backgroundUrl ? `url("${settings.backgroundUrl.replaceAll('"', '\\"')}")` : "none",
    "--background-x": `${settings.backgroundPositionX}%`,
    "--background-y": `${settings.backgroundPositionY}%`,
    "--mobile-background-x": `${settings.mobileBackgroundPositionX}%`,
    "--mobile-background-y": `${settings.mobileBackgroundPositionY}%`,
    "--background-overlay": String(settings.backgroundOverlay / 100),
    ...(settings.backgroundColor ? { "--background-color": settings.backgroundColor } : {}),
  } as CSSProperties;

  const backToTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  const chooseTheme = (next: ThemeChoice) => {
    try { localStorage.setItem("misaka-theme", next); } catch { /* 忽略写入失败 */ }
    const apply = () => flushSync(() => setTheme(next));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & { startViewTransition?: (callback: () => void) => void };
    if (doc.startViewTransition && !reduce) doc.startViewTransition(apply);
    else apply();
  };

  return (
    <div
      className="site-scene flex min-h-screen min-h-dvh flex-col"
      style={backgroundStyle}
      data-theme={theme}
      data-has-bg={settings.backgroundUrl ? "true" : undefined}
      suppressHydrationWarning
    >
      <a href="#main-content" className="fixed left-4 top-2 z-[60] -translate-y-20 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-transform focus:translate-y-0">跳到正文</a>
      {navigation.state !== "idle" && <span className="nav-progress" aria-hidden="true" />}
      {settings.backgroundUrl ? <span className="site-bg-image" aria-hidden="true" /> : null}
      <header className={`fixed inset-x-0 top-0 z-40 h-14 border-b border-line bg-surface/95 backdrop-blur-md transition-shadow duration-200 lg:h-16 ${scrolled ? "header-scrolled" : ""}`} aria-label="站点导航">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <button type="button" className="grid h-11 w-11 place-items-center rounded-lg text-ink lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => setDrawerOpen(true)} aria-label="打开导航" aria-expanded={drawerOpen}>
              <MenuIcon className="h-5 w-5" />
            </button>
            <Link to="/" className="flex min-h-11 items-center gap-3 rounded-lg px-1 font-display text-base font-semibold tracking-tight text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 lg:text-lg">
              <ElectricMark /> {settings.siteTitle}
            </Link>
          </div>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="主导航">
            <HeaderLink to="/">文章</HeaderLink>
            <HeaderLink to="/tags">标签</HeaderLink>
            <HeaderLink to="/archive">归档</HeaderLink>
            <HeaderLink to="/friends">友链</HeaderLink>
          </nav>
          <Form method="get" action="/search" className="hidden items-center lg:flex">
            <label className="relative block">
              <span className="sr-only">搜索文章</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input name="q" className="h-10 w-48 rounded-lg border border-line bg-page/70 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" placeholder="搜索文章" />
            </label>
          </Form>
          <Link to="/search" className="grid h-11 w-11 place-items-center rounded-lg text-ink lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="搜索文章"><SearchIcon className="h-5 w-5" /></Link>
        </div>
      </header>

      <div className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
        <button type="button" className={`absolute inset-0 bg-n-950/55 transition-opacity duration-200 motion-reduce:transition-none ${drawerOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setDrawerOpen(false)} aria-label="关闭导航遮罩" />
        <aside className={`absolute inset-y-0 left-0 w-[min(20rem,86vw)] border-r border-line bg-surface p-5 shadow-2xl transition-transform duration-300 motion-reduce:transition-none ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="移动导航">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-3 font-display font-semibold text-ink"><ElectricMark />{settings.siteTitle}</span>
            <button type="button" className="grid h-11 w-11 place-items-center rounded-lg text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => setDrawerOpen(false)} aria-label="关闭导航"><CloseIcon className="h-5 w-5" /></button>
          </div>
          <nav className="mt-8 space-y-1" onClick={() => setDrawerOpen(false)}>
            {[{ to: "/", label: "最近文章" }, { to: "/tags", label: "全部标签" }, { to: "/archive", label: "文章归档" }, { to: "/friends", label: "友情链接" }, { to: "/search", label: "搜索" }].map((item) => (
              <NavLink key={item.to} viewTransition to={item.to} className={({ isActive }) => `flex min-h-12 items-center rounded-lg px-4 text-sm font-medium ${isActive ? "bg-accent-soft text-accent-ink" : "text-ink-soft hover:bg-page hover:text-ink"}`}>{item.label}</NavLink>
            ))}
          </nav>
          <p className="absolute bottom-8 left-5 right-5 border-t border-line pt-5 text-xs leading-6 text-muted">{settings.siteDescription}</p>
        </aside>
      </div>

      <div id="main-content" className="page-enter relative z-10 flex-1 pt-14 lg:pt-16" key={location.pathname}>
        <Outlet context={loaderData} />
      </div>
      <footer className="relative z-10 mt-auto shrink-0 border-t border-line bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-5 text-xs text-muted md:flex-row md:px-8">
          <p>© {new Intl.DateTimeFormat("zh-CN", { year: "numeric", timeZone }).format(new Date())} {settings.siteTitle} · Powered by Cloudflare Workers</p>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <nav className="flex items-center gap-1" aria-label="页脚导航">
              {[{ to: "/", label: "文章" }, { to: "/tags", label: "标签" }, { to: "/archive", label: "归档" }, { to: "/friends", label: "友链" }].map((item) => (
                <Link key={item.to} viewTransition to={item.to} className="inline-flex min-h-11 items-center rounded-lg px-2.5 transition-colors hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-9">{item.label}</Link>
              ))}
              <a href="/feed.xml" className="inline-flex min-h-11 items-center rounded-lg px-2.5 transition-colors hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-9">订阅</a>
            </nav>
            <span aria-hidden="true" className="mx-2 h-3 w-px bg-line" />
            <ThemeSwitcher value={theme} onChange={chooseTheme} />
            <span aria-hidden="true" className="mx-2 h-3 w-px bg-line" />
            <button type="button" onClick={backToTop} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 font-medium transition-colors hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-9" aria-label="回到页面顶部">
              回到顶部 <span aria-hidden="true" className="text-sm leading-none">↑</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
