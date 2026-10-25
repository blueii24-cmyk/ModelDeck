(() => {
'use strict';
const KEY = 'modeldeck.browser.v1';
const THEME_KEY = 'modeldeck.appearance.v1';
const THEME_LABELS = { blue: 'Apple Blue', midnight: 'Midnight', emerald: 'Emerald', violet: 'Violet', rose: 'Rose', amber: 'Amber', ocean: 'Ocean' };
const THEME_COLORS = { light: '#f4f5f8', dark: '#101114' };
const T = { mode: 'system', accent: 'blue' };
const P = {
  openrouter: { name: 'OpenRouter', kind: 'openai', url: 'https://openrouter.ai/api/v1', c: '#e0529c' },
  openai: { name: 'OpenAI', kind: 'openai', url: 'https://api.openai.com/v1', c: '#12a37f' },
  gemini: { name: 'Google Gemini', kind: 'gemini', url: 'https://generativelanguage.googleapis.com/v1beta', c: '#3b82f6' },
  anthropic: { name: 'Anthropic Claude', kind: 'anthropic', url: 'https://api.anthropic.com', c: '#d9782d' },
  groq: { name: 'Groq', kind: 'openai', url: 'https://api.groq.com/openai/v1', c: '#f0452c' },
  deepseek: { name: 'DeepSeek', kind: 'openai', url: 'https://api.deepseek.com', c: '#4d6bfe' },
  together: { name: 'Together AI', kind: 'openai', url: 'https://api.together.xyz/v1', c: '#7c5cff' },
  custom: { name: 'Custom (OpenAI-compatible)', kind: 'openai', url: '', c: '#7a869e' }
};
const $ = (id) => document.getElementById(id);
const S = { conns: [], chats: [], conn: null, chat: null, models: {}, model: {}, busy: false, abort: null };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `i${Date.now()}${Math.random().toString(16).slice(2)}`;
const pv = (c) => P[c?.provider] || P.custom;
const cname = (c) => c?.label || pv(c).name;
const cur = () => S.conns.find((c) => c.id === S.conn) || null;
const chat = () => S.chats.find((c) => c.id === S.chat) || null;
const model = () => S.model[S.conn] || '';

function readTheme() {
  try {
    const v = JSON.parse(localStorage.getItem(THEME_KEY) || '{}');
    if (['light', 'dark', 'system'].includes(v.mode)) T.mode = v.mode;
    if (Object.hasOwn(THEME_LABELS, v.accent)) T.accent = v.accent;
  } catch (_) { /* use defaults */ }
}
function effectiveTheme() {
  return T.mode === 'system'
    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : T.mode;
}
function applyTheme() {
  const actual = effectiveTheme();
  const root = document.documentElement;
  root.dataset.theme = actual;
  root.dataset.accent = T.accent;
  const meta = $('themeColor');
  if (meta) meta.setAttribute('content', THEME_COLORS[actual]);
  const summary = $('themeSummary');
  if (summary) summary.textContent = `${T.mode[0].toUpperCase()}${T.mode.slice(1)} · ${THEME_LABELS[T.accent]}`;
  const caption = $('themePreviewCaption');
  if (caption) caption.textContent = `Live preview · ${actual[0].toUpperCase()}${actual.slice(1)} appearance${T.mode === 'system' ? ' (System)' : ''} · ${THEME_LABELS[T.accent]}`;
  document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === T.mode)));
  document.querySelectorAll('[data-accent]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.accent === T.accent)));
}
function setThemeMode(mode) {
  if (!['light', 'dark', 'system'].includes(mode)) return;
  T.mode = mode;
  persistTheme(); applyTheme();
}
function setAccent(accent) {
  if (!Object.hasOwn(THEME_LABELS, accent)) return;
  T.accent = accent;
  persistTheme(); applyTheme();
}
function persistTheme() {
  try { localStorage.setItem(THEME_KEY, JSON.stringify(T)); }
  catch (_) { toast('Theme will apply now, but browser storage is unavailable.'); }
}

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3400);
}

