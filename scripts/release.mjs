import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function currentVersion(deployment) {
  const versions = deployment?.versions;
  if (versions?.length !== 1 || versions[0].percentage !== 100 || !versions[0].version_id) {
    throw new Error('Recovery requires an existing single-version Worker deployment at 100% traffic');
  }
  return versions[0].version_id;
}

export async function release({ run, check, record }) {
  const version = currentVersion(JSON.parse(run(['deployments', 'status', '--json'])));
  const { bookmark } = JSON.parse(run(['d1', 'time-travel', 'info', 'DB', '--json']));
  if (typeof bookmark !== 'string' || !bookmark) throw new Error('Missing D1 recovery bookmark');
  record(`Recovery point: Worker version ${version}; D1 bookmark ${bookmark}`);

  let deploymentAttempted = false;
  try {
    run(['d1', 'migrations', 'apply', 'DB', '--remote']);
    deploymentAttempted = true;
    run(['deploy', '--keep-vars']);
    await check();
    record('Release succeeded.');
  } catch (failure) {
    const recoveryErrors = [];
    record('Release failed; automatic recovery started. Writes after the bookmark will be lost.');
    if (deploymentAttempted) {
      try {
        run(['rollback', version, '--message', 'Automatic recovery after failed release', '--yes']);
        const restoredVersion = currentVersion(JSON.parse(run(['deployments', 'status', '--json'])));
        if (restoredVersion !== version) throw new Error('Worker recovery version mismatch');
        record('Worker version restored.');
      } catch (error) {
        recoveryErrors.push(error);
        record('Worker recovery FAILED; manual intervention required.');
      }
    }
    try {
      const restored = JSON.parse(run(['d1', 'time-travel', 'restore', 'DB', '--bookmark', bookmark, '--json']));
      if (!restored.bookmark || !restored.previous_bookmark) throw new Error('D1 restore response is missing recovery bookmarks');
      record(`D1 restored. Restore bookmark: ${restored.bookmark}; undo bookmark: ${restored.previous_bookmark}`);
      run(['d1', 'execute', 'DB', '--remote', '--command', 'SELECT 1', '--json']);
    } catch (error) {
      recoveryErrors.push(error);
      record('D1 recovery FAILED or could not be verified; manual intervention required.');
    }
    try {
      await check();
    } catch (error) {
      recoveryErrors.push(error);
      record('Post-recovery page check FAILED; manual verification required.');
    }
    if (recoveryErrors.length) {
      throw new AggregateError([failure, ...recoveryErrors], 'Release failed and recovery needs manual intervention');
    }
    throw new Error('Release failed; previous Worker and D1 state recovered', { cause: failure });
  }
}

export async function checkPages(origin) {
  for (const path of ['/', '/admin/login']) {
    let failure;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const response = await fetch(new URL(path, origin), {
          redirect: 'manual',
          signal: AbortSignal.timeout(30_000),
          headers: { 'Cache-Control': 'no-cache' },
        });
        await response.body?.cancel();
        if (response.status !== 200) throw new Error(`HTTP ${response.status} for ${path}`);
        failure = undefined;
        break;
      } catch (error) {
        failure = error;
        if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 5_000));
      }
    }
    if (failure) throw failure;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const origin = new URL(process.env.PUBLIC_SITE_URL);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('PUBLIC_SITE_URL must be an HTTPS origin');
  }
  await release({
    run(args) {
      return execFileSync('./node_modules/.bin/wrangler', args, {
        encoding: 'utf8',
        timeout: 300_000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, CI: 'true' },
        stdio: ['ignore', 'pipe', 'inherit'],
      });
    },
    check: () => checkPages(origin),
    record(message) {
      console.log(message);
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n\n`);
    },
  });
}
