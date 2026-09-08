import hljs from 'highlight.js/lib/core';

const registered = new Set();

/**
 * Lazily imports and registers only the grammar for the language actually
 * opened (ADR-0003). The server ships plain text; the client highlights it.
 */
async function ensureLang(lang) {
  if (lang === 'plaintext' || registered.has(lang)) return;
  try {
    const mod = await import(`highlight.js/lib/languages/${lang}.js`);
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
