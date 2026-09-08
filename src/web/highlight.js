import hljs from 'highlight.js/lib/core';

const registered = new Set();

// A plain `import(`.../${lang}.js`)` can't be code-split by Rollup — the
// specifier isn't statically analysable, so the build silently drops the
// per-language chunks and every highlight() call fell back to plaintext.
// import.meta.glob gives Vite a concrete file list to chunk at build time,
// but only for a *literal* pattern — Vite's import-analysis plugin walks the
// AST at build time and can't evaluate a computed argument like
// `SOME_ARRAY.map(...)`, so the pattern must be a literal array here.
//
// Globbing the whole highlight.js/lib/languages directory would bundle all
// ~190 grammars (Mathematica, SQF, 1C, …) into the npm tarball, so this list
// is restricted to the ids EXT_TO_LANG in src/server/languages.mjs can
// actually produce. test/languages.test.mjs pins that every id there is a
// real grammar; keep this list a superset of EXT_TO_LANG's values.
const grammarLoaders = import.meta.glob([
  '../../node_modules/highlight.js/lib/languages/javascript.js',
  '../../node_modules/highlight.js/lib/languages/typescript.js',
  '../../node_modules/highlight.js/lib/languages/xml.js',
  '../../node_modules/highlight.js/lib/languages/json.js',
  '../../node_modules/highlight.js/lib/languages/python.js',
  '../../node_modules/highlight.js/lib/languages/ruby.js',
  '../../node_modules/highlight.js/lib/languages/go.js',
  '../../node_modules/highlight.js/lib/languages/rust.js',
  '../../node_modules/highlight.js/lib/languages/java.js',
  '../../node_modules/highlight.js/lib/languages/kotlin.js',
  '../../node_modules/highlight.js/lib/languages/swift.js',
  '../../node_modules/highlight.js/lib/languages/c.js',
  '../../node_modules/highlight.js/lib/languages/cpp.js',
  '../../node_modules/highlight.js/lib/languages/csharp.js',
  '../../node_modules/highlight.js/lib/languages/php.js',
  '../../node_modules/highlight.js/lib/languages/bash.js',
  '../../node_modules/highlight.js/lib/languages/powershell.js',
  '../../node_modules/highlight.js/lib/languages/sql.js',
  '../../node_modules/highlight.js/lib/languages/css.js',
  '../../node_modules/highlight.js/lib/languages/scss.js',
  '../../node_modules/highlight.js/lib/languages/less.js',
  '../../node_modules/highlight.js/lib/languages/yaml.js',
  '../../node_modules/highlight.js/lib/languages/ini.js',
  '../../node_modules/highlight.js/lib/languages/markdown.js',
  '../../node_modules/highlight.js/lib/languages/dockerfile.js',
  '../../node_modules/highlight.js/lib/languages/makefile.js',
  '../../node_modules/highlight.js/lib/languages/graphql.js',
  '../../node_modules/highlight.js/lib/languages/protobuf.js',
  '../../node_modules/highlight.js/lib/languages/lua.js',
  '../../node_modules/highlight.js/lib/languages/dart.js',
  '../../node_modules/highlight.js/lib/languages/scala.js',
  '../../node_modules/highlight.js/lib/languages/groovy.js',
  '../../node_modules/highlight.js/lib/languages/perl.js',
  '../../node_modules/highlight.js/lib/languages/r.js',
  '../../node_modules/highlight.js/lib/languages/diff.js',
]);

function loaderFor(lang) {
  const entry = Object.entries(grammarLoaders).find(([path]) => path.endsWith(`/${lang}.js`));
  return entry?.[1];
}

/**
 * Lazily imports and registers only the grammar for the language actually
 * opened (ADR-0003). The server ships plain text; the client highlights it.
 */
async function ensureLang(lang) {
  if (lang === 'plaintext' || registered.has(lang)) return;
  const load = loaderFor(lang);
  if (!load) return;
  try {
    const mod = await load();
    hljs.registerLanguage(lang, mod.default);
    registered.add(lang);
  } catch {
    // Unknown grammar id: fall back to plaintext rendering.
  }
}

export async function highlight(source, lang) {
  await ensureLang(lang);
  if (lang === 'plaintext' || !registered.has(lang)) {
    return escapeHtml(source).split('\n');
  }
  const html = hljs.highlight(source, { language: lang, ignoreIllegals: true }).value;
  return splitPreservingSpans(html);
}

function escapeHtml(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * hljs.highlight() returns one HTML blob with <span> tags that can span
 * multiple lines (e.g. a block comment). Splitting it on "\n" naively would
 * leave unmatched tags per row, so every line is closed and reopened with
 * whatever spans were open when the newline was hit.
 */
function splitPreservingSpans(html) {
  const lines = [];
  const openTags = [];
  let current = '';
  let i = 0;

  while (i < html.length) {
    if (html.startsWith('<span', i)) {
      const end = html.indexOf('>', i) + 1;
      const tag = html.slice(i, end);
      openTags.push(tag);
      current += tag;
      i = end;
    } else if (html.startsWith('</span>', i)) {
      openTags.pop();
      current += '</span>';
      i += 7;
    } else if (html[i] === '\n') {
      current += openTags.map(() => '</span>').join('');
      lines.push(current);
      current = openTags.join('');
      i += 1;
    } else {
      current += html[i];
      i += 1;
    }
  }
  lines.push(current);
  return lines;
}