/* ---------- storage ---------- */
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}');
    S.conns = (d.connections || []).filter((c) => c && c.id && c.key && c.remember);
    S.chats = (d.conversations || []).filter((c) => c && c.id && Array.isArray(c.messages));
    S.model = d.currentModelByConnection || {};
    S.conn = S.conns.some((c) => c.id === d.activeConnectionId) ? d.activeConnectionId : S.conns[0]?.id || null;
    S.conns.forEach((c) => { S.models[c.id] = c.defaultModel ? [{ id: c.defaultModel, label: c.defaultModel }] : []; });
  } catch (e) { console.warn('Could not read saved data', e); }
}
function save() {
  try {
    const ids = new Set(S.conns.filter((c) => c.remember).map((c) => c.id));
    localStorage.setItem(KEY, JSON.stringify({
      connections: S.conns.filter((c) => c.remember),
      activeConnectionId: ids.has(S.conn) ? S.conn : null,
      conversations: S.chats,
      currentModelByConnection: Object.fromEntries(Object.entries(S.model).filter(([id]) => ids.has(id)))
    }));
  } catch (e) { toast('Browser storage is full or blocked, so changes may not be saved.'); }
}

/* ---------- markdown (small, escapes everything first) ---------- */
function inline(s) {
  return s.split(/(`[^`\n]+`)/).map((seg, i) => {
    if (i % 2) return `<code>${esc(seg.slice(1, -1))}</code>`;
    return esc(seg)
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }).join('');
}
function blocks(text) {
  const out = []; let para = [], list = null, quote = [];
  const fp = () => { if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`); para = []; };
  const fl = () => { if (list) out.push(`</${list}>`); list = null; };
  const fq = () => { if (quote.length) out.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`); quote = []; };
  for (const line of text.split('\n')) {
    let m;
    if (!line.trim()) { fp(); fl(); fq(); }
    else if ((m = line.match(/^(#{1,6})\s+(.*)/))) { fp(); fl(); fq(); out.push(`<h${m[1].length > 2 ? 4 : 3}>${inline(m[2])}</h${m[1].length > 2 ? 4 : 3}>`); }
    else if ((m = line.match(/^\s*([-*+]|\d+[.)])\s+(.*)/))) {
      fp(); fq(); const t = /\d/.test(m[1]) ? 'ol' : 'ul';
      if (list !== t) { fl(); out.push(`<${t}>`); list = t; }
      out.push(`<li>${inline(m[2])}</li>`);
    }
    else if ((m = line.match(/^>\s?(.*)/))) { fp(); fl(); quote.push(m[1]); }
    else { fl(); fq(); para.push(line.trim()); }
  }
  fp(); fl(); fq();
  return out.join('');
}
function md(src) {
  return String(src).split('```').map((p, i) => {
    if (!(i % 2)) return blocks(p);
    const nl = p.indexOf('\n');
    return `<pre><button class="cp" type="button">Copy</button><code>${esc(nl < 0 ? '' : p.slice(nl + 1).replace(/\n$/, ''))}</code></pre>`;
  }).join('');
}

