import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { FriendLinkIcon } from "~/components/public/friend-link-icon";
import { PublicPageFrame } from "~/components/public/public-page-frame";
import { getSiteTitleFromMatches } from "~/lib/public-context";
import { getDatabase } from "~/server/database.server";
import { listPublicFriendLinks } from "~/server/friend-links.server";

export const meta: MetaFunction = ({ matches }) => [
  { title: `友情链接 · ${getSiteTitleFromMatches(matches)}` },
  { name: "description", content: "一些值得拜访的网站和朋友。" },
];

export async function loader({}: LoaderFunctionArgs) {
  return { links: await listPublicFriendLinks(getDatabase()) };
}

export default function Friends({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <PublicPageFrame>
      {loaderData.links.length ? (
        <ul className="divide-y divide-line border-y border-line">
          {loaderData.links.map((friend) => {
            const hostname = new URL(friend.url).hostname.replace(/^www\./, "");
            return (
              <li key={friend.id}>
                <a
                  href={friend.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-20 items-center gap-4 px-2 py-4 text-ink transition-colors hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:px-3"
                >
                  <FriendLinkIcon src={friend.iconUrl} name={friend.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <strong className="font-display text-base font-semibold transition-colors group-hover:text-accent sm:text-lg">{friend.name}</strong>
                      <span className="font-mono text-xs text-muted">{hostname}</span>
                    </span>
                    {friend.description ? <span className="mt-1.5 line-clamp-2 block text-sm leading-6 text-ink-soft">{friend.description}</span> : null}
                  </span>
                  <span className="shrink-0 text-lg text-muted transition group-hover:translate-x-1 group-hover:text-accent motion-reduce:transition-none" aria-hidden="true">↗</span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center text-sm text-muted">还没有添加友情链接。</div>
      )}
    </PublicPageFrame>
  );
}
