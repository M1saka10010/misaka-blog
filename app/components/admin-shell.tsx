import { Form, Link, NavLink } from "react-router";
import type { ReactNode } from "react";

const navigation = [
  { to: "/admin", label: "概览", end: true },
  { to: "/admin/posts", label: "文章" },
  { to: "/admin/tags", label: "标签" },
  { to: "/admin/friends", label: "友情链接" },
  { to: "/admin/settings", label: "设置" },
];

export function AdminShell({ children, login }: { children: ReactNode; login: string }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:hidden">
        <Link to="/admin" className="font-mono text-sm font-semibold tracking-wider">MISAKA.LOG / ADMIN</Link>
        <Link to="/" className="text-sm text-slate-600 hover:text-violet-700">查看博客</Link>
      </header>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-6 lg:flex lg:flex-col">
        <Link to="/admin" className="font-mono text-sm font-semibold tracking-wider text-slate-950">
          <span className="mr-2 text-violet-600">⌁</span>MISAKA.LOG
        </Link>
        <nav className="mt-12 flex flex-col gap-1">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-200 pt-5">
          <p className="truncate text-xs text-slate-500">GitHub · {login}</p>
          <div className="mt-3 flex gap-4 text-sm">
            <Link to="/" className="text-slate-600 hover:text-violet-700">查看博客</Link>
            <Form method="post" action="/auth/logout">
              <button type="submit" className="text-slate-600 hover:text-rose-600">退出</button>
            </Form>
          </div>
        </div>
      </aside>
      <main className="mx-auto max-w-6xl px-5 py-8 lg:ml-64 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}

export function AdminPageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-xs tracking-widest text-violet-700">CONTROL PANEL</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