/* ---------- rendering ---------- */
function render() {
  const c = cur(), ch = chat(), has = !!ch?.messages.length;
  $('connPick').innerHTML = '<option value="">No connection</option>' + S.conns.map((x) => `<option value="${esc(x.id)}">${esc(cname(x))}</option>`).join('');
  $('connPick').value = c ? c.id : '';
  const list = (c && S.models[c.id]) || [], m = model();
  $('modelPick').innerHTML = c
    ? `<option value="">Choose a model</option>${list.map((x) => `<option value="${esc(x.id)}">${esc(x.label)}</option>`).join('')}${m && !list.some((x) => x.id === m) ? `<option value="${esc(m)}">${esc(m)}</option>` : ''}<option value="__new">Enter a model ID…</option>`
    : '<option value="">Add a key first</option>';
  $('modelPick').value = m; $('modelPick').disabled = !c; $('refresh').disabled = !c || S.busy;
  $('connCount').textContent = S.conns.length;
  $('chatList').innerHTML = S.chats.length
    ? [...S.chats].sort((a, b) => b.updatedAt - a.updatedAt).map((x) => `<div class="chat${x.id === S.chat ? ' on' : ''}"><button class="t" data-open="${esc(x.id)}">${esc(x.title)}</button><button class="x" data-del="${esc(x.id)}" aria-label="Delete chat">×</button></div>`).join('')
    : '<div class="empty">Chats you start will appear here.</div>';
  $('hello').hidden = has; $('thread').hidden = !has;
  $('helloAdd').hidden = !!c;
  const ready = !!(c && m);
  $('input').disabled = !c;
  $('input').placeholder = !c ? 'Add a key to start' : !m ? 'Choose a model to start' : `Message ${m}`;
  $('send').disabled = S.busy ? false : !ready;
  $('send').textContent = S.busy ? '■' : '↑';
  $('send').setAttribute('aria-label', S.busy ? 'Stop' : 'Send');
  renderThread();
}
function renderThread() {
  const ch = chat(); if (!ch) return;
  const last = ch.messages.length - 1;
  $('thread').innerHTML = ch.messages.map((m, i) => {
    if (m.role === 'user') return `<div class="msg user">${esc(m.content)}</div>`;
    const conn = S.conns.find((x) => x.id === m.connId);
    const body = m.content ? md(m.content) : '<span class="wait"><i></i><i></i><i></i></span>';
    const acts = !S.busy && m.content ? `<div class="acts"><button data-copy="${i}">Copy</button>${i === last ? '<button data-regen>Regenerate</button>' : ''}</div>` : '';
    return `<div class="msg bot${m.error ? ' bad' : ''}"><div class="who"><span class="dot" style="background:${esc(m.color || '#7a869e')}"></span>${esc(m.model || 'Assistant')}${conn ? '' : ''}</div><div class="body">${body}</div>${acts}</div>`;
  }).join('');
}
const stick = () => { const s = $('stage'); if (s.scrollHeight - s.scrollTop - s.clientHeight < 140) s.scrollTop = s.scrollHeight; };

function renderCards() {
  $('cards').innerHTML = S.conns.length ? S.conns.map((c) => `
    <div class="card${c.id === S.conn ? ' on' : ''}" style="border-left-color:${pv(c).c}">
      <div><b>${esc(cname(c))}</b><small>${esc(pv(c).name)} · ${esc(c.key.slice(0, 4))}…${esc(c.key.slice(-3))} · ${c.remember ? 'saved on this device' : 'this session only'}</small></div>
      <button class="btn" data-use="${esc(c.id)}">${c.id === S.conn ? 'In use' : 'Use'}</button>
      <button class="btn" data-rm="${esc(c.id)}" aria-label="Remove ${esc(cname(c))}">Remove</button>
    </div>`).join('') : '<p class="note">No connections yet. Add one below.</p>';
}

