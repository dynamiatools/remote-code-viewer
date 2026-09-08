import { reactive } from 'vue';

/**
 * ~40-line hash router (ADR-0002): four views, no history API weirdness with
 * an SPA served from arbitrary sub-paths behind a tunnel.
 *
 * Routes:
 *   #/tree/<path?>
 *   #/file/<path>[:line]
 *   #/search
 *   #/git
 */
function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [view, ...rest] = hash.split('/');

  if (view === 'file') {
    const raw = rest.join('/');
    const m = /^(.*?)(?::(\d+))?$/.exec(raw);
    return { view: 'file', path: decodeURIComponent(m[1] ?? ''), line: m[2] ? Number(m[2]) : null };
  }
  if (view === 'search') return { view: 'search' };
  if (view === 'git') return { view: 'git' };
  return { view: 'tree', path: decodeURIComponent(rest.join('/')) };
}

export const route = reactive(parseHash());

window.addEventListener('hashchange', () => {
  Object.assign(route, parseHash());
});

export function goTree(path = '') {
  window.location.hash = `#/tree/${path ? encodeURIComponent(path).replaceAll('%2F', '/') : ''}`;
}

export function goFile(path, line) {
  const suffix = line ? `:${line}` : '';
  window.location.hash = `#/file/${encodeURIComponent(path).replaceAll('%2F', '/')}${suffix}`;
}

export function goSearch() {
  window.location.hash = '#/search';
}

export function goGit() {
  window.location.hash = '#/git';
}
