# MISAKA.LOG

基于 Cloudflare Workers、React Router、D1 和 Milkdown 的个人博客。

## 功能

- 响应式公开博客、文章分页、标签、归档和全文搜索。
- Milkdown 富文本编辑器，Markdown 作为文章源数据。
- GitHub OAuth 单管理员登录。
- 后台管理文章、标签、友情链接和站点设置。
- 背景、头像和正文图片使用外部 HTTPS 图床链接。
- 友情链接默认读取目标站点的 `/favicon.ico`。

## 从 Sonic 迁移

推荐直接使用 Sonic 的 SQLite 数据库，这样可以完整保留文章、标签及其关联。先停止 Sonic 或复制一份数据库快照，再把副本放到项目根目录运行：

```bash
node scripts/migrate-sonic.mjs --input ./sonic.db
```

支持 `.db`、`.sqlite` 和 `.sqlite3`。迁移器以只读模式打开源数据库，不会修改 Sonic 数据。Sonic 的 JSON 完整数据导出仍可作为备用输入，但部分版本可能漏掉 `tag` 表，无法恢复标签名称。

命令只生成 `sonic-import.sql` 和 `sonic-import-report.json`，不会直接修改数据库。请先阅读报告，尤其检查富文本草稿、重复 Slug、失效标签关系和正文图片地址。

初始化并导入本地 D1：

```bash
npm run db:migrate:local
npx wrangler d1 execute DB --local --file ./sonic-import.sql
```

确认本地文章、日期、标签、图片和友链均正确后，再备份并导入远程 D1。重复生成文件时需显式添加 `--force`，避免误覆盖已经审阅过的迁移结果：

```bash
node scripts/migrate-sonic.mjs --input ./sonic.db --force
```

转换规则：

- Sonic 已发布文章保持发布状态；草稿和私密文章转为草稿；回收站文章跳过并写入报告。
- 只迁移 Sonic `type=POST` 的文章；`type=SHEET` 的“关于我”等独立页面跳过并写入报告。
- 只导入 Sonic 原有标签及文章标签关系，分类及文章分类关系直接丢弃。
- Markdown 文章重新生成安全 HTML 与阅读时间；富文本文章默认转为草稿并等待人工检查。
- 不导入友情链接和基础站点信息。
- 评论、附件记录、日志、相册、独立页面等其他整站数据不会导入，数量会明确写入报告。

## 环境要求

- Node.js 24 或更高版本。
- npm 11 或更高版本。
- Cloudflare 账户。

## 本地开发

安装依赖：

```bash
npm install
```

复制 Wrangler 配置模板：

```bash
cp wrangler.example.jsonc wrangler.jsonc
```

本地开发可以暂时保留模板中的 D1 占位 ID。Wrangler 会使用本地模拟数据库，不会连接生产 D1。

复制本地环境变量模板：

```bash
cp .dev.vars.example .dev.vars
```

填写 `.dev.vars`：

```dotenv
GITHUB_OAUTH_CLIENT_ID="本地 GitHub OAuth Client ID"
GITHUB_OAUTH_CLIENT_SECRET="本地 GitHub OAuth Client Secret"
GITHUB_ALLOWED_LOGIN="允许登录的 GitHub 用户名"
GITHUB_ALLOWED_USER_ID="GitHub 数字用户 ID"
TIMEZONE="Asia/Shanghai"
SESSION_SECRET="至少 32 字节的随机值"
```

初始化本地 D1 并启动开发服务器：

```bash
npm run db:migrate:local
npm run dev
```

本地 GitHub OAuth App 回调地址：

```text
http://localhost:5173/auth/github/callback
```

本项目使用两类本地环境文件：

| 文件 | 用途 | 是否提交 |
| --- | --- | --- |
| `.dev.vars` | 博客本地运行所需的 GitHub OAuth 与会话变量 | 否 |
| `.wrangler.env` | Wrangler 部署所需的 Cloudflare API Token 与 Account ID | 否 |
| `.dev.vars.example` / `.wrangler.env.example` | 配置模板 | 是 |

## 使用 Wrangler 部署

### 1. 创建本地 Wrangler 配置

从仓库中的模板复制实际部署配置：

```bash
cp wrangler.example.jsonc wrangler.jsonc
```

`wrangler.jsonc` 已被 `.gitignore` 忽略，用于保存当前部署环境的 D1 Database ID。不要直接修改 `wrangler.example.jsonc` 中的占位值。

### 2. 配置 Cloudflare API Token

创建一个具备 Workers Scripts Edit、D1 Edit 和 Account Settings Read 权限的 Cloudflare API Token，然后复制部署认证模板：

```bash
cp .wrangler.env.example .wrangler.env
```

填写本地 `.wrangler.env`：

```dotenv
CLOUDFLARE_API_TOKEN="你的 Cloudflare API Token"
CLOUDFLARE_ACCOUNT_ID="你的 Cloudflare Account ID"
```

