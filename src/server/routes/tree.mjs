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

  if (entries.length > 0 && (await ctx.git.isRepo(ctx.root, ctx.config.limits))) {
    await markIgnored(ctx, rel, entries);
  }

  return { path: rel, entries, truncated };
}

/**
 * Dims gitignored entries in the tree (context, not a filter — §"Git
 * answers exactly three questions"). `check-ignore` prints back only the
 * paths it matches, one per line, so absence from stdout means "tracked or
 * unknown", never an error worth surfacing.
 */
async function markIgnored(ctx, rel, entries) {
  const relPaths = entries.map((entry) => (rel ? `${rel}/${entry.name}` : entry.name));
  const result = await ctx.git.run(ctx.root, ['check-ignore', '--', ...relPaths], {
    maxOutputBytes: ctx.config.limits.maxGitOutput,
    timeoutMs: ctx.config.limits.maxGitMs,
  });
  if (!result.stdout) return;

  const ignored = new Set(result.stdout.split('\n').filter(Boolean));
  for (let i = 0; i < entries.length; i++) {
    if (ignored.has(relPaths[i])) entries[i].ignored = true;
  }
}
