import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../src/server/server.mjs';
import { createConfig, parseArgs } from '../src/server/config.mjs';

let tmp;
let server;
let base;
let token;

before(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rcv-smoke-'));
  await fs.mkdir(path.join(tmp, 'src'), { recursive: true });
  await fs.writeFile(path.join(tmp, 'src', 'main.js'), 'function hello() {\n  return 1;\n}\n');
  await fs.writeFile(path.join(tmp, 'README.md'), '# hi\n');
  await fs.writeFile(path.join(tmp, '.env'), 'SECRET=1\n');

  const config = await createConfig(parseArgs([tmp, '--port', '0']));
  server = createServer(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
  token = server.token;
});

after(async () => {
  server.close();
  await fs.rm(tmp, { recursive: true, force: true });
});

async function api(pathname, { auth = true } = {}) {
  const url = new URL(pathname, base);
  const headers = auth ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { headers });
  const body = await res.json();
  return { status: res.status, body };
}

test('GET /api/health needs no auth', async () => {
  const { status, body } = await api('/api/health', { auth: false });
  assert.equal(status, 200);
  assert.deepEqual(body, { ok: true });
});

test('an API route without a token is unauthorized', async () => {
  const { status, body } = await api('/api/meta', { auth: false });
  assert.equal(status, 401);
  assert.equal(body.error, 'unauthorized');
});

test('GET /api/meta reports the workspace basename, not an absolute path', async () => {
  const { status, body } = await api('/api/meta');
  assert.equal(status, 200);
  assert.equal(body.workspace.name, path.basename(tmp));
  assert.equal(body.readOnly, true);
});

test('GET /api/tree lists the root', async () => {
  const { status, body } = await api('/api/tree');
  assert.equal(status, 200);
  const names = body.entries.map((e) => e.name);
  assert.ok(names.includes('src'));
  assert.ok(names.includes('README.md'));
});

test('GET /api/file reads a file', async () => {
  const { status, body } = await api('/api/file?path=src/main.js');
  assert.equal(status, 200);
  assert.equal(body.lang, 'javascript');
  assert.match(body.content, /function hello/);
});

test('GET /api/file on a denied path is 404, identical to a missing one', async () => {
  const denied = await api('/api/file?path=.env');
  const missing = await api('/api/file?path=nope.txt');
  assert.equal(denied.status, 404);
  assert.equal(missing.status, 404);
  assert.deepEqual(denied.body, missing.body);
});

test('GET /api/symbols outlines a JS file', async () => {
  const { status, body } = await api('/api/symbols?path=src/main.js');
  assert.equal(status, 200);
  assert.ok(body.symbols.some((s) => s.name === 'hello'));
});

test('GET /api/search?kind=path finds a file by name', async () => {
  const { status, body } = await api('/api/search?kind=path&q=main');
  assert.equal(status, 200);
  assert.ok(body.results.some((r) => r.path === 'src/main.js'));
});

test('GET /api/search?kind=text finds a match', async () => {
  const { status, body } = await api('/api/search?q=hello');
  assert.equal(status, 200);
  assert.ok(body.results.some((r) => r.path === 'src/main.js'));
});

test('GET /api/git/branch on a non-repo workspace', async () => {
  const { status, body } = await api('/api/git/branch');
  assert.equal(status, 200);
  assert.equal(body.isRepo, false);
});

test('GET /api/git/commits, /status, /diff on a non-repo workspace', async () => {
  for (const route of ['/api/git/commits', '/api/git/status', '/api/git/diff']) {
    const { status, body } = await api(route);
    assert.equal(status, 200);
    assert.equal(body.isRepo, false);
  }
});

test('POST to an API route is 405', async () => {
  const res = await fetch(new URL('/api/tree', base), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  assert.equal(res.status, 405);
});

test('DELETE to any route is 405', async () => {
  const res = await fetch(new URL('/', base), { method: 'DELETE' });
  assert.equal(res.status, 405);
});

test('an unknown /api route is 404', async () => {
  const { status } = await api('/api/does-not-exist');
  assert.equal(status, 404);
});
