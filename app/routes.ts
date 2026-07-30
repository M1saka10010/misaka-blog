import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  layout("routes/public-layout.tsx", [
    index("routes/home.tsx"),
    route("posts/:slug", "routes/post-detail.tsx"),
    route("tags", "routes/tags.tsx"),
    route("tags/:slug", "routes/tag-detail.tsx"),
    route("archive", "routes/archive.tsx"),
    route("archive/:year/:month", "routes/archive-month.tsx"),
    route("friends", "routes/friends.tsx"),
    route("search", "routes/search.tsx"),
  ]),
  route("admin/login", "routes/admin-login.tsx"),
  route("auth/github", "routes/auth-github.ts"),
  route("auth/github/callback", "routes/auth-github-callback.ts"),
  route("auth/logout", "routes/auth-logout.ts"),
  route("admin", "routes/admin-index.tsx"),
  route("admin/posts", "routes/admin-posts.tsx"),
  route("admin/posts/new", "routes/admin-post-new.tsx"),
  route("admin/posts/:id/edit", "routes/admin-post-edit.tsx"),
  route("admin/tags", "routes/admin-tags.tsx"),
  route("admin/friends", "routes/admin-friends.tsx"),
  route("admin/settings", "routes/admin-settings.tsx"),
] satisfies RouteConfig;
