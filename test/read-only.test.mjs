import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const SERVER_DIR = new URL('../src/server', import.meta.url).pathname;

const WRITE_APIS = [
  'writeFile', 'writeFileSync', 'mkdir', 'mkdirSync', 'unlink', 'unlinkSync',
  'rename', 'renameSync', 'chmod', 'chmodSync', 'rm', 'rmSync', 'rmdir', 'rmdirSync',
  'appendFile', 'appendFileSync', 'symlink', 'symlinkSync', 'truncate', 'truncateSync',
];

async function* walk(dir) {
  for (const dirent of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, dirent.name);
    if (dirent.isDirectory()) yield* walk(full);
    else if (dirent.name.endsWith('.mjs')) yield full;
  }
}

test('src/server contains no write syscall', async () => {
  const offenders = [];
  for await (const file of walk(SERVER_DIR)) {
    const content = await fs.readFile(file, 'utf8');
    for (const api of WRITE_APIS) {
      const regex = new RegExp(`\\b${api}\\s*\\(`);
      if (regex.test(content)) offenders.push(`${path.relative(SERVER_DIR, file)}: ${api}`);
    }
    if (/\bopen(?:Sync)?\s*\([^)]*['"]w/.test(content)) {
      offenders.push(`${path.relative(SERVER_DIR, file)}: open('w'...)`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('src/server imports no write API', async () => {
  const offenders = [];
  for await (const file of walk(SERVER_DIR)) {
    const content = await fs.readFile(file, 'utf8');
    if (/import\s+(?:fs\/promises|node:fs\/promises)\s+as\s+fs\b/.test(content)) continue;
    // catches destructured named imports of write functions from node:fs / node:fs/promises
    const importMatch = /import\s*\{([^}]+)\}\s*from\s*['"]node:fs(?:\/promises)?['"]/.exec(content);
    if (importMatch) {
      const names = importMatch[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]);
      const cleanNames = WRITE_APIS.map((api) => api.replace(/[('"]/g, ''));
      const writeNames = new Set(cleanNames);
      for (const name of names) {
        if (writeNames.has(name)) {
          offenders.push(`${path.relative(SERVER_DIR, file)}: imports ${name}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, []);
});
