import path from 'node:path';
import fsp from 'node:fs/promises';
import os from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Every tunable lives here. Nothing downstream may hardcode a limit. */
export const LIMITS = {
  maxFileSize: 2 * 1024 * 1024,
  maxTreeEntries: 2000,
  maxSearchResults: 300,
  maxSearchMs: 2000,
  maxScanFiles: 20000,
  maxIndexEntries: 50000,
  indexTtlMs: 10000,
  maxGitOutput: 4 * 1024 * 1024,
  maxGitMs: 5000,
  maxSymbols: 500,
  rateLimitPerMinute: 240,
  maxQueryBytes: 4096,
  maxPathBytes: 4096,
  binarySniffBytes: 8192,
};

export const DEFAULTS = {
  port: 8765,
  host: '127.0.0.1',
};

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export const isLoopback = (host) => LOOPBACK.has(host);

export function readVersion() {
  try {
    return require('../../package.json').version;
  } catch {
    return '0.0.0';
  }
}

export const HELP = `
  remote-code-viewer — a window into a remote codebase, not another IDE

  Usage
    npx @dynamia-tools/remote-code-viewer [workspace] [options]

  Arguments
    workspace              Directory to serve. Default: the current directory.

  Options
    -p, --port <n>         Port to listen on              (default ${DEFAULTS.port})
    -H, --host <addr>      Address to bind                (default ${DEFAULTS.host})
    -t, --tunnel           Publish through a Cloudflare quick tunnel
        --token <value>    Use this token instead of a random one
        --no-token         Disable auth (loopback only, refused with --tunnel)
        --max-file-size <bytes>
                           Largest file to read           (default ${LIMITS.maxFileSize})
    -o, --open             Open the local URL in a browser
    -v, --verbose          Log requests and cloudflared output
    -h, --help             Show this help
    -V, --version          Show the version

  The viewer is read-only. The workspace is the filesystem boundary.
`;

const NEEDS_VALUE = new Set(['--port', '-p', '--host', '-H', '--token', '--max-file-size']);

/** Pure argv parsing. No I/O, so it is directly unit-testable. */
export function parseArgs(argv) {
  const out = {
    workspace: null,
    port: DEFAULTS.port,
    host: DEFAULTS.host,
    tunnel: false,
    token: null,
    noToken: false,
    maxFileSize: LIMITS.maxFileSize,
    open: false,
    verbose: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (NEEDS_VALUE.has(arg) && i + 1 >= argv.length) {
      throw new Error(`${arg} requires a value`);
    }
    switch (arg) {
      case '-h': case '--help': out.help = true; break;
      case '-V': case '--version': out.version = true; break;
      case '-t': case '--tunnel': out.tunnel = true; break;
      case '-o': case '--open': out.open = true; break;
      case '-v': case '--verbose': out.verbose = true; break;
      case '--no-token': out.noToken = true; break;
      case '-p': case '--port': out.port = parsePort(argv[++i]); break;
      case '-H': case '--host': out.host = argv[++i]; break;
      case '--token': out.token = argv[++i]; break;
      case '--max-file-size': out.maxFileSize = parseBytes(argv[++i]); break;
      default:
        if (arg.startsWith('-')) throw new Error(`unknown option: ${arg}`);
        if (out.workspace !== null) throw new Error('only one workspace may be given');
        out.workspace = arg;
    }
  }

  if (out.noToken && out.token) throw new Error('--no-token and --token are mutually exclusive');
  if (out.noToken && out.tunnel) {
    throw new Error('--no-token cannot be combined with --tunnel: that would publish the workspace on a public URL with no authentication');
  }
  if (out.noToken && !isLoopback(out.host)) {
    throw new Error(`--no-token requires a loopback --host, got "${out.host}"`);
  }
  return out;
}

function parsePort(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 65535) throw new Error(`invalid port: ${value}`);
  return n;
}

function parseBytes(value) {
  const m = /^(\d+)(k|m|kb|mb)?$/i.exec(String(value).trim());
  if (!m) throw new Error(`invalid byte size: ${value}`);
  const mult = { k: 1024, kb: 1024, m: 1024 * 1024, mb: 1024 * 1024 }[(m[2] ?? '').toLowerCase()] ?? 1;
  const n = Number(m[1]) * mult;
  if (n < 1024) throw new Error('--max-file-size must be at least 1024');
  return n;
}

/**
 * Resolve argv into a runnable config. Refuses workspaces that are almost
 * certainly a mistake and would expose credentials wholesale.
 */
export async function createConfig(args) {
  const requested = path.resolve(args.workspace ?? process.cwd());

  let root;
  try {
    root = await fsp.realpath(requested);
  } catch {
    throw new Error(`workspace does not exist: ${requested}`);
  }
  const stat = await fsp.stat(root);
  if (!stat.isDirectory()) throw new Error(`workspace is not a directory: ${requested}`);

  if (root === path.parse(root).root) {
    throw new Error('refusing to serve the filesystem root');
  }

  const warnings = [];
  if (root === os.homedir()) {
    warnings.push('serving your home directory: it likely contains credentials outside the denylist');
  }
  if (!isLoopback(args.host)) {
    warnings.push(`binding ${args.host} exposes the viewer to your network directly; prefer --tunnel`);
  }
  if (args.noToken) {
    warnings.push('authentication is disabled (--no-token); anyone who can reach this port can read the workspace');
  }

  return {
    root,
    port: args.port,
    host: args.host,
    tunnel: args.tunnel,
    open: args.open,
    verbose: args.verbose,
    authEnabled: !args.noToken,
    presetToken: args.token,
    version: readVersion(),
    limits: { ...LIMITS, maxFileSize: args.maxFileSize },
    warnings,
  };
}
