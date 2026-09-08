import fsp from 'node:fs/promises';
import path from 'node:path';
import { resolveInWorkspace } from '../workspace.mjs';
import { detectLang, extractSymbols } from '../languages.mjs';
import { badRequest, notFound, tooLarge } from '../errors.mjs';

export async function getSymbols(ctx, params) {
  const rawPath = params.get('path');
  if (!rawPath) throw badRequest();

  const { abs, rel } = await resolveInWorkspace(ctx, rawPath);

  let stat;
  try {
    stat = await fsp.stat(abs);
  } catch {
    throw notFound();
  }
  if (!stat.isFile()) throw notFound();
  if (stat.size > ctx.config.limits.maxFileSize) throw tooLarge();

  const lang = detectLang(path.posix.basename(rel));
  const source = await fsp.readFile(abs, 'utf8');
  const symbols = extractSymbols(lang, source).slice(0, ctx.config.limits.maxSymbols);

  return { path: rel, lang, symbols };
}
