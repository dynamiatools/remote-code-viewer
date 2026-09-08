import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { EXT_TO_LANG, SYMBOL_RULES, detectLang, extractSymbols } from '../src/server/languages.mjs';

async function realHljsIds() {
  const hljsDir = new URL('../node_modules/highlight.js/lib/languages/', import.meta.url);
  const files = await fs.readdir(hljsDir);
  return new Set(files.filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, '')));
}

test('every EXT_TO_LANG id is a real highlight.js grammar', async () => {
  const real = await realHljsIds();
  const invented = [...new Set(Object.values(EXT_TO_LANG))].filter((id) => id !== 'plaintext' && !real.has(id));
  assert.deepEqual(invented, []);
});

test('the client-side grammar glob covers every EXT_TO_LANG id', async () => {
  // src/web/highlight.js can't import EXT_TO_LANG and derive its
  // import.meta.glob() pattern at runtime — Vite requires a literal glob
  // array — so the list there is hand-written and must be kept a superset.
  const source = await fs.readFile(new URL('../src/web/highlight.js', import.meta.url), 'utf8');
  const globbed = new Set([...source.matchAll(/languages\/([\w-]+)\.js/g)].map((m) => m[1]));
  const needed = [...new Set(Object.values(EXT_TO_LANG))].filter((id) => id !== 'plaintext');
  const missing = needed.filter((id) => !globbed.has(id));
  assert.deepEqual(missing, []);
});

test('every SYMBOL_RULES key is a language EXT_TO_LANG can produce', () => {
  const producible = new Set(Object.values(EXT_TO_LANG));
  const orphaned = Object.keys(SYMBOL_RULES).filter((lang) => !producible.has(lang));
  assert.deepEqual(orphaned, []);
});

test('detectLang falls back to plaintext for unknown extensions', () => {
  assert.equal(detectLang('mystery.zzq'), 'plaintext');
  assert.equal(detectLang('noext'), 'plaintext');
});

test('detectLang recognises filename-based grammars', () => {
  assert.equal(detectLang('Dockerfile'), 'dockerfile');
  assert.equal(detectLang('Makefile'), 'makefile');
});

test('extractSymbols finds a JS function and a class', () => {
  const source = ['class Foo {}', 'function bar() {}', 'const BAZ = 1;'].join('\n');
  const symbols = extractSymbols('javascript', source);
  assert.deepEqual(symbols.map((s) => s.name), ['Foo', 'bar', 'BAZ']);
});

test('an unsupported language returns no symbols, not an error', () => {
  assert.deepEqual(extractSymbols('cobol', 'IDENTIFICATION DIVISION.'), []);
});
