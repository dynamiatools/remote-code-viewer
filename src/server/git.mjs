import { spawn } from 'node:child_process';

/**
 * Read-only subcommand allowlist. Adding one requires a read-only
 * justification in the review (docs/security.md §8, §10).
 */
const ALLOWED_SUBCOMMANDS = new Set([
  'rev-parse', 'symbolic-ref', 'log', 'status', 'diff', 'show', 'ls-files',
  'grep', 'for-each-ref', 'describe',
]);

const SCRUBBED_ENV = () => ({
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  LANG: process.env.LANG,
  GIT_OPTIONAL_LOCKS: '0',
  GIT_TERMINAL_PROMPT: '0',
  GIT_ASKPASS: 'true',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_PAGER: 'cat',
});

/**
 * Runs `git <args>` against `root`, `shell: false`, output and duration
 * capped. `args[0]` must be on the allowlist. Caller passes any
 * client-derived value after `--` so it is never read as a flag.
 */
export function runGit(root, args, { maxOutputBytes, timeoutMs }) {
  if (!ALLOWED_SUBCOMMANDS.has(args[0])) {
    throw new Error(`git subcommand not allowlisted: ${args[0]}`);
  }

  return new Promise((resolve) => {
    const child = spawn('git', ['-C', root, '--no-pager', ...args], {
      shell: false,
      env: SCRUBBED_ENV(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = Buffer.alloc(0);
    let stderr = '';
    let truncated = false;
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ ok: false, timedOut: true, code: null, stdout: '', stderr: 'timed out', truncated: false });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      if (stdout.length >= maxOutputBytes) {
        truncated = true;
        return;
      }
      stdout = Buffer.concat([stdout, chunk]).subarray(0, maxOutputBytes);
    });

    child.stderr.on('data', (chunk) => {
      if (stderr.length < 4096) stderr += chunk.toString('utf8');
    });

    child.on('error', () => {
      finish({ ok: false, timedOut: false, code: null, stdout: '', stderr: 'git not available', truncated: false });
    });

    child.on('close', (code) => {
      finish({
        ok: code === 0,
        timedOut: false,
        code,
        stdout: stdout.toString('utf8'),
        stderr,
        truncated,
      });
    });
  });
}

export async function isRepo(root, limits) {
  const result = await runGit(root, ['rev-parse', '--is-inside-work-tree'], {
    maxOutputBytes: 1024,
    timeoutMs: limits.maxGitMs,
  });
  return result.ok && result.stdout.trim() === 'true';
}
