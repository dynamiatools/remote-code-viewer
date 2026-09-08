import fsp from 'node:fs/promises';
import { resolveInWorkspace, isNoiseName } from '../workspace.mjs';
import { detectLang } from '../languages.mjs';
import { notFound } from '../errors.mjs';

function collator(a, b) {
  if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export async function getTree(ctx, params) {
  const { abs, rel } = await resolveInWorkspace(ctx, params.get('path'));

  const stat = await fsp.stat(abs).catch(() => null);
  if (!stat || !stat.isDirectory()) throw notFound();

  const showHidden = params.get('hidden') === '1';
  const dirents = await fsp.readdir(abs, { withFileTypes: true });

  const entries = [];
  let truncated = false;

  for (const dirent of dirents) {
    if (!showHidden && isNoiseName(dirent.name)) continue;
    if (entries.length >= ctx.config.limits.maxTreeEntries) {
      truncated = true;
      break;
    }

    const childRel = rel ? `${rel}/${dirent.name}` : dirent.name;

    // Re-validates every entry (containment + denylist): resolving outside the
    // workspace boundary module would duplicate, and risk drifting from, §2.
    const resolved = await resolveInWorkspace(ctx, childRel).catch(() => null);
    if (!resolved) continue;

    const childStat = await fsp.stat(resolved.abs).catch(() => null);
    if (!childStat) continue;

    if (childStat.isDirectory()) {
      entries.push({ name: dirent.name, type: 'dir' });
    } else if (childStat.isFile()) {
      entries.push({
        name: dirent.name,
        type: 'file',
        size: childStat.size,
        mtime: childStat.mtimeMs,
        lang: detectLang(dirent.name),
      });
    }
  }

  entries.sort(collator);
  return { path: rel, entries, truncated };
}
