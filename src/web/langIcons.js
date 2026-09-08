/**
 * Color + label per highlight.js language id, used by FileIcon.vue. Colors
 * loosely follow the language associations developers already recognise
 * (GitHub's linguist palette) so the tree reads at a glance. `name` is not
 * rendered — it backs the icon's <title>/aria-label for hover and screen
 * readers, since color alone isn't an accessible distinguisher.
 */
const ICONS = {
  javascript: { name: 'JavaScript', color: '#d4b106' },
  typescript: { name: 'TypeScript', color: '#3178c6' },
  xml: { name: 'Markup', color: '#e34c26' },
  json: { name: 'JSON', color: '#a3a325' },
  python: { name: 'Python', color: '#4b8bbe' },
  ruby: { name: 'Ruby', color: '#a91e14' },
  go: { name: 'Go', color: '#00acd7' },
  rust: { name: 'Rust', color: '#c76b3f' },
  java: { name: 'Java', color: '#b07219' },
  kotlin: { name: 'Kotlin', color: '#a97bff' },
  swift: { name: 'Swift', color: '#f05138' },
  c: { name: 'C', color: '#5a5a5a' },
  cpp: { name: 'C++', color: '#f34b7d' },
  csharp: { name: 'C#', color: '#178600' },
  php: { name: 'PHP', color: '#6c78af' },
  bash: { name: 'Shell', color: '#5a9c53' },
  powershell: { name: 'PowerShell', color: '#4273ca' },
  sql: { name: 'SQL', color: '#c9932e' },
  css: { name: 'CSS', color: '#563d7c' },
  scss: { name: 'SCSS', color: '#c6538c' },
  less: { name: 'Less', color: '#1d5f8a' },
  yaml: { name: 'YAML', color: '#c33c3c' },
  ini: { name: 'Config', color: '#6d8086' },
  markdown: { name: 'Markdown', color: '#5a76b0' },
  dockerfile: { name: 'Dockerfile', color: '#3c7ea1' },
  makefile: { name: 'Makefile', color: '#6d6d6d' },
  graphql: { name: 'GraphQL', color: '#d5399c' },
  protobuf: { name: 'Protocol Buffers', color: '#4273ca' },
  lua: { name: 'Lua', color: '#3455a4' },
  dart: { name: 'Dart', color: '#00b4ab' },
  scala: { name: 'Scala', color: '#c22d40' },
  groovy: { name: 'Groovy', color: '#4298b8' },
  perl: { name: 'Perl', color: '#3178a8' },
  r: { name: 'R', color: '#2266c4' },
  diff: { name: 'Diff', color: '#6d8086' },
};

const DEFAULT_ICON = { name: 'Text', color: '#8d8a80' };

export function iconFor(lang) {
  return ICONS[lang] ?? DEFAULT_ICON;
}
