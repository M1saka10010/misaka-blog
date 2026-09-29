import { toIsoDateTime } from "~/lib/date-time";
import { absoluteUrl, postUrl } from "~/lib/site-urls";
import type { PostSummary, SiteSettings } from "~/server/db/public";

// 答案引擎按 @id 把节点拼成一张知识图，所以节点 id 必须全站稳定。
// 每个页面输出一个 @graph 文档，@context 只出现一次。
const SCHEMA_CONTEXT = "https://schema.org";
const LANGUAGE = "zh-CN";

function websiteId(origin: string) {
  return `${origin}/#website`;
}

function personId(origin: string) {
  return `${origin}/#person`;
}

// Google 建议 headline 控制在 110 字符内，超出会被截断成不可控的省略文案
function headline(title: string) {
  return title.length > 110 ? `${title.slice(0, 107)}...` : title;
}

function graph(nodes: Record<string, unknown>[]) {
  return { "@context": SCHEMA_CONTEXT, "@graph": nodes };
}

function buildSiteOwner(origin: string, settings: SiteSettings) {
  return {
    "@type": "Person",
    "@id": personId(origin),
    name: settings.profileHandle || settings.siteTitle,
    url: settings.githubUrl || `${origin}/`,
    ...(settings.avatarUrl ? { image: absoluteUrl(origin, settings.avatarUrl) } : {}),
  };
}

export function buildSiteGraph(origin: string, settings: SiteSettings) {
  return graph([
    {
      "@type": "WebSite",
      "@id": websiteId(origin),
      url: `${origin}/`,
      name: settings.siteTitle,
      description: settings.siteDescription,
      inLanguage: LANGUAGE,
      publisher: { "@id": personId(origin) },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${origin}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    buildSiteOwner(origin, settings),
  ]);
}

export function buildPostGraph(origin: string, settings: SiteSettings, post: PostSummary) {
  const url = postUrl(origin, post.slug);
  const author = { "@id": personId(origin) };
  const section = post.tags[0];
  const published = toIsoDateTime(post.publishedAt);
  const modified = toIsoDateTime(post.updatedAt) || published;

  return graph([
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      url,
      headline: headline(post.title),
      description: post.summary,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      inLanguage: LANGUAGE,
      datePublished: published,
      dateModified: modified,
      author,
      publisher: author,
      isPartOf: { "@id": websiteId(origin) },
      timeRequired: `PT${post.readingMinutes}M`,
      ...(settings.backgroundUrl ? { image: [absoluteUrl(origin, settings.backgroundUrl)] } : {}),
      ...(section ? { articleSection: section.name } : {}),
      ...(post.tags.length ? { keywords: post.tags.map((tag) => tag.name).join(", ") } : {}),
    },
  ]);
}

export function buildCollectionGraph(options: {
  origin: string;
  path: string;
  name: string;
  description: string;
  posts?: PostSummary[];
}) {
  const url = absoluteUrl(options.origin, options.path);
  const posts = options.posts ?? [];

  return graph([
    {
      "@type": "CollectionPage",
      "@id": url,
      url,
      name: options.name,
      description: options.description,
      inLanguage: LANGUAGE,
      isPartOf: { "@id": websiteId(options.origin) },
      ...(posts.length
        ? {
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: posts.length,
              itemListElement: posts.map((post, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: post.title,
                url: postUrl(options.origin, post.slug),
              })),
            },
          }
        : {}),
    },
  ]);
}
