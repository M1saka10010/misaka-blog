import { describe, expect, it } from 'vitest';

// @ts-expect-error The release CLI is a native Node.js module without declarations.
import { release } from '../../scripts/release.mjs';

function setup(failAt = '', recoveryFails = false) {
  const calls: string[] = [];
  const records: string[] = [];
  let checks = 0;
  const run = (args: string[]) => {
    const command = args.join(' ');
    calls.push(command);
    if (command === failAt || (recoveryFails && args[0] === 'rollback')) throw new Error('simulated failure');
    if (command === 'deployments status --json') return JSON.stringify({ versions: [{ version_id: 'old-version', percentage: 100 }] });
    if (command === 'd1 time-travel info DB --json') return JSON.stringify({ bookmark: 'before' });
    if (command.startsWith('d1 time-travel restore')) return JSON.stringify({ bookmark: 'restored', previous_bookmark: 'undo' });
    return '{}';
  };
  const check = async () => {
    checks++;
    if (failAt === 'check' && checks === 1) throw new Error('unhealthy');
  };
  return { calls, records, options: { run, check, record: (message: string) => records.push(message) } };
}

describe('release recovery', () => {
  it('records recovery points before migration and deploys only after migration', async () => {
    const { calls, options } = setup();
    await release(options);
    expect(calls).toEqual(['deployments status --json', 'd1 time-travel info DB --json', 'd1 migrations apply DB --remote', 'deploy --keep-vars']);
  });

  it('does not mutate production if recovery point lookup fails', async () => {
    const { calls, options } = setup('d1 time-travel info DB --json');
    await expect(release(options)).rejects.toThrow();
    expect(calls).toHaveLength(2);
  });

  it('restores D1 but does not deploy or roll back Worker after migration failure', async () => {
    const { calls, options } = setup('d1 migrations apply DB --remote');
    await expect(release(options)).rejects.toThrow('previous Worker and D1 state recovered');
    expect(calls.some(command => command.startsWith('deploy ') || command.startsWith('rollback '))).toBe(false);
    expect(calls).toContain('d1 time-travel restore DB --bookmark before --json');
  });

  for (const failure of ['deploy --keep-vars', 'check']) {
    it(`recovers the explicit Worker version and D1 after ${failure} fails`, async () => {
      const { calls, options } = setup(failure);
      await expect(release(options)).rejects.toThrow('previous Worker and D1 state recovered');
      const rollback = calls.findIndex(command => command.startsWith('rollback old-version '));
      expect(rollback).toBeGreaterThan(0);
      expect(calls.indexOf('d1 time-travel restore DB --bookmark before --json')).toBeGreaterThan(rollback);
    });
  }

  it('still attempts D1 restore when Worker rollback fails and reports incomplete recovery', async () => {
    const { calls, options } = setup('check', true);
    await expect(release(options)).rejects.toThrow('recovery needs manual intervention');
    expect(calls).toContain('d1 time-travel restore DB --bookmark before --json');
  });

  for (const failure of ['restore', 'response', 'query', 'version', 'health']) {
    it(`reports incomplete recovery for ${failure} failure`, async () => {
      const { calls, options } = setup('check');
      const originalRun = options.run;
      let statuses = 0;
      options.run = (args: string[]) => {
        const result = originalRun(args);
        if (args[0] === 'deployments' && ++statuses > 1 && failure === 'version') {
          return JSON.stringify({ versions: [{ version_id: 'wrong-version', percentage: 100 }] });
        }
        if (args[2] === 'restore') {
          if (failure === 'restore') throw new Error('restore unavailable');
          if (failure === 'response') return '{}';
        }
        if (args[1] === 'execute' && failure === 'query') throw new Error('database unavailable');
        return result;
      };
      if (failure === 'health') options.check = async () => { throw new Error('unhealthy'); };
      await expect(release(options)).rejects.toThrow('recovery needs manual intervention');
      expect(calls).toContain('d1 time-travel restore DB --bookmark before --json');
    });
  }

  it('rejects gradual deployments before any production changes', async () => {
    const { calls, options } = setup();
    options.run = (args: string[]) => {
      calls.push(args.join(' '));
      return JSON.stringify({ versions: [{ version_id: 'one', percentage: 50 }, { version_id: 'two', percentage: 50 }] });
    };
    await expect(release(options)).rejects.toThrow('single-version');
    expect(calls).toHaveLength(1);
  });
});
