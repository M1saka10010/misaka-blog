import { useState, type CSSProperties } from "react";
import { Form, Link, NavLink, Outlet, useLocation, type LoaderFunctionArgs, type MetaFunction } from "react-router";

import { ElectricMark } from "~/components/public/electric-mark";
import { CloseIcon, MenuIcon, SearchIcon } from "~/components/public/icons";
import { getDatabase } from "~/server/database.server";
import { getArchiveMonths, getPopularTags, getSiteSettings } from "~/server/db/public";

export async function loader({}: LoaderFunctionArgs) {
  const db = getDatabase();
  const [settings, popularTags, recentArchive] = await Promise.all([
    getSiteSettings(db),
    getPopularTags(db, 8),
    getArchiveMonths(db, 6),
  ]);
  return { settings, popularTags, recentArchive };
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData?.settings.siteTitle ?? "MISAKA.LOG" },
  { name: "description", content: loaderData?.settings.siteDescription ?? "" },
];

function HeaderLink({ to, children }: { to: string; children: React.ReactNode }) {
  return <NavLink to={to} className={({ isActive }) => `relative inline-flex min-h-11 items-center px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${isActive ? "text-accent" : "text-ink-soft hover:text-ink"}`}>{({ isActive }) => <>{isActive && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-accent" />}{children}</>}</NavLink>;
}

export default function PublicLayout({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { settings } = loaderData;
  const backgroundStyle = {
    "--background-image": settings.backgroundUrl ? `url("${settings.backgroundUrl.replaceAll('"', '\\"')}")` : "none",
    "--background-x": `${settings.backgroundPositionX}%`,
    "--background-y": `${settings.backgroundPositionY}%`,
    "--mobile-background-x": `${settings.mobileBackgroundPositionX}%`,
    "--mobile-background-y": `${settings.mobileBackgroundPositionY}%`,
    "--background-overlay": String(settings.backgroundOverlay / 100),
  } as CSSProperties;

  return (
    <div className="site-scene flex min-h-screen min-h-dvh flex-col" style={backgroundStyle} data-theme={settings.themeMode}>
      <a href="#main-content" className="fixed left-4 top-2 z-[60] -translate-y-20 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-transform focus:translate-y-0">跳到正文</a>
      <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-line bg-surface/95 backdrop-blur-md lg:h-16" aria-label="站点导航">
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
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex min-h-12 items-center rounded-lg px-4 text-sm font-medium ${isActive ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-page hover:text-ink"}`}>{item.label}</NavLink>
            ))}
          </nav>
          <p className="absolute bottom-8 left-5 right-5 border-t border-line pt-5 text-xs leading-6 text-muted">{settings.siteDescription}</p>
        </aside>
      </div>

      <div id="main-content" className="relative z-10 flex-1 pt-14 lg:pt-16" key={location.pathname}>
        <Outlet context={loaderData} />
      </div>
      <footer className="relative z-10 mt-auto shrink-0 border-t border-line bg-surface/90 px-5 py-4 text-center text-xs text-muted backdrop-blur-sm">
        <p>© {new Date().getUTCFullYear()} {settings.siteTitle} · Powered by Cloudflare Workers</p>
      </footer>
    </div>
  );
}
