import { resolveInWorkspace } from '../workspace.mjs';
import { badRequest } from '../errors.mjs';

function gitOpts(ctx) {
  return { maxOutputBytes: ctx.config.limits.maxGitOutput, timeoutMs: ctx.config.limits.maxGitMs };
}

export async function getBranch(ctx) {
  if (!(await ctx.git.isRepo(ctx.root, ctx.config.limits))) return { isRepo: false };

  const [head, symbolic, status] = await Promise.all([
    ctx.git.run(ctx.root, ['rev-parse', '--short', 'HEAD'], gitOpts(ctx)),
    ctx.git.run(ctx.root, ['symbolic-ref', '-q', '--short', 'HEAD'], gitOpts(ctx)),
    ctx.git.run(ctx.root, ['status', '--porcelain=v1', '--branch'], gitOpts(ctx)),
  ]);

  const detached = !symbolic.ok;
  const branch = detached ? head.stdout.trim() : symbolic.stdout.trim();

  let ahead = 0;
  let behind = 0;
  const branchLine = status.stdout.split('\n')[0] ?? '';
  const aheadMatch = /ahead (\d+)/.exec(branchLine);
  const behindMatch = /behind (\d+)/.exec(branchLine);
  if (aheadMatch) ahead = Number(aheadMatch[1]);
  if (behindMatch) behind = Number(behindMatch[1]);

  const dirty = status.stdout.split('\n').slice(1).some((line) => line.trim().length > 0);

  return {
    isRepo: true,
    branch: branch || null,
    detached,
    head: head.ok ? head.stdout.trim() : null,
    ahead,
    behind,
    dirty,
  };
}

export async function getCommits(ctx, params) {
  if (!(await ctx.git.isRepo(ctx.root, ctx.config.limits))) return { isRepo: false, commits: [] };

  const limitParam = Number(params.get('limit'));
  const limit = Math.min(Number.isFinite(limitParam) && limitParam > 0 ? Math.floor(limitParam) : 20, 100);

  const sep = '\x1f';
  const format = ['%H', '%h', '%an', '%aI', '%ar', '%s'].join(sep);
  const result = await ctx.git.run(
    ctx.root,
    ['log', `-n${limit}`, `--pretty=format:${format}`],
    gitOpts(ctx),
  );

  if (!result.ok) return { isRepo: true, commits: [] };

  const commits = result.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, short, author, date, relative, subject] = line.split(sep);
      return { hash, short, author, date, relative, subject };
    });

  return { isRepo: true, commits };
}

export async function getStatus(ctx) {
  if (!(await ctx.git.isRepo(ctx.root, ctx.config.limits))) return { isRepo: false, files: [] };

  const result = await ctx.git.run(ctx.root, ['status', '--porcelain=v1'], gitOpts(ctx));
  if (!result.ok) return { isRepo: true, files: [] };

  const files = result.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const index = line[0];
      const worktree = line[1];
      const rest = line.slice(3);
      const renamed = rest.includes(' -> ');
      const [from, filePath] = renamed ? rest.split(' -> ') : [null, rest];
      const entry = { path: filePath, index, worktree, staged: index !== ' ' && index !== '?' };
      if (renamed) entry.from = from;
      return entry;
    });

  return { isRepo: true, files };
}

export async function getDiff(ctx, params) {
  if (!(await ctx.git.isRepo(ctx.root, ctx.config.limits))) return { isRepo: false };

  const rawPath = params.get('path') ?? '';
  const staged = params.get('staged') === '1';
  const contextParam = Number(params.get('context'));
  const context = Math.min(
    Math.max(Number.isFinite(contextParam) ? Math.floor(contextParam) : 3, 0),
    10,
  );

  let rel = '';
  if (rawPath) {
    const resolved = await resolveInWorkspace(ctx, rawPath);
    rel = resolved.rel;
  }

  if (contextParam < 0 || contextParam > 10) throw badRequest();

  const args = ['diff', `-U${context}`, '--no-color'];
  if (staged) args.push('--cached');
  if (rel) args.push('--', rel);

  const result = await ctx.git.run(ctx.root, args, gitOpts(ctx));

  return {
    isRepo: true,
    path: rel,
    staged,
    diff: result.ok ? result.stdout : '',
    truncated: result.truncated || result.timedOut,
  };
}
