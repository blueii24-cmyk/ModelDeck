// Only explicit HTML documents/fences qualify; ordinary prose never executes.
export function extractWebsite(text) {
  const blocks = [...String(text).matchAll(/```([^\n`]*)\n([\s\S]*?)```/g)];
  const html = blocks.find(([, language, code]) => /^(html|htm)$/i.test(language.trim()) || (!language.trim() && /^\s*(<!doctype html|<html[\s>])/i.test(code)));
  let source = html?.[2]?.trim();
  if (!source && !blocks.length && /^\s*(<!doctype html|<html[\s>])/i.test(text)) source = text.trim();
  if (!source) return null;
  const css = blocks.filter(([ , language]) => /^css$/i.test(language.trim())).map(b => b[2]).join('\n');
  const js = blocks.filter(([ , language]) => /^(javascript|js)$/i.test(language.trim())).map(b => b[2]).join('\n');
  if (css) {
    const style = `<style>\n${css.replace(/<\/style/gi, '<\\/style')}\n</style>`;
    source = /<\/head>/i.test(source) ? source.replace(/<\/head>/i, () => style + '\n</head>') : style + '\n' + source;
  }
  if (js) {
    const script = `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`;
    source = /<\/body>/i.test(source) ? source.replace(/<\/body>/i, () => script + '\n</body>') : source + '\n' + script;
  }
  return source;
}

export function sandboxDocument(source) {
  // This policy precedes user content. Later meta tags cannot loosen it.
  // No same-origin permission, network access, navigation, popups, or form submissions.
  const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer">\n${source}`;
}
