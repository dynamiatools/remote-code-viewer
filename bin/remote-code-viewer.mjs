#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { parseArgs, createConfig, HELP, readVersion } from '../src/server/config.mjs';
import { createServer } from '../src/server/server.mjs';

function log(...args) {
  console.log(...args);
}

function fail(message) {
  console.error(`remote-code-viewer: ${message}`);
  process.exitCode = 1;
}

async function openBrowser(url) {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    spawn(opener, [url], { stdio: 'ignore', detached: true }).unref();
  } catch {
    // best-effort; the printed URL is the fallback
  }
}

/**
 * Parses `cloudflared`'s stderr for the quick-tunnel URL. A contract we do
 * not own (ADR-0006) — permissive on purpose, and failure degrades to "local
 * URL still works" rather than a crash.
 */
function extractTunnelUrl(chunk) {
  const match = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(chunk);
  return match ? match[0] : null;
}

function startTunnel(port, { verbose }) {
  return new Promise((resolve) => {
    const child = spawn(
      'cloudflared',
      ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let resolved = false;
    const onData = (chunk) => {
      const text = chunk.toString('utf8');
      if (verbose) process.stderr.write(text);
      const url = extractTunnelUrl(text);
      if (url && !resolved) {
        resolved = true;
        resolve({ child, url });
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('error', () => {
      if (!resolved) {
        resolved = true;
        resolve({ child: null, url: null, error: 'cloudflared not found on PATH' });
      }
    });

    child.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        resolve({ child: null, url: null, error: `cloudflared exited with code ${code}` });
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ child, url: null, error: 'timed out waiting for the tunnel URL' });
      }
    }, 15_000);
  });
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    fail(err.message);
    return;
  }

  if (args.help) {
    log(HELP);
    return;
  }
  if (args.version) {
    log(readVersion());
    return;
  }

  let config;
  try {
    config = await createConfig(args);
  } catch (err) {
    fail(err.message);
    return;
  }

  for (const warning of config.warnings) {
    console.error(`remote-code-viewer: warning: ${warning}`);
  }

  const server = createServer(config);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, resolve);
  }).catch((err) => {
    fail(`failed to start: ${err.message}`);
    process.exitCode = 1;
  });

  if (process.exitCode) return;

  const { port } = server.address();
  const localUrl = config.authEnabled
    ? `http://${config.host}:${port}/?token=${server.token}`
    : `http://${config.host}:${port}/`;

  log('');
  log(`  remote-code-viewer v${config.version} — ${config.root}`);
  log(`  Local:   ${localUrl}`);

  let tunnelChild = null;
  if (config.tunnel) {
    const { child, url, error } = await startTunnel(port, { verbose: config.verbose });
    tunnelChild = child;
    if (url) {
      const tunnelUrl = config.authEnabled ? `${url}/?token=${server.token}` : `${url}/`;
      log(`  Tunnel:  ${tunnelUrl}`);
      if (config.open) await openBrowser(tunnelUrl);
    } else {
      console.error(`remote-code-viewer: tunnel unavailable (${error}); local URL still works`);
      if (config.open) await openBrowser(localUrl);
    }
  } else if (config.open) {
    await openBrowser(localUrl);
  }

  log('');

  const shutdown = () => {
    log('\n  shutting down…');
    if (tunnelChild) tunnelChild.kill();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main();
