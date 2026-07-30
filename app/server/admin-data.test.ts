import { describe, expect, it, vi } from "vitest";

import { isPostSlugAvailable, listAdminPosts } from "./admin-data.server";

function createDatabaseWithExistingPost(existingPost: { id: number } | null) {
  const first = vi.fn().mockResolvedValue(existingPost);
  const bind = vi.fn().mockReturnValue({ first });
  const prepare = vi.fn().mockReturnValue({ bind });
  return {
    database: { prepare } as unknown as D1Database,
    bind,
  };
}

describe("文章 Slug 可用性", () => {
  it("允许尚未使用的 Slug", async () => {
    const { database } = createDatabaseWithExistingPost(null);
    await expect(isPostSlugAvailable(database, "new-post")).resolves.toBe(true);
  });

  it("拒绝其他文章已经使用的 Slug", async () => {
    const { database } = createDatabaseWithExistingPost({ id: 45 });
    await expect(isPostSlugAvailable(database, "existing-post")).resolves.toBe(false);
  });

  it("编辑文章时排除当前文章 ID", async () => {
    const { database, bind } = createDatabaseWithExistingPost(null);
    await expect(isPostSlugAvailable(database, "current-post", 45)).resolves.toBe(true);
    expect(bind).toHaveBeenCalledWith("current-post", 45, 45);
  });
});

describe("后台文章分页", () => {
  it("按创建时间倒序查询并返回分页信息", async () => {
    const countFirst = vi.fn().mockResolvedValue({ count: 45 });
    const listAll = vi.fn().mockResolvedValue({ results: [] });
    const listBind = vi.fn().mockReturnValue({ all: listAll });
    const prepare = vi.fn()
      .mockReturnValueOnce({ first: countFirst })
      .mockReturnValueOnce({ bind: listBind });
    const database = { prepare } as unknown as D1Database;

    await expect(listAdminPosts(database, 2)).resolves.toEqual({
      posts: [],
      page: 2,
      totalPages: 3,
      totalPosts: 45,
    });
    expect(prepare.mock.calls[1][0]).toContain("ORDER BY created_at DESC, id DESC");
    expect(listBind).toHaveBeenCalledWith(20, 20);
  });

  it("将超出范围的页码钳制到最后一页", async () => {
    const prepare = vi.fn()
      .mockReturnValueOnce({ first: vi.fn().mockResolvedValue({ count: 21 }) })
      .mockReturnValueOnce({ bind: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue({ results: [] }) }) });

    const result = await listAdminPosts({ prepare } as unknown as D1Database, 99);
    expect(result.page).toBe(2);
  });
});
