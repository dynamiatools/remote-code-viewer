import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveInWorkspace } from '../src/server/workspace.mjs';
import { LIMITS } from '../src/server/config.mjs';

let tmp;
let root;
let ctx;

before(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rcv-workspace-'));
  root = path.join(tmp, 'project');
  await fs.mkdir(path.join(root, 'src'), { recursive: true });
  await fs.writeFile(path.join(root, 'src', 'index.js'), 'console.log(1);\n');
  await fs.writeFile(path.join(root, '.env'), 'SECRET=1\n');
  await fs.writeFile(path.join(root, '.env.example'), 'SECRET=\n');
  await fs.mkdir(path.join(root, '.ssh'), { recursive: true });
  await fs.writeFile(path.join(root, '.ssh', 'id_rsa'), 'nope\n');
  await fs.mkdir(path.join(root, '.git'), { recursive: true });
  await fs.writeFile(path.join(root, '.git', 'config'), '[core]\n');

  // sibling directory sharing root as a string prefix: root + '-secrets'
  await fs.mkdir(`${root}-secrets`, { recursive: true });
  await fs.writeFile(path.join(`${root}-secrets`, 'leak.txt'), 'leak\n');

  // symlink escaping the workspace entirely
  await fs.symlink(`${root}-secrets`, path.join(root, 'escape'));
  // symlink pointing at an outside file
  await fs.symlink(path.join(`${root}-secrets`, 'leak.txt'), path.join(root, 'leak-link.txt'));
  // symlink laundering a denied name through an allowed one
  await fs.symlink(path.join(root, '.env'), path.join(root, 'notes.txt'));
  // dangling symlink
  await fs.symlink(path.join(root, 'does-not-exist'), path.join(root, 'dangling'));

  ctx = { root, config: { limits: LIMITS } };
});

after(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

test('resolves a plain relative path inside the workspace', async () => {
  const { abs, rel } = await resolveInWorkspace(ctx, 'src/index.js');
  assert.equal(abs, path.join(root, 'src', 'index.js'));
  assert.equal(rel, 'src/index.js');
});

test('empty path resolves to the workspace root', async () => {
  const { abs, rel } = await resolveInWorkspace(ctx, '');
  assert.equal(abs, root);
  assert.equal(rel, '');
});

test('rejects ../ traversal out of the workspace', async () => {
  await assert.rejects(resolveInWorkspace(ctx, '../project-secrets/leak.txt'), /not found/);
});

test('rejects a lexically-collapsing traversal', async () => {
  await assert.rejects(resolveInWorkspace(ctx, 'src/../../project-secrets'), /not found/);
});

test('rejects an absolute path', async () => {
  await assert.rejects(resolveInWorkspace(ctx, '/etc/passwd'), /not found/);
});

test('rejects a Windows-style absolute path', async () => {
  await assert.rejects(resolveInWorkspace(ctx, 'C:/Windows/System32'), /not found/);
});

test('rejects an encoded traversal after decoding', async () => {
  await assert.rejects(resolveInWorkspace(ctx, '..%2f..%2fetc%2fpasswd'), /not found/);
});

test('rejects a NUL byte', async () => {
  await assert.rejects(resolveInWorkspace(ctx, 'src/index.js\0.png'), /invalid request/);
});

test('rejects a path over the byte limit', async () => {
  await assert.rejects(resolveInWorkspace(ctx, 'a'.repeat(LIMITS.maxPathBytes + 1)), /invalid request/);
});

test('rejects a symlink that escapes the workspace to a directory', async () => {
  await assert.rejects(resolveInWorkspace(ctx, 'escape/leak.txt'), /not found/);
});

test('rejects a symlink that escapes the workspace to a file', async () => {
  await assert.rejects(resolveInWorkspace(ctx, 'leak-link.txt'), /not found/);
});

test('the root + path.sep off-by-one does not accept a sibling directory', async () => {
  await assert.rejects(resolveInWorkspace(ctx, `../${path.basename(root)}-secrets/leak.txt`), /not found/);
});

test('denies .env by content-based pattern', async () => {
  await assert.rejects(resolveInWorkspace(ctx, '.env'), /not found/);
});

test('allows .env.example', async () => {
  const { rel } = await resolveInWorkspace(ctx, '.env.example');
  assert.equal(rel, '.env.example');
});

test('denies .ssh/id_rsa by directory and file name', async () => {
  await assert.rejects(resolveInWorkspace(ctx, '.ssh/id_rsa'), /not found/);
});

test('denies .git as a raw path', async () => {
  await assert.rejects(resolveInWorkspace(ctx, '.git/config'), /not found/);
});

test('denies a symlink whose target basename is denied, even under an allowed name', async () => {
  await assert.rejects(resolveInWorkspace(ctx, 'notes.txt'), /not found/);
});

test('a dangling symlink fails closed as not found', async () => {
  await assert.rejects(resolveInWorkspace(ctx, 'dangling'), /not found/);
});

test('a missing path and a denied path are indistinguishable', async () => {
  const missing = await resolveInWorkspace(ctx, 'nope.txt').catch((e) => e);
  const denied = await resolveInWorkspace(ctx, '.env').catch((e) => e);
  assert.equal(missing.status, 404);
  assert.equal(denied.status, 404);
  assert.equal(missing.message, denied.message);
});
