import crypto from 'node:crypto';

export function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/** Constant-time compare. Different lengths are rejected without leaking timing. */
export function tokensMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || b.length === 0) {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const COOKIE_NAME = 'rcv_token';

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

/**
 * Extracts a candidate token from the request without validating it.
 * Precedence: Authorization header, then ?token=, then the cookie.
 */
export function extractToken(req, query) {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) return auth.slice('Bearer '.length);

  const fromQuery = query.get('token');
  if (fromQuery) return fromQuery;

  const cookies = parseCookies(req.headers['cookie']);
  return cookies[COOKIE_NAME] ?? null;
}

/** True when the request should exchange its ?token= for the HttpOnly cookie. */
export function shouldSetCookie(req, query) {
  return Boolean(query.get('token'));
}

export function cookieHeader(token, { secure }) {
  const attrs = [`${COOKIE_NAME}=${encodeURIComponent(token)}`, 'HttpOnly', 'SameSite=Strict', 'Path=/'];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}
