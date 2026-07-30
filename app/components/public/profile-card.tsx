import { useEffect, useRef, useState } from "react";

import type { SiteSettings } from "~/server/db/public";
import { GithubIcon, MailIcon } from "./icons";

export function ProfileCard({ settings }: { settings: SiteSettings }) {
  const [expanded, setExpanded] = useState(false);
  const [collapsible, setCollapsible] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const profile = profileRef.current;
    if (!profile) return;

    const detectOverflow = () => setCollapsible(profile.scrollHeight > profile.clientHeight + 1);
    detectOverflow();
    const observer = new ResizeObserver(detectOverflow);
    observer.observe(profile);
    return () => observer.disconnect();
  }, [settings.profileRenderedHtml, expanded]);

  return (
    <section className="rounded-xl border border-line bg-surface/95 p-5 shadow-soft backdrop-blur-sm" aria-labelledby="profile-title">
      <div className="flex items-center gap-4">
        {settings.avatarUrl ? (
          <img className="h-16 w-16 rounded-xl border border-line object-cover" src={settings.avatarUrl} alt="站主头像" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-xl border border-accent/25 bg-accent-soft font-display text-xl font-semibold text-accent" aria-hidden="true">
            M
          </div>
        )}
        <div className="min-w-0">
          <h2 id="profile-title" className="truncate font-display text-lg font-semibold tracking-tight text-ink">{settings.siteTitle}</h2>
          {settings.profileHandle && <p className="mt-1 truncate font-mono text-xs text-muted">@{settings.profileHandle.replace(/^@/, "")}</p>}
        </div>
      </div>

      <div className="mt-5">
        {settings.profileRenderedHtml ? (
          <div className="relative">
            <div
              ref={profileRef}
              className={`profile-rich-text overflow-hidden text-sm leading-7 text-ink-soft transition-[max-height] duration-300 motion-reduce:transition-none ${expanded ? "max-h-[80rem]" : "max-h-36 lg:max-h-40"}`}
              dangerouslySetInnerHTML={{ __html: settings.profileRenderedHtml }}
            />
            {collapsible && !expanded ? <span className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent" aria-hidden="true" /> : null}
          </div>
        ) : (
          <p className="text-sm leading-7 text-ink-soft">{settings.siteDescription}</p>
        )}
        {settings.profileRenderedHtml && (collapsible || expanded) && (
          <button
            type="button"
            className="mt-2 min-h-11 text-sm font-medium text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? "收起" : "展开"}
          </button>
        )}
      </div>

      {(settings.githubUrl || settings.email) && (
        <div className="mt-4 flex gap-2 border-t border-line pt-4">
          {settings.githubUrl && (
            <a className="grid h-11 w-11 place-items-center rounded-lg text-muted transition-colors hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" href={settings.githubUrl} target="_blank" rel="noreferrer" aria-label="访问 GitHub">
              <GithubIcon className="h-5 w-5" />
            </a>
          )}
          {settings.email && (
            <a className="grid h-11 w-11 place-items-center rounded-lg text-muted transition-colors hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" href={`mailto:${settings.email}`} aria-label="发送邮件">
              <MailIcon className="h-5 w-5" />
            </a>
          )}
        </div>
      )}
    </section>
  );
}
