import fsp from 'node:fs/promises';
import path from 'node:path';
import { isNoiseName, isDeniedRelPath } from '../workspace.mjs';
import { badRequest } from '../errors.mjs';

/** Bounded path index, keyed by workspace root, rebuilt after `indexTtlMs`. */
const indexCache = new Map();

async function walkFiles(root, limits) {
  const out = [];
  const stack = [''];
  while (stack.length && out.length < limits.maxScanFiles) {
    const rel = stack.pop();
    const abs = rel ? path.join(root, rel) : root;
    let dirents;
    try {
      dirents = await fsp.readdir(abs, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const dirent of dirents) {
      if (isNoiseName(dirent.name)) continue;
      const childRel = rel ? `${rel}/${dirent.name}` : dirent.name;
      if (isDeniedRelPath(childRel)) continue;
      if (dirent.isDirectory()) {
        stack.push(childRel);
      } else if (dirent.isFile()) {
        out.push(childRel);
        if (out.length >= limits.maxScanFiles) break;
      }
    }
  }
  return out;
}

async function buildPathIndex(ctx) {
  const cached = indexCache.get(ctx.root);
  if (cached && Date.now() - cached.builtAt < ctx.config.limits.indexTtlMs) {
    return cached.entries;
  }

  let entries;
  if (await ctx.git.isRepo(ctx.root, ctx.config.limits)) {
    // --others --exclude-standard: an agent's uncommitted new files are the
    // common case for this tool, so the index must not be tracked-only.
    const result = await ctx.git.run(ctx.root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      maxOutputBytes: ctx.config.limits.maxGitOutput,
      timeoutMs: ctx.config.limits.maxGitMs,
    });
    entries = result.ok
      ? result.stdout.split('\0').filter(Boolean).filter((p) => !isDeniedRelPath(p))
      : await walkFiles(ctx.root, ctx.config.limits);
  } else {
    entries = await walkFiles(ctx.root, ctx.config.limits);
  }

  entries = entries.slice(0, ctx.config.limits.maxIndexEntries);
  indexCache.set(ctx.root, { entries, builtAt: Date.now() });
  return entries;
}

function scorePathMatch(entry, needle) {
  const idx = entry.indexOf(needle);
  if (idx === -1) return -1;
  const base = path.posix.basename(entry);
  let score = 100 - Math.min(idx, 50);
  if (base.toLowerCase().startsWith(needle)) score += 40;
  if (base.toLowerCase() === needle) score += 40;
  return score;
}

async function searchPaths(ctx, query, { subtree, max, caseSensitive }) {
  const entries = await buildPathIndex(ctx);
  const needle = caseSensitive ? query : query.toLowerCase();

  const scored = [];
  for (const entry of entries) {
    if (subtree && !entry.startsWith(`${subtree}/`) && entry !== subtree) continue;
    const haystack = caseSensitive ? entry : entry.toLowerCase();
    const score = scorePathMatch(haystack, needle);
    if (score >= 0) scored.push({ path: entry, score });
  }

  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const truncated = scored.length > max;
  return { engine: 'index', results: scored.slice(0, max), truncated };
}

function parseGitGrepLine(line) {
  const m = /^([^:]+):(\d+):(.*)$/.exec(line);
  if (!m) return null;
  return { path: m[1], line: Number(m[2]), text: m[3] };
}

async function searchTextGrep(ctx, query, { subtree, max, caseSensitive }) {
  // --untracked: an agent's uncommitted new files are the common case for
  // this tool, so search must not be tracked-only. Still respects .gitignore.
  const args = ['grep', '-n', '--no-color', '-I', '-F', '--untracked'];
  if (!caseSensitive) args.push('-i');
  args.push('-e', query, '--');
  args.push(subtree || '.');

  const result = await ctx.git.run(ctx.root, args, {
    maxOutputBytes: ctx.config.limits.maxGitOutput,
    timeoutMs: ctx.config.limits.maxSearchMs,
  });

  if (!result.ok && !result.stdout) {
    return { engine: 'git-grep', results: [], truncated: false };
  }

  const lines = result.stdout.split('\n').filter(Boolean);
  const parsed = lines.map(parseGitGrepLine).filter(Boolean).filter((r) => !isDeniedRelPath(r.path));
  const truncated = result.truncated || result.timedOut || parsed.length > max;
  return { engine: 'git-grep', results: parsed.slice(0, max), truncated };
}

async function searchTextScan(ctx, query, { subtree, max, caseSensitive }) {
  const entries = await walkFiles(ctx.root, ctx.config.limits);
  const needle = caseSensitive ? query : query.toLowerCase();
  const results = [];
  const deadline = Date.now() + ctx.config.limits.maxSearchMs;
  let truncated = false;

  outer:
  for (const rel of entries) {
    if (subtree && !rel.startsWith(`${subtree}/`) && rel !== subtree) continue;
    if (Date.now() > deadline) {
      truncated = true;
      break;
    }

    let content;
    try {
      const buf = await fsp.readFile(path.join(ctx.root, rel));
      if (buf.includes(0)) continue;
      content = buf.toString('utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const haystack = caseSensitive ? lines[i] : lines[i].toLowerCase();
      if (haystack.includes(needle)) {
        results.push({ path: rel, line: i + 1, text: lines[i] });
        if (results.length >= max) {
          truncated = true;
          break outer;
        }
      }
    }
  }

  return { engine: 'scan', results, truncated };
}

export async function getSearch(ctx, params) {
  const q = params.get('q') ?? '';
  if (q.length < 2 || q.length > 200) throw badRequest();

  const kind = params.get('kind') === 'path' ? 'path' : 'text';
  const subtree = (params.get('path') ?? '').replace(/^\/+|\/+$/g, '');
  const caseSensitive = params.get('case') === '1';
  const maxParam = Number(params.get('max'));
  const max = Math.min(
    Number.isFinite(maxParam) && maxParam > 0 ? Math.floor(maxParam) : ctx.config.limits.maxSearchResults,
    ctx.config.limits.maxSearchResults,
  );

  const opts = { subtree, max, caseSensitive };

  if (kind === 'path') {
    const { engine, results, truncated } = await searchPaths(ctx, q, opts);
    return { query: q, kind, engine, results, truncated };
  }

  const useGitGrep = await ctx.git.isRepo(ctx.root, ctx.config.limits);
  const { engine, results, truncated } = useGitGrep
    ? await searchTextGrep(ctx, q, opts)
    : await searchTextScan(ctx, q, opts);
  return { query: q, kind, engine, results, truncated };
}