/* ---------- connections & models ---------- */
function pickConn(id) {
  if (!S.conns.some((c) => c.id === id)) return;
  S.conn = id;
  if (!S.model[id]) S.model[id] = cur().defaultModel || '';
  save(); render();
}
async function addConn(e) {
  e.preventDefault();
  const id = $('fProvider').value, p = P[id], key = $('fKey').value.trim();
  const base = id === 'custom' ? $('fUrl').value.trim().replace(/\/+$/, '') : p.url;
  if (!key) return toast('Paste an API key first.');
  if (id === 'custom') { try { new URL(base); } catch { return toast('That base URL doesn’t look valid.'); } }
  const c = { id: uid(), provider: id, label: $('fName').value.trim() || p.name, key, baseUrl: base, defaultModel: $('fModel').value.trim(), remember: $('fRemember').checked };
  S.conns.push(c); S.conn = c.id;
  S.models[c.id] = c.defaultModel ? [{ id: c.defaultModel, label: c.defaultModel }] : [];
  S.model[c.id] = c.defaultModel;
  $('addForm').reset(); $('fProvider').value = 'openrouter'; provFields();
  save(); render(); renderCards(); $('deck').close();
  toast('Connected. Loading models…');
  await loadModels(c.id, true);
}
function rmConn(id) {
  const c = S.conns.find((x) => x.id === id); if (!c) return;
  if (!confirm(`Remove “${cname(c)}” and its key from ModelDeck?`)) return;
  S.conns = S.conns.filter((x) => x.id !== id); delete S.models[id]; delete S.model[id];
  if (S.conn === id) S.conn = S.conns[0]?.id || null;
  save(); render(); renderCards();
}
function provFields() { $('fUrlWrap').hidden = $('fProvider').value !== 'custom'; }

