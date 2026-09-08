/**
 * Small colored monogram per highlight.js language id — no icon font, no SVG
 * set, zero added weight. Colors loosely follow the language associations
 * developers already recognise (GitHub's linguist palette) so the badge reads
 * at a glance instead of needing to be learned.
 */
const ICONS = {
  javascript: { abbr: 'JS', color: '#d4b106' },
  typescript: { abbr: 'TS', color: '#3178c6' },
  xml: { abbr: '<>', color: '#e34c26' },
  json: { abbr: '{}', color: '#a3a325' },
  python: { abbr: 'PY', color: '#4b8bbe' },
  ruby: { abbr: 'RB', color: '#a91e14' },
  go: { abbr: 'GO', color: '#00acd7' },
  rust: { abbr: 'RS', color: '#c76b3f' },
  java: { abbr: 'JV', color: '#b07219' },
  kotlin: { abbr: 'KT', color: '#a97bff' },
  swift: { abbr: 'SW', color: '#f05138' },
  c: { abbr: 'C', color: '#5a5a5a' },
  cpp: { abbr: 'C+', color: '#f34b7d' },
  csharp: { abbr: 'C#', color: '#178600' },
  php: { abbr: 'PHP', color: '#6c78af' },
  bash: { abbr: 'SH', color: '#5a9c53' },
  powershell: { abbr: 'PS', color: '#4273ca' },
  sql: { abbr: 'SQL', color: '#c9932e' },
  css: { abbr: 'CSS', color: '#563d7c' },
  scss: { abbr: 'SC', color: '#c6538c' },
  less: { abbr: 'LS', color: '#1d5f8a' },
  yaml: { abbr: 'YML', color: '#c33c3c' },
  ini: { abbr: 'INI', color: '#6d8086' },
  markdown: { abbr: 'MD', color: '#5a76b0' },
  dockerfile: { abbr: 'DK', color: '#3c7ea1' },
  makefile: { abbr: 'MK', color: '#6d6d6d' },
  graphql: { abbr: 'GQL', color: '#d5399c' },
  protobuf: { abbr: 'PB', color: '#4273ca' },
  lua: { abbr: 'LUA', color: '#3455a4' },
  dart: { abbr: 'DT', color: '#00b4ab' },
  scala: { abbr: 'SC', color: '#c22d40' },
  groovy: { abbr: 'GY', color: '#4298b8' },
  perl: { abbr: 'PL', color: '#3178a8' },
  r: { abbr: 'R', color: '#2266c4' },
  diff: { abbr: '±', color: '#6d8086' },
};

const DEFAULT_ICON = { abbr: '·', color: '#8d8a80' };

export function iconFor(lang) {
  return ICONS[lang] ?? DEFAULT_ICON;
}
