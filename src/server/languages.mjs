/**
 * Extension → highlight.js language id. Deliberately small: the client lazily
 * imports only the grammar it needs (ADR-0003), so a wrong or missing id here
 * costs a broken import, not a shipped grammar. Ids are checked against the
 * installed highlight.js package by test/languages.test.mjs.
 */
export const EXT_TO_LANG = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
  ts: 'typescript', mts: 'typescript', cts: 'typescript', tsx: 'typescript',
  vue: 'xml',
  json: 'json', jsonc: 'json',
  py: 'python', pyi: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin', kts: 'kotlin',
  swift: 'swift',
  c: 'c', h: 'c',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hh: 'cpp',
  cs: 'csharp',
  php: 'php',
  sh: 'bash', bash: 'bash', zsh: 'bash',
  ps1: 'powershell',
  sql: 'sql',
  html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml',
  css: 'css',
  scss: 'scss',
  less: 'less',
  yml: 'yaml', yaml: 'yaml',
  toml: 'ini',
  ini: 'ini', cfg: 'ini', conf: 'ini',
  md: 'markdown', markdown: 'markdown',
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  graphql: 'graphql', gql: 'graphql',
  proto: 'protobuf',
  lua: 'lua',
  dart: 'dart',
  scala: 'scala',
  groovy: 'groovy',
  perl: 'perl', pl: 'perl',
  r: 'r',
  diff: 'diff', patch: 'diff',
};

const FILENAME_TO_LANG = {
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  '.gitignore': 'plaintext',
  '.env': 'plaintext',
};

export function detectLang(filename) {
  const base = filename.toLowerCase();
  if (FILENAME_TO_LANG[base]) return FILENAME_TO_LANG[base];
  const dot = base.lastIndexOf('.');
  if (dot === -1) return 'plaintext';
  const ext = base.slice(dot + 1);
  return EXT_TO_LANG[ext] ?? 'plaintext';
}

/**
 * Raster formats the client can render straight from a base64 data: URI
 * (CSP already allows `img-src ... data:`), so no extra route or write
 * syscall is needed. SVG is deliberately excluded — it stays text, shown
 * as highlighted markup, which is both more useful and avoids embedding
 * user-controlled markup as image bytes.
 */
const EXT_TO_IMAGE_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
};

export function detectImageMime(filename) {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return null;
  const ext = filename.slice(dot + 1).toLowerCase();
  return EXT_TO_IMAGE_MIME[ext] ?? null;
}

/**
 * Heuristic symbol outline, per language (ADR-0005). Not a parser: a table of
 * contents, not a language server. Each entry is `{ kind, regex }`; `regex`
 * must capture the symbol name in group 1 and be applied per line.
 */
export const SYMBOL_RULES = {
  javascript: [
    { kind: 'class', regex: /^\s*(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][\w$]*)/ },
    { kind: 'function', regex: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)/ },
    { kind: 'function', regex: /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*\)?\s*=>/ },
    { kind: 'constant', regex: /^\s*(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=/ },
  ],
  typescript: [
    { kind: 'class', regex: /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/ },
    { kind: 'interface', regex: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/ },
    { kind: 'type', regex: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/ },
    { kind: 'function', regex: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)/ },
    { kind: 'function', regex: /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*\)?\s*=>/ },
  ],
  python: [
    { kind: 'class', regex: /^\s*class\s+([A-Za-z_][\w]*)/ },
    { kind: 'function', regex: /^\s*(?:async\s+)?def\s+([A-Za-z_][\w]*)/ },
  ],
  go: [
    { kind: 'function', regex: /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_][\w]*)/ },
    { kind: 'type', regex: /^\s*type\s+([A-Za-z_][\w]*)\s+(?:struct|interface)/ },
  ],
  rust: [
    { kind: 'function', regex: /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_][\w]*)/ },
    { kind: 'type', regex: /^\s*(?:pub\s+)?(?:struct|enum|trait)\s+([A-Za-z_][\w]*)/ },
    { kind: 'impl', regex: /^\s*impl(?:<[^>]*>)?\s+(?:[A-Za-z_][\w]*\s+for\s+)?([A-Za-z_][\w]*)/ },
  ],
  java: [
    { kind: 'class', regex: /^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?(?:class|interface|enum)\s+([A-Za-z_$][\w$]*)/ },
    { kind: 'method', regex: /^\s*(?:public|private|protected)\s+(?:static\s+)?[\w<>\[\],\s]+\s+([A-Za-z_$][\w$]*)\s*\([^;]*\)\s*\{/ },
  ],
  ruby: [
    { kind: 'class', regex: /^\s*class\s+([A-Za-z_][\w]*)/ },
    { kind: 'module', regex: /^\s*module\s+([A-Za-z_][\w]*)/ },
    { kind: 'method', regex: /^\s*def\s+(?:self\.)?([A-Za-z_][\w]*[?!=]?)/ },
  ],
  php: [
    { kind: 'class', regex: /^\s*(?:abstract\s+)?class\s+([A-Za-z_][\w]*)/ },
    { kind: 'function', regex: /^\s*(?:public|private|protected)?\s*(?:static\s+)?function\s+([A-Za-z_][\w]*)/ },
  ],
  csharp: [
    { kind: 'class', regex: /^\s*(?:public|private|protected|internal)?\s*(?:static\s+)?(?:partial\s+)?(?:class|interface|struct|enum)\s+([A-Za-z_][\w]*)/ },
    { kind: 'method', regex: /^\s*(?:public|private|protected|internal)\s+(?:static\s+)?[\w<>\[\],\s]+\s+([A-Za-z_][\w]*)\s*\([^;]*\)\s*\{?\s*$/ },
  ],
};

export function extractSymbols(lang, source) {
  const rules = SYMBOL_RULES[lang];
  if (!rules) return [];
  const lines = source.split('\n');
  const symbols = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { kind, regex } of rules) {
      const match = regex.exec(line);
      if (match) {
        symbols.push({ name: match[1], kind, line: i + 1 });
        break;
      }
    }
  }
  return symbols;
}
