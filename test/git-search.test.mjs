import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer } from '../src/server/server.mjs';
import { createConfig, parseArgs } from '../src/server/config.mjs';

let tmp;
let server;
let base;
let token;

function git(...args) {
  execFileSync('git', ['-C', tmp, ...args], { stdio: 'ignore' });
}

before(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rcv-git-search-'));
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');

  await fs.writeFile(path.join(tmp, 'committed.txt'), 'needle in committed file\n');
  git('add', '.');
  git('commit', '-q', '-m', 'initial');

  // The realistic case for this tool: an agent's new file, not yet committed.
  await fs.writeFile(path.join(tmp, 'untracked.txt'), 'needle in untracked file\n');

  const config = await createConfig(parseArgs([tmp, '--port', '0']));
  server = createServer(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  token = server.token;
});

after(async () => {
  server.close();
  await fs.rm(tmp, { recursive: true, force: true });
});

async function api(pathname) {
  const res = await fetch(new URL(pathname, base), { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, body: await res.json() };
}

test('git-grep search finds a match in an untracked file', async () => {
  const { body } = await api('/api/search?q=needle');
  assert.equal(body.engine, 'git-grep');
  const paths = body.results.map((r) => r.path);
  assert.ok(paths.includes('untracked.txt'), `expected untracked.txt in ${JSON.stringify(paths)}`);
  assert.ok(paths.includes('committed.txt'));
});

test('path index includes an untracked file', async () => {
  const { body } = await api('/api/search?kind=path&q=untracked');
  assert.ok(body.results.some((r) => r.path === 'untracked.txt'));
});
