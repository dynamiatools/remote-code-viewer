import path from 'node:path';
import fsp from 'node:fs/promises';
import { notFound, badRequest } from './errors.mjs';

/**
 * Directory names denied outright: credentials, never code. Matched against
 * every path segment, case-sensitively, of the post-realpath relative path.
 */
const DENIED_DIR_NAMES = new Set([
  '.ssh', '.gnupg', '.aws', '.azure', '.kube', '.docker', '.gcloud',
  '.password-store',
]);

/** Denied multi-segment directories, matched as a contiguous suffix pair. */
const DENIED_DIR_PATHS = new Set([
  '.config/gh',
  '.config/gcloud',
]);

const DENIED_FILE_NAMES = new Set([
  '.netrc', '.npmrc', '.pypirc', '.git-credentials', '.htpasswd', '.dockercfg',
  'id_rsa', 'id_rsa.pub', 'id_dsa', 'id_dsa.pub', 'id_ecdsa', 'id_ecdsa.pub',
  'id_ed25519', 'id_ed25519.pub',
]);

const ENV_ALLOW = new Set(['.env.example', '.env.sample', '.env.template', '.env.dist']);

/**
 * Patterns evaluated against the basename only. `.git` is denied as a *raw*
 * path so its contents are exposed only through the curated git.mjs routes —
 * reading .git/config directly would leak remote URLs with embedded tokens.
 */
const DENIED_PATTERNS = [
  (base) => base === '.env' || (base.startsWith('.env.') && !ENV_ALLOW.has(base)),
  (base) => /\.(pem|key|p12|pfx|jks|keystore|ppk|asc|gpg|kdbx)$/i.test(base),
  (base) => /service-account.*\.json$/i.test(base),
  (base) => /credentials.*\.json$/i.test(base),
];

/** Present but excluded from tree listings unless `hidden=1`. Not a security boundary. */
export const NOISE_DIR_NAMES = new Set([
  'node_modules', '.git', '.svn', '.hg', '__pycache__', '.venv', 'venv',
  '.mypy_cache', '.pytest_cache', '.ruff_cache', '.gradle', '.tox', '.idea',
]);
export const NOISE_FILE_NAMES = new Set(['.DS_Store']);

/**
 * Same rule the boundary applies during resolution, exposed for search/index
 * code that already holds a trusted relative path (from `git ls-files` or a
 * walk rooted at `ctx.root`) and does not need a fresh `realpath` round trip.
 */
export function isDeniedRelPath(relPosixPath) {
  return isDeniedSegments(relPosixPath === '' ? [] : relPosixPath.split('/'));
}

function isDeniedSegments(segments) {
  if (segments.length === 0) return false;
  if (segments[0] === '.git') return true;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (i < segments.length - 1) {
      if (DENIED_DIR_NAMES.has(seg)) return true;
      if (i < segments.length - 2) {
        const pair = `${seg}/${segments[i + 1]}`;
        if (DENIED_DIR_PATHS.has(pair)) return true;
      }
    }
  }

  const base = segments[segments.length - 1];
  if (DENIED_FILE_NAMES.has(base)) return true;
  return DENIED_PATTERNS.some((test) => test(base));
}

/** True when a directory basename should be hidden from a default tree listing. */
export function isNoiseName(name) {
  return NOISE_DIR_NAMES.has(name) || NOISE_FILE_NAMES.has(name);
}

/**
 * Turns a client-supplied `path` query parameter into a validated absolute
 * path inside the workspace. The ONLY function in this codebase permitted to
 * do so — see docs/security.md §2 for why each step is ordered this way.
 */
export async function resolveInWorkspace(ctx, rawPath) {
  const input = rawPath ?? '';

  if (typeof input !== 'string') throw badRequest();
  if (input.length > ctx.config.limits.maxPathBytes) throw badRequest();
  if (input.includes('\0')) throw badRequest();

  const normalized = input.replaceAll('\\', '/');
  if (path.posix.isAbsolute(normalized) || /^[a-zA-Z]:/.test(normalized)) {
    throw notFound();
  }

  const abs = path.resolve(ctx.root, normalized);

  let real;
  try {
    real = await fsp.realpath(abs);
  } catch {
    throw notFound();
  }

  if (real !== ctx.root && !real.startsWith(ctx.root + path.sep)) {
    throw notFound();
  }

  const relative = path.relative(ctx.root, real);
  const segments = relative === '' ? [] : relative.split(path.sep);

  if (isDeniedSegments(segments)) throw notFound();

  return { abs: real, rel: relative === '' ? '' : segments.join('/') };
}