function headers(c, json) {
  const k = pv(c).kind, h = json ? { 'Content-Type': 'application/json' } : {};
  if (k === 'gemini') h['x-goog-api-key'] = c.key;
  else if (k === 'anthropic') Object.assign(h, { 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' });
  else h.Authorization = `Bearer ${c.key}`;
  return h;
}
const base = (c) => { const b = String(c.baseUrl || pv(c).url || '').replace(/\/+$/, ''); if (!b) throw new Error('This connection has no base URL.'); return b; };
async function failure(r) {
  let t = ''; try { const j = await r.clone().json(); t = j?.error?.message || j?.message || (typeof j?.error === 'string' ? j.error : JSON.stringify(j)); } catch { try { t = await r.text(); } catch { /* ignore */ } }
  return new Error(`${r.status} ${String(t || r.statusText).slice(0, 400)}`);
}
function explain(e) {
  const m = String(e?.message || '');
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'The browser couldn’t reach the provider. Check your connection; if it persists, the provider may block direct browser requests (CORS).';
  if (/^40[13]/.test(m)) return 'The provider rejected this key. Check that it’s correct and has API access.';
  if (/^429/.test(m)) return 'Rate limit or quota reached. Check your usage and billing, then retry.';
  return m.slice(0, 320) || 'Something went wrong.';
}
async function loadModels(id, quiet) {
  const c = S.conns.find((x) => x.id === id); if (!c) return;
  $('refresh').disabled = true;
  try {
    const k = pv(c).kind;
    const url = k === 'anthropic' ? `${base(c)}/v1/models?limit=100` : `${base(c)}/models`;
    const r = await fetch(url, { headers: headers(c) });
    if (!r.ok) throw await failure(r);
    const j = await r.json();
    const raw = k === 'gemini' ? (j.models || []).filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent')).map((m) => ({ id: String(m.name).replace(/^models\//, ''), label: m.displayName }))
      : (j.data || j.models || []).map((m) => ({ id: String(m.id || m.name || ''), label: m.display_name || m.name }));
    let list = raw.filter((m) => m.id).map((m) => ({ id: m.id, label: m.label && m.label !== m.id ? `${m.label} (${m.id})` : m.id })).sort((a, b) => a.id.localeCompare(b.id));
    if (!list.length) throw new Error('The provider returned no models. Enter a model ID instead.');
    if (c.defaultModel && !list.some((m) => m.id === c.defaultModel)) list.unshift({ id: c.defaultModel, label: c.defaultModel });
    S.models[id] = list;
    if (!list.some((m) => m.id === S.model[id])) S.model[id] = list.find((m) => m.id === c.defaultModel)?.id || list[0].id;
    save(); if (!quiet) toast(`Loaded ${list.length} models.`);
  } catch (e) { toast(quiet ? 'Connected, but the model list didn’t load. Enter a model ID instead.' : explain(e)); }
  render();
}

/* ---------- chatting ---------- */
async function stream(c, m, history, signal, onText) {
  const k = pv(c).kind; let url, body;
  if (k === 'gemini') {
    url = `${base(c)}/models/${encodeURIComponent(m)}:streamGenerateContent?alt=sse`;
    body = { contents: history.map((x) => ({ role: x.role === 'assistant' ? 'model' : 'user', parts: [{ text: x.content }] })), generationConfig: { maxOutputTokens: 8192 } };
  } else if (k === 'anthropic') {
    url = `${base(c)}/v1/messages`; body = { model: m, max_tokens: 8192, stream: true, messages: history };
  } else { url = `${base(c)}/chat/completions`; body = { model: m, stream: true, messages: history }; }
  const r = await fetch(url, { method: 'POST', headers: headers(c, true), signal, body: JSON.stringify(body) });
  if (!r.ok) throw await failure(r);
  const pick = (j) => {
    if (k === 'gemini') return (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    if (k === 'anthropic') return j.type === 'content_block_delta' ? j.delta?.text || '' : '';
    const d = j.choices?.[0]?.delta?.content ?? j.choices?.[0]?.message?.content;
    return Array.isArray(d) ? d.map((p) => p.text || '').join('') : d || '';
  };
  let got = false;
  const line = (l) => {
    if (!l.startsWith('data:')) return;
    const d = l.slice(5).trim(); if (!d || d === '[DONE]') return;
    try { const t = pick(JSON.parse(d)); if (t) { got = true; onText(t); } } catch { /* partial or non-JSON line */ }
  };
  if (!r.body) { const j = await r.json(); const t = pick(j); if (t) { got = true; onText(t); } }
  else {
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const ls = buf.split(/\r?\n/); buf = ls.pop() || ''; ls.forEach(line);
    }
    if (buf.trim()) line(buf.trim());
  }
  if (!got) throw new Error('The model returned no text. Check the model ID and your access to it.');
}

async function run(ch) {
  const c = cur(), m = model();
  const bot = { role: 'assistant', content: '', model: m, connId: c.id, color: pv(c).c };
  ch.messages.push(bot); ch.updatedAt = Date.now();
  S.busy = true; S.abort = new AbortController(); render(); save();
  $('stage').scrollTop = $('stage').scrollHeight;
  const history = ch.messages.filter((x) => x !== bot && !x.error).map((x) => ({ role: x.role, content: x.content }));
  let raf = 0;
  try {
    await stream(c, m, history, S.abort.signal, (t) => {
      bot.content += t;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderThread(); stick(); });
    });
  } catch (e) {
    if (e?.name === 'AbortError') { if (!bot.content.trim()) ch.messages.pop(); }
    else { bot.error = true; bot.content = `Couldn’t get a reply. ${explain(e)}`; }
  } finally {
    S.busy = false; S.abort = null; cancelAnimationFrame(raf); ch.updatedAt = Date.now(); save(); render();
  }
}
async function onSend(e) {
  e.preventDefault();
  if (S.busy) return S.abort?.abort();
  const text = $('input').value.trim(), c = cur();
  if (!text) return;
  if (!c) { $('deck').showModal(); return; }
  if (!model()) return toast('Choose a model from the top bar first.');
  let ch = chat();
  if (!ch) {
    const t = text.replace(/[#>*`\n]+/g, ' ').trim();
    ch = { id: uid(), title: t.length > 42 ? `${t.slice(0, 40)}…` : t, messages: [], updatedAt: Date.now() };
    S.chats.push(ch); S.chat = ch.id;
  }
  ch.messages.push({ role: 'user', content: text });
  $('input').value = ''; grow();
  await run(ch);
}

/* ---------- misc ---------- */
function grow() { const t = $('input'); t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 200)}px`; }
function newChat() { S.abort?.abort(); S.chat = null; $('rail').classList.remove('open'); render(); $('input').focus(); }

function bind() {
  $('newChat').onclick = newChat;
  $('openAppearance').onclick = () => { applyTheme(); $('appearance').showModal(); };
  document.querySelectorAll('[data-close-appearance]').forEach((b) => { b.onclick = () => $('appearance').close(); });
  $('appearance').addEventListener('click', (e) => { if (e.target === $('appearance')) $('appearance').close(); });
  document.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => setThemeMode(b.dataset.mode); });
  document.querySelectorAll('[data-accent]').forEach((b) => { b.onclick = () => setAccent(b.dataset.accent); });
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemTheme = () => { if (T.mode === 'system') applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onSystemTheme); else if (mq.addListener) mq.addListener(onSystemTheme);
  }
  $('openDeck').onclick = () => { renderCards(); $('deck').showModal(); };
  $('addKey').onclick = $('helloAdd').onclick = () => { renderCards(); $('deck').showModal(); };
  $('clearChats').onclick = () => {
    if (!S.chats.length) return toast('No chats to clear.');
    if (confirm('Delete all chats saved in this browser? This can’t be undone.')) { S.abort?.abort(); S.chats = []; S.chat = null; save(); render(); }
  };
  $('menuBtn').onclick = () => $('rail').classList.add('open');
  document.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => $('deck').close(); });
  $('deck').addEventListener('click', (e) => { if (e.target === $('deck')) $('deck').close(); });
  $('fProvider').innerHTML = Object.entries(P).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
  $('fProvider').onchange = provFields;
  $('addForm').onsubmit = addConn;
  $('cards').onclick = (e) => {
    const u = e.target.closest('[data-use]'), r = e.target.closest('[data-rm]');
    if (u) { pickConn(u.dataset.use); renderCards(); $('deck').close(); }
    if (r) rmConn(r.dataset.rm);
  };
  $('connPick').onchange = (e) => { if (e.target.value) pickConn(e.target.value); else { S.conn = null; render(); } };
  $('modelPick').onchange = (e) => {
    let v = e.target.value;
    if (v === '__new') {
      v = (prompt('Exact model ID, as listed in the provider’s docs:', model()) || '').trim();
      if (!v) return render();
      if (!S.models[S.conn].some((x) => x.id === v)) S.models[S.conn].push({ id: v, label: v });
    }
    S.model[S.conn] = v; save(); render();
  };
  $('refresh').onclick = () => loadModels(S.conn);
  $('composer').onsubmit = onSend;
  $('input').oninput = grow;
  $('input').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('composer').requestSubmit(); } };
  $('starters').onclick = (e) => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    if (!cur()) { $('deck').showModal(); return toast('Add a key, then pick a starter.'); }
    $('input').value = b.dataset.p; grow(); $('input').focus();
  };
  $('chatList').onclick = (e) => {
    const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
    if (o) {
      S.abort?.abort(); S.chat = o.dataset.open; $('rail').classList.remove('open'); render();
      $('stage').scrollTop = $('stage').scrollHeight;
    }
    if (d) { if (S.chat === d.dataset.del) { S.abort?.abort(); S.chat = null; } S.chats = S.chats.filter((x) => x.id !== d.dataset.del); save(); render(); }
  };
  $('thread').onclick = (e) => {
    const cp = e.target.closest('.cp'), cb = e.target.closest('[data-copy]'), rg = e.target.closest('[data-regen]');
    const copy = (t, b) => navigator.clipboard?.writeText(t).then(() => { const o = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = o; }, 1200); }, () => toast('Couldn’t copy. Select the text instead.'));
    if (cp) copy(cp.parentElement.querySelector('code').textContent, cp);
    if (cb) copy(chat().messages[+cb.dataset.copy].content, cb);
    if (rg && !S.busy) {
      if (!cur() || !model()) return toast('Choose a connection and model first.');
      const ch = chat(); ch.messages.pop(); run(ch);
    }
  };
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); newChat(); }
    if (e.key === 'Escape') $('rail').classList.remove('open');
  });
}

readTheme(); applyTheme(); load(); bind(); provFields(); render();
})();