`.wrangler.env` 已被 `.gitignore` 忽略。它只用于 Wrangler CLI 调用 Cloudflare API，不会被 Vite 自动加载或注入博客运行时，也不要将其提交到 Git。

验证身份：

```bash
npm run cf:whoami
```

确认显示的 Cloudflare 账户正确后再继续。SSH 环境不需要执行 `wrangler login`。

### 3. 创建 D1 数据库

```bash
npx wrangler d1 create misaka-blog --env-file .wrangler.env
```

命令会返回数据库名称和 `database_id`。打开本地的 `wrangler.jsonc`，将占位值替换为真实 ID：

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "misaka-blog",
    "database_id": "你的真实 D1 Database ID",
    "migrations_dir": "migrations"
  }
]
```

注意：

- `binding` 必须保持为 `DB`，应用通过 `env.DB` 访问数据库。
- `database_name` 应与创建的 D1 名称一致。
- `wrangler.jsonc` 已被 `.gitignore` 忽略，不会提交用户自己的数据库 ID。
- `keep_vars: true` 会保留在 Cloudflare 控制台配置的普通运行时变量。
- 不要把 OAuth Secret 或 `SESSION_SECRET` 写入 Wrangler 配置。

### 4. 初始化远程 D1

```bash
npm run db:migrate:remote
```

Wrangler 会按顺序应用 `migrations/` 中的 SQL。首次部署必须执行该步骤，否则 Worker 会因缺少数据表而无法读取内容。

查看远程迁移状态：

```bash
npx wrangler d1 migrations list DB --remote --env-file .wrangler.env
```

### 5. 验证并完成首次部署

```bash
npm run typecheck
npm test
npm run deploy
```

`npm run deploy` 会先执行 React Router 生产构建，再通过 Wrangler 上传 Worker 服务端代码和浏览器静态资源。

首次部署时 GitHub OAuth 尚未配置是正常的。部署成功后，终端会显示类似地址：

```text
https://misaka-blog.<你的-workers子域>.workers.dev
```

### 6. 创建生产 GitHub OAuth App

在 GitHub 中进入：

```text
Settings → Developer settings → OAuth Apps → New OAuth App
```

使用首次部署得到的 Workers 域名：

```text
Homepage URL:
https://misaka-blog.<你的-workers子域>.workers.dev

Authorization callback URL:
https://misaka-blog.<你的-workers子域>.workers.dev/auth/github/callback
```

如果部署后修改了域名，需要同步更新 OAuth App 的回调地址。

GitHub 数字用户 ID 可以通过以下地址查询：

```text
https://api.github.com/users/<你的GitHub用户名>
```

响应中的 `id` 即为 `GITHUB_ALLOWED_USER_ID`。

### 7. 配置 Worker 运行时变量

非敏感变量可以在 Cloudflare 控制台的 Worker Variables 中添加：

```text
GITHUB_OAUTH_CLIENT_ID
GITHUB_ALLOWED_LOGIN
GITHUB_ALLOWED_USER_ID
PUBLIC_SITE_URL
TIMEZONE
```

这些是博客运行时变量，与 `.wrangler.env` 中的 Wrangler 部署凭据不同。
使用反向代理或自定义域名时，将 `PUBLIC_SITE_URL` 设置为公开站点 Origin，例如
`https://blog.example.com`。留空时回退到 Worker 收到的请求地址，适用于本地开发和直接访问 Workers 域名。
`TIMEZONE` 使用 IANA 时区名称控制文章日期和页脚年份的展示，例如 `Asia/Shanghai`；未配置或值无效时默认使用 `Asia/Shanghai`。

敏感值使用 Wrangler Secret：

```bash
npx wrangler secret put GITHUB_OAUTH_CLIENT_SECRET --env-file .wrangler.env
npx wrangler secret put SESSION_SECRET --env-file .wrangler.env
```

可以生成随机会话密钥：

```bash
openssl rand -base64 48
```

Secret 不会写入项目文件，也不要保存到 Git 仓库。

普通变量和 Secret 保存后会应用到 Worker。访问以下地址验证后台登录：

```text
https://misaka-blog.<你的-workers子域>.workers.dev/admin/login
```

### 8. 部署后检查

检查以下页面：

```text
/                 首页
/tags             标签
/archive          归档
/friends          友情链接
/search?q=test    搜索
/admin/login      后台登录
```

## 后续更新

普通代码更新：

```bash
npm run typecheck
npm test
npm run deploy
```

如果版本新增了 D1 migration，应先迁移数据库，再部署代码：

```bash
npm run db:migrate:remote
npm run deploy
```

重新部署不会清空 D1 数据。

## 常用命令

```bash
# 验证 Cloudflare API Token
npm run cf:whoami

# 初始化本地 D1
npm run db:migrate:local

# 迁移远程 D1（自动读取 .wrangler.env）
npm run db:migrate:remote

# 类型检查与测试
npm run typecheck
npm test

# 构建并部署（自动读取 .wrangler.env）
npm run deploy
```
