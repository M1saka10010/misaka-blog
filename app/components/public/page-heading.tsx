import type { ReactNode } from "react";

import { ElectricMark } from "./electric-mark";

export function PageHeading({ eyebrow, title, description, action, compact = false }: { eyebrow: string; title: string; description?: string; action?: ReactNode; compact?: boolean }) {
  return (
    <header className="mb-8 border-b border-line pb-8 lg:mb-10">
      <div className="flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        <ElectricMark className="shrink-0" /> {eyebrow}
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <h1 className={`font-display font-semibold leading-tight tracking-tight text-ink ${compact ? "text-2xl lg:text-3xl" : "text-3xl lg:text-[2.625rem]"}`}>{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-soft lg:text-base">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
