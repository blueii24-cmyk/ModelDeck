// Only explicit HTML documents/fences qualify; ordinary prose never executes.
export function extractWebsite(text) {
  const blocks = [...String(text).matchAll(/```([^\n`]*)\n([\s\S]*?)```/g)];
  const html = blocks.find(([, language, code]) => /^(html|htm)(?:$|\s|:|\{)/i.test(language.trim()) || (!language.trim() && /^\s*(<!doctype html|<html[\s>])/i.test(code)));
  let source = html?.[2]?.trim();
  if (!source && !blocks.length && /^\s*(<!doctype html|<html[\s>])/i.test(text)) source = text.trim();
  if (!source) return null;
  const css = blocks.filter(([ , language]) => /^css(?:$|\s|:|\{)/i.test(language.trim())).map(b => b[2]).join('\n');
  const js = blocks.filter(([ , language]) => /^(javascript|js|ecmascript)(?:$|\s|:|\{)/i.test(language.trim())).map(b => b[2]).join('\n');
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

function consoleBridge(channel) {
  return [
    "(() => {",
    "  const channel = " + JSON.stringify(channel) + ";",
    "  const text = (value) => {",
    "    if (typeof value === 'string') return value;",
    "    if (value instanceof Error) return value.stack || value.message || String(value);",
    "    try { const result = JSON.stringify(value); return result === undefined ? String(value) : result; } catch { return String(value); }",
    "  };",
    "  const emit = (level, message) => {",
    "    try { parent.postMessage({ type: 'modeldeck-preview-console', channel, level, message: String(message).slice(0, 1800) }, '*'); } catch {}",
    "  };",
    "  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {",
    "    const original = console[level] && console[level].bind(console);",
    "    if (!original) continue;",
    "    console[level] = (...args) => { emit(level, args.map(text).join(' ')); original(...args); };",
    "  }",
    "  window.addEventListener('error', (event) => {",
    "    if (event.target && event.target !== window) emit('error', 'Resource failed to load: ' + (event.target.src || event.target.href || event.target.tagName));",
    "    else emit('error', (event.message || 'Runtime error') + (event.filename ? ' · ' + event.filename.split('/').pop() : '') + (event.lineno ? ':' + event.lineno : ''));",
    "  }, true);",
    "  window.addEventListener('unhandledrejection', (event) => emit('error', 'Unhandled promise rejection: ' + text(event.reason)));",
    "  window.addEventListener('load', () => emit('info', 'Preview loaded'));",
    "})();"
  ].join('\n');
}

/**
 * Wraps generated code in an isolated iframe document.
 * Remote assets, APIs, and WebSockets are blocked unless the user opts in.
 * Do not add allow-same-origin: the preview must not inherit ModelDeck's origin.
 */
export function sandboxDocument(source, options = {}) {
  const allowExternalResources = options.allowExternalResources === true;
  const channel = String(options.channel || "preview");
  const policy = allowExternalResources
    ? "default-src https: data: blob:; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https: data: blob:; style-src 'unsafe-inline' https: data: blob:; img-src https: data: blob:; font-src https: data: blob:; media-src https: data: blob:; connect-src https: wss:; frame-src https: blob:; worker-src https: blob: data:; child-src https: blob:; manifest-src https: data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'"
    : "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; media-src data: blob:; connect-src 'none'; frame-src 'none'; worker-src blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'";
  const meta = '<meta http-equiv="Content-Security-Policy" content="' + policy + '"><meta name="referrer" content="no-referrer">';
  const bridge = "<script>" + consoleBridge(channel) + "</scr" + "ipt>";
  const headContent = meta + bridge;
  const documentSource = String(source || "");

  if (/<head\b[^>]*>/i.test(documentSource)) {
    return documentSource.replace(/<head\b[^>]*>/i, (opening) => opening + headContent);
  }
  if (/<html\b[^>]*>/i.test(documentSource)) {
    return documentSource.replace(/<html\b[^>]*>/i, (opening) => opening + "<head>" + headContent + "</head>");
  }
  if (/<body\b[^>]*>/i.test(documentSource)) {
    const withoutDoctype = documentSource.replace(/^\s*<!doctype[^>]*>/i, "");
    return "<!doctype html><html><head>" + headContent + "</head>" + withoutDoctype + "</html>";
  }
  const withoutDoctype = documentSource.replace(/^\s*<!doctype[^>]*>/i, "");
  return "<!doctype html><html><head>" + headContent + "</head><body>" + withoutDoctype + "</body></html>";
}
