import type { ReactNode } from "react";
import { useOutletContext } from "react-router";

import type { PublicLayoutData } from "~/lib/public-context";
import { ArchiveSection, TagSection } from "./sidebar-sections";
import { ProfileCard } from "./profile-card";

export function PublicPageFrame({
  children,
  narrow = false,
  stickySidebar = true,
}: {
  children: ReactNode;
  narrow?: boolean;
  stickySidebar?: boolean;
}) {
  const { settings, popularTags, recentArchive } = useOutletContext<PublicLayoutData>();

  return (
    <div className={`mx-auto w-full px-5 pb-16 pt-6 md:px-8 lg:pb-24 lg:pt-10 ${narrow ? "max-w-6xl" : "max-w-7xl"}`}>
      <div className="lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-10 xl:gap-16">
        <aside
          className={`hidden lg:block lg:pr-2 ${stickySidebar ? "sidebar-scrollbar-hidden lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain" : ""}`}
          aria-label="博客资料"
        >
          <ProfileCard settings={settings} />
          <div className="mt-6 rounded-xl border border-line bg-surface/95 p-5 shadow-soft backdrop-blur-sm">
            <TagSection tags={popularTags} />
            <div className="mt-6"><ArchiveSection months={recentArchive} /></div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-8 lg:hidden"><ProfileCard settings={settings} /></div>
          {children}
          <div className="mt-14 space-y-8 rounded-xl border border-line bg-surface/95 p-5 shadow-soft backdrop-blur-sm lg:hidden">
            <TagSection tags={popularTags.slice(0, 6)} />
            <ArchiveSection months={recentArchive.slice(0, 6)} />
          </div>
        </main>
      </div>
    </div>
  );
}
