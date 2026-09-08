import http from 'node:http';
import { URL } from 'node:url';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { isRepo, runGit } from './git.mjs';
import { generateToken, tokensMatch, extractToken, shouldSetCookie, cookieHeader } from './auth.mjs';
import { getTree } from './routes/tree.mjs';
import { getFile } from './routes/file.mjs';
import { getSymbols } from './routes/symbols.mjs';
import { getSearch } from './routes/search.mjs';
import { getBranch, getCommits, getStatus, getDiff } from './routes/git.mjs';
import { HttpError } from './errors.mjs';

const HARDENING_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
};

const STATIC_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
};

/** Sliding one-minute window, per client IP. Reset lazily, no timer. */
class RateLimiter {
  constructor(limit) {
    this.limit = limit;
    this.hits = new Map();
  }

  check(ip) {
    const now = Date.now();
    const windowStart = now - 60_000;
    const timestamps = (this.hits.get(ip) ?? []).filter((t) => t > windowStart);
    timestamps.push(now);
    this.hits.set(ip, timestamps);
    return timestamps.length <= this.limit;
  }
}

const API_ROUTES = {
  'GET /api/tree': (ctx, params) => getTree(ctx, params),
  'GET /api/file': (ctx, params) => getFile(ctx, params),
  'GET /api/symbols': (ctx, params) => getSymbols(ctx, params),
  'GET /api/search': (ctx, params) => getSearch(ctx, params),
  'GET /api/git/branch': (ctx) => getBranch(ctx),
  'GET /api/git/commits': (ctx, params) => getCommits(ctx, params),
  'GET /api/git/status': (ctx) => getStatus(ctx),
  'GET /api/git/diff': (ctx, params) => getDiff(ctx, params),
};

function sendJson(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...HARDENING_HEADERS,
    ...extraHeaders,
  });
  res.end(payload);
}

function clientIp(req) {
  return req.socket.remoteAddress ?? 'unknown';
}

async function serveStatic(webRoot, urlPath, req, res) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const candidate = path.join(webRoot, rel);

  let real;
  try {
    real = await fsp.realpath(candidate);
  } catch {
    real = null;
  }

  const isServable = real && (real === webRoot || real.startsWith(webRoot + path.sep));
  const target = isServable && (await fsp.stat(real).catch(() => null))?.isFile()
    ? real
    : path.join(webRoot, 'index.html');

  const ext = path.extname(target).toLowerCase();
  const mime = STATIC_MIME[ext];
  const headers = {
    'Content-Type': mime ?? 'application/octet-stream',
    ...HARDENING_HEADERS,
  };
  if (!mime) headers['Content-Disposition'] = 'attachment';

  const isAsset = target.startsWith(path.join(webRoot, 'assets') + path.sep);
  headers['Cache-Control'] = isAsset ? 'public, max-age=31536000, immutable' : 'no-store';

  try {
    const data = await fsp.readFile(target);
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', ...HARDENING_HEADERS });
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ error: 'not found' }));
  }
}

export function createServer(appConfig) {
  const token = appConfig.presetToken ?? generateToken();
  const rateLimiter = new RateLimiter(appConfig.limits.rateLimitPerMinute);
  const distWeb = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'dist', 'web');

  const ctx = { root: appConfig.root, config: appConfig, git: { run: runGit, isRepo } };

  const server = http.createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, 'http://internal');
    } catch {
      return sendJson(res, 400, { error: 'invalid request' });
    }

    if (url.search.length > appConfig.limits.maxQueryBytes) {
      return sendJson(res, 400, { error: 'invalid request' });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJson(res, 405, { error: 'method not allowed' });
    }

    if (url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true });
    }

    if (!rateLimiter.check(clientIp(req))) {
      return sendJson(res, 429, { error: 'rate limit exceeded' }, { 'Retry-After': '60' });
    }

    if (url.pathname.startsWith('/api/')) {
      if (appConfig.authEnabled) {
        const candidate = extractToken(req, url.searchParams);
        if (!tokensMatch(candidate ?? '', token)) {
          return sendJson(res, 401, { error: 'unauthorized' });
        }
      }

      const extraHeaders = {};
      if (appConfig.authEnabled && shouldSetCookie(req, url.searchParams)) {
        extraHeaders['Set-Cookie'] = cookieHeader(token, { secure: req.socket.encrypted === true });
      }

      if (url.pathname === '/api/meta') {
        const repo = await isRepo(ctx.root, appConfig.limits);
        let branch = null;
        if (repo) {
          const result = await runGit(ctx.root, ['symbolic-ref', '-q', '--short', 'HEAD'], {
            maxOutputBytes: 1024,
            timeoutMs: appConfig.limits.maxGitMs,
          });
          branch = result.ok ? result.stdout.trim() : null;
        }
        return sendJson(res, 200, {
          version: appConfig.version,
          workspace: { name: path.basename(ctx.root) },
          git: { isRepo: repo, branch },
          limits: {
            maxFileSize: appConfig.limits.maxFileSize,
            maxTreeEntries: appConfig.limits.maxTreeEntries,
            maxSearchResults: appConfig.limits.maxSearchResults,
          },
          readOnly: true,
        }, extraHeaders);
      }

      const handler = API_ROUTES[`${req.method === 'HEAD' ? 'GET' : req.method} ${url.pathname}`];
      if (!handler) return sendJson(res, 404, { error: 'not found' }, extraHeaders);

      try {
        const body = await handler(ctx, url.searchParams);
        return sendJson(res, 200, body, extraHeaders);
      } catch (err) {
        if (err instanceof HttpError) {
          const body = err.extra ? { error: err.message, ...err.extra } : { error: err.message };
          return sendJson(res, err.status, body, extraHeaders);
        }
        if (appConfig.verbose) console.error(err);
        return sendJson(res, 500, { error: 'internal error' }, extraHeaders);
      }
    }

    return serveStatic(distWeb, url.pathname, req, res);
  });

  server.token = token;
  return server;
}
