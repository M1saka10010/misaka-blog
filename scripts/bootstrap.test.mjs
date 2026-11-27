import { expect, it, vi } from 'vitest';
import { bootstrap } from './bootstrap.mjs';
const env = { CONFIRM_WORKER: 'blog', WORKER_NAME: 'blog', D1_DATABASE_NAME: 'blog-db', PUBLIC_SITE_URL: 'https://blog.example.test', CLOUDFLARE_ACCOUNT_ID: 'f'.repeat(32), CLOUDFLARE_API_TOKEN: 'dummy-token', OAUTH_CLIENT_ID: 'client', OAUTH_CLIENT_SECRET: 'dummy-secret', ADMIN_LOGIN: 'test', ADMIN_ID: '42' };
const uuid = '11111111-1111-4111-8111-111111111111';
const ok = result => Response.json({ success: true, result });
const absent = () => Response.json({ success: false, errors: [{ code: 10007 }] }, { status: 404 });
const fixture = replies => ({ request: vi.fn(async () => { if (!replies.length) throw new Error('Unexpected API call'); return replies.shift(); }), build: vi.fn(), migrate: vi.fn(), deploy: vi.fn(), check: vi.fn() });
it('builds for the created D1 and keeps credentials out of the build configuration', async () => {
  const f = fixture([absent(), ok([]), ok({ uuid, name: 'blog-db' }), absent()]);
  await bootstrap(env, f);
  expect(f.build).toHaveBeenCalledWith('blog', { database_name: 'blog-db', database_id: uuid }, { PUBLIC_SITE_URL: env.PUBLIC_SITE_URL, GITHUB_OAUTH_CLIENT_ID: 'client', GITHUB_ALLOWED_LOGIN: 'test', GITHUB_ALLOWED_USER_ID: '42' });
  const steps = [f.build, f.migrate, f.deploy, f.check].map(fn => fn.mock.invocationCallOrder[0]);
  expect(steps).toEqual([...steps].sort((a,b) => a-b));
  expect(f.deploy).toHaveBeenCalledWith({ GITHUB_OAUTH_CLIENT_SECRET: 'dummy-secret', SESSION_SECRET: expect.stringMatching(/^[\w-]{64}$/) });
  expect(f.check).toHaveBeenCalledWith(env.PUBLIC_SITE_URL);
});
it.each([[ok({})], [absent(), ok([{ uuid }])], [Response.json({}, { status: 403 })], [Response.json({}, { status: 404 })]])('does not create anything if absence is unconfirmed', async (...responses) => {
  const f = fixture(responses); await expect(bootstrap(env, f)).rejects.toThrow();
  expect(f.request.mock.calls.every(([, opts]) => opts.method === 'GET')).toBe(true); expect(f.build).not.toHaveBeenCalled();
});
it.each([{ CONFIRM_WORKER: 'wrong' }, { EXISTING_D1_ID: uuid }, { OAUTH_CLIENT_SECRET: '' }, { ADMIN_ID: '' }])('rejects unsafe inputs without a network call', async override => {
  const f = fixture([]); await expect(bootstrap({ ...env, ...override }, f)).rejects.toThrow(); expect(f.request).not.toHaveBeenCalled();
});
it('does not deploy over a Worker that appeared during the build', async () => {
  const f = fixture([absent(), ok([]), ok({ uuid, name: 'blog-db' }), ok({})]); await expect(bootstrap(env, f)).rejects.toThrow('Worker already exists'); expect(f.deploy).not.toHaveBeenCalled();
});
