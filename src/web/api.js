function getUrlToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

// Strip the token from the visible URL as soon as we have it: the cookie
// exchange (server.mjs) carries it from here on. Keeps it out of shared
// screenshots and Referer headers.
const urlToken = getUrlToken();
if (urlToken) {
  const url = new URL(window.location.href);
  url.searchParams.delete('token');
  window.history.replaceState({}, '', url);
}

class ApiError extends Error {
  constructor(status, body) {
    super(body?.error ?? `request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

async function request(path, params = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  if (urlToken) url.searchParams.set('token', urlToken);

  const res = await fetch(url, { credentials: 'same-origin' });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body;
}

export const api = {
  meta: () => request('/meta'),
  tree: (path, hidden) => request('/tree', { path, hidden: hidden ? 1 : 0 }),
  file: (path) => request('/file', { path }),
  symbols: (path) => request('/symbols', { path }),
  search: (q, opts = {}) => request('/search', { q, ...opts }),
  gitBranch: () => request('/git/branch'),
  gitCommits: (limit) => request('/git/commits', { limit }),
  gitStatus: () => request('/git/status'),
  gitDiff: (path, staged, context) => request('/git/diff', { path, staged: staged ? 1 : 0, context }),
};

export { ApiError };
