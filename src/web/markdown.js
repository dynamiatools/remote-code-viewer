import MarkdownIt from 'markdown-it';

// html: false — raw HTML in a repository's Markdown is escaped, not executed.
// No sanitiser dependency needed (docs/security.md §7).
const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

const defaultLinkRender = md.renderer.rules.link_open ?? ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = token.attrGet('href') ?? '';
  if (/^\s*(javascript|data):/i.test(href)) {
    token.attrSet('href', '#');
  } else {
    token.attrSet('rel', 'noopener noreferrer');
    token.attrSet('target', '_blank');
  }
  return defaultLinkRender(tokens, idx, options, env, self);
};

export function renderMarkdown(source) {
  return md.render(source);
}
