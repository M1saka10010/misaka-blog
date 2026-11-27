import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkPages } from './release.mjs';

export async function bootstrap(env, { request = fetch, build, migrate, deploy, check = checkPages }) {
  const { WORKER_NAME: worker, D1_DATABASE_NAME: name, PUBLIC_SITE_URL: origin, CLOUDFLARE_ACCOUNT_ID: account } = env;
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(worker ?? '') || worker !== env.CONFIRM_WORKER) throw new Error('Confirm the exact new Worker name');
  if (env.EXISTING_D1_ID || !/^[\w-]{1,64}$/.test(name ?? '')) throw new Error('Set a new database name; D1_DATABASE_ID must be unset');
  if (!/^[a-f\d]{32}$/i.test(account ?? '') || !env.CLOUDFLARE_API_TOKEN) throw new Error('Check Cloudflare credentials');
  if (new URL(origin).origin !== origin || !origin.startsWith('https://')) throw new Error('Set a canonical HTTPS PUBLIC_SITE_URL without a trailing slash');
  if (!env.OAUTH_CLIENT_ID?.trim() || !env.OAUTH_CLIENT_SECRET?.trim() || !/^[\w-]+$/.test(env.ADMIN_LOGIN ?? '') || !/^[1-9]\d*$/.test(env.ADMIN_ID ?? '')) throw new Error('Set blog OAuth credentials and the allowed administrator login and numeric ID');

  async function api(path, body, allowMissing = false) {
    const response = await request(`https://api.cloudflare.com/client/v4/accounts/${account}/${path}`, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body),
    });
    const data = await response.json();
    if (allowMissing && response.status === 404 && data.success === false && data.errors?.length === 1 && data.errors[0].code === 10007) return null;
    if (!response.ok || data.success !== true || data.result == null) throw new Error(`Cloudflare request failed (HTTP ${response.status}); inspect resource status`);
    return data.result;
  }
  async function requireNewWorker() {
    if (await api(`workers/scripts/${worker}/settings`, undefined, true) !== null) throw new Error('Worker already exists');
  }
  await requireNewWorker();
  const databases = await api(`d1/database?name=${encodeURIComponent(name)}`);
  if (!Array.isArray(databases) || databases.length !== 0) throw new Error('Cannot confirm the database name is unused');
  const db = await api('d1/database', { name });
  if (db.name !== name || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(db.uuid ?? '')) throw new Error('Unexpected D1 creation response; inspect Cloudflare before retrying');
  build(worker, { database_name: name, database_id: db.uuid }, {
    PUBLIC_SITE_URL: origin, GITHUB_OAUTH_CLIENT_ID: env.OAUTH_CLIENT_ID, GITHUB_ALLOWED_LOGIN: env.ADMIN_LOGIN, GITHUB_ALLOWED_USER_ID: env.ADMIN_ID,
  });
  migrate();
  await requireNewWorker();
  deploy({ GITHUB_OAUTH_CLIENT_SECRET: env.OAUTH_CLIENT_SECRET, SESSION_SECRET: randomBytes(48).toString('base64url') });
  await check(origin);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const source = readFileSync('wrangler.example.jsonc', 'utf8');
  if (readFileSync('wrangler.jsonc', 'utf8') !== source) throw new Error('Refusing to replace a non-template configuration');
  const childEnv = { ...process.env };
  delete childEnv.OAUTH_CLIENT_SECRET;
  const run = (cmd, args, env = childEnv) => execFileSync(cmd, args, { env, stdio: 'inherit' });
  const wrangler = './node_modules/.bin/wrangler';
  const bundle = 'build/server/wrangler.json';
  await bootstrap(process.env, {
    build(worker, db, vars) {
      if (process.env.GITHUB_ACTIONS === 'true') console.log(`::add-mask::${db.database_id}`);
      const config = JSON.parse(source);
      config.name = worker;
      Object.assign(config.d1_databases[0], db);
      config.vars = vars;
      writeFileSync('wrangler.jsonc', JSON.stringify(config, null, 2));
      const buildEnv = { ...childEnv };
      delete buildEnv.CLOUDFLARE_API_TOKEN;
      run('npm', ['run', 'build'], buildEnv);
      const built = JSON.parse(readFileSync(bundle, 'utf8'));
      if (built.name !== worker || !built.d1_databases?.some(b => b.binding === 'DB' && b.database_id === db.database_id)) throw new Error('Built Worker or D1 binding mismatch');
    },
    migrate: () => run(wrangler, ['d1', 'migrations', 'apply', 'DB', '--remote', '--config', 'wrangler.jsonc']),
    deploy(secrets) {
      const dir = mkdtempSync(join(tmpdir(), 'blog-secrets-'));
      try {
        const path = join(dir, 'secrets.json');
        writeFileSync(path, JSON.stringify(secrets), { mode: 0o600, flag: 'wx' });
        run(wrangler, ['deploy', '--config', bundle, '--keep-vars', '--strict', '--secrets-file', path]);
      } finally { rmSync(dir, { recursive: true, force: true }); }
    },
  });
  console.log('Bootstrap complete. Copy the new D1 UUID from Cloudflare to the production D1_DATABASE_ID secret.');
}
