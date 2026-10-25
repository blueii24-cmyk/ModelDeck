import {renderMarkdown,renderImages} from './chat/render';
import {setupAttachments} from './chat/attachments';
import {chatPayload,readResponse,generationEndpoint} from './chat/protocol';
import {deleteImages} from './chat/media';
import {createQuest,advanceQuest,failQuest,createQuestView,celebrateReply,stageDescription} from './thinking/quest';
import {extractModelCatalog,describeModel,visibleCatalog,reconcileImports,pricingNotice,CAPABILITIES} from './models/metadata';
import {clearModelViews,renderCatalog,renderCapabilities} from './models/ModelCapabilities';
import { extractWebsite } from './preview-utils';
// Existing provider, storage, and chat controller. Initialized after the React shell mounts.
export function initializeWorkspace() {
(()=>{'use strict';
const $=id=>document.getElementById(id),store='modeldeck-ghpages-v2',themeStore='modeldeck-theme-v2';
const providers={
openrouter:{name:'OpenRouter',defaultModel:'openai/gpt-4o-mini',baseUrl:'https://openrouter.ai/api/v1',type:'openai'},
openai:{name:'OpenAI',defaultModel:'gpt-4o-mini',baseUrl:'https://api.openai.com/v1',type:'openai'},
gemini:{name:'Google Gemini',defaultModel:'gemini-2.5-flash',baseUrl:'https://generativelanguage.googleapis.com/v1beta',type:'gemini'},
anthropic:{name:'Anthropic Claude',defaultModel:'claude-3-5-haiku-latest',baseUrl:'https://api.anthropic.com/v1',type:'anthropic'},
groq:{name:'Groq',defaultModel:'llama-3.3-70b-versatile',baseUrl:'https://api.groq.com/openai/v1',type:'openai'},
deepseek:{name:'DeepSeek',defaultModel:'deepseek-chat',baseUrl:'https://api.deepseek.com',type:'openai'},
omniroute:{name:'OmniRoute',defaultModel:'auto',baseUrl:'http://localhost:20128/v1',type:'openai'},
nvidia:{name:'NVIDIA NIM',defaultModel:'nvidia/llama-3.3-nemotron-super-49b-v1.5',baseUrl:'https://integrate.api.nvidia.com/v1',type:'openai'},
custom:{name:'OpenAI-compatible URL',defaultModel:'',baseUrl:'',type:'openai'}
};
const accents={blue:['Amber','#D9A052'],midnight:['Midnight','#727c91'],emerald:['Emerald','#169b72'],violet:['Violet','#8064df'],rose:['Rose','#d95780'],amber:['Ochre','#ad741b'],ocean:['Ocean','#087f9a']};
let storageWarning=false,active=null,mode='system',accent='blue',kind='appearance',busy=false,loadingModels=false;
function read(k){try{return localStorage.getItem(k)}catch(e){storageWarning=true;return null}}function write(k,v){try{localStorage.setItem(k,v);return true}catch(e){storageWarning=true;return false}}function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
function normalizeId(id,p){id=String(id||'').trim();if(p==='gemini')id=id.replace(/^models\//,'');if(p!=='openrouter')id=id.replace(/^openrouter\/(?=[^/]+\/)/,'');return id}
function load(){const raw=parse(read(store),null)||parse(read('modeldeck-ghpages-v1'),{}),s=raw&&typeof raw==='object'?raw:{},keys=s.keys&&typeof s.keys==='object'?s.keys:{},models=s.models&&typeof s.models==='object'?s.models:{},baseUrls=s.baseUrls&&typeof s.baseUrls==='object'?s.baseUrls:{},available=s.availableModels&&typeof s.availableModels==='object'?s.availableModels:{};let provider=providers[s.provider]?s.provider:'openrouter';if(s.model&&!models[provider])models[provider]=normalizeId(s.model,provider);for(const [p,v] of Object.entries(providers)){if(typeof models[p]!=='string')models[p]=v.defaultModel;if(p==='openrouter')models[p]=models[p].replace(/^openrouter\//,'');else if(models[p].startsWith('openrouter/'))models[p]=v.defaultModel;if(typeof baseUrls[p]!=='string'||!baseUrls[p])baseUrls[p]=p==='custom'?(s.customBaseUrl||''):v.baseUrl;available[p]=Array.isArray(available[p])?available[p].map(x=>typeof x==='string'?{id:x,name:x}:x).filter(x=>x&&typeof x.id==='string') : []}
const chats=Array.isArray(s.chats)?s.chats.filter(c=>c&&typeof c==='object'&&Array.isArray(c.messages)).map(c=>{if(!providers[c.provider])c.provider=provider;if(typeof c.model==='string'&&c.model.startsWith('openrouter/'))c.model=c.provider==='openrouter'?c.model.replace(/^openrouter\//,''):(providers[c.provider]?.defaultModel||'');c.messages.forEach(m=>{if(m&&m.loading){m.content='This request was interrupted when ModelDeck was closed. Send your message again to retry.';m.error=true;m.quest=m.quest&&typeof m.quest==='object'?m.quest:{...createQuest(providers[c.provider]?.name||c.provider,m.model||c.model||''),stage:'waiting',reached:[]};failQuest(m.quest);delete m.loading}});return c}):[];
const connections=Array.isArray(s.connections)?s.connections.filter(x=>x&&x.id&&providers[x.provider]).map(x=>({id:x.id,name:x.name||providers[x.provider].name,provider:x.provider,apiKey:x.apiKey||'',baseUrl:x.baseUrl||baseUrls[x.provider]||providers[x.provider].baseUrl||'',model:x.model||models[x.provider]||providers[x.provider].defaultModel||'',availableModels:Array.isArray(x.availableModels)?x.availableModels.map(m=>describeModel(x.provider,m)):[],freeModelsOnly:x.freeModelsOnly===true,modelCatalog:Array.isArray(x.modelCatalog)?x.modelCatalog.map(m=>describeModel(x.provider,m)):undefined})):[];if(!connections.length){for(const p of Object.keys(providers)){if(keys[p])connections.push({id:'legacy-'+p,name:providers[p].name,provider:p,apiKey:keys[p],baseUrl:baseUrls[p]||providers[p].baseUrl||'',model:models[p]||providers[p].defaultModel||'',availableModels:available[p]||[]})}}if(!connections.length)connections.push({id:'conn-default',name:providers[provider].name,provider,apiKey:keys[provider]||'',baseUrl:baseUrls[provider]||providers[provider].baseUrl||'',model:models[provider]||providers[provider].defaultModel||'',availableModels:available[provider]||[]});const selectedConnectionId=connections.some(x=>x.id===s.selectedConnectionId)?s.selectedConnectionId:connections[0].id;return{chats,keys,models,baseUrls,availableModels:available,provider,customBaseUrl:typeof s.customBaseUrl==='string'?s.customBaseUrl:'',connections,selectedConnectionId}}
const hadCurrent=!!read(store),hadLegacy=!!read('modeldeck-ghpages-v1');const state=load();if(!hadCurrent&&hadLegacy&&write(store,JSON.stringify(state))){try{localStorage.removeItem('modeldeck-ghpages-v1')}catch(e){}}
const attachments=setupAttachments({notice});
// React receives an explicit, key-free view of the controller state.
const connectionChecks = new Map();
const discoveryPending = new Set();
const fingerprint = c => JSON.stringify([c.provider,c.baseUrl,c.apiKey]);
function connectionStatus(c) {
  if (!c || (!c.apiKey && c.provider !== 'omniroute')) return 'Not configured';
  const check=connectionChecks.get(c.id+fingerprint(c));
  return check?.fingerprint===fingerprint(c) ? check.status : 'Not tested';
}
function checked(c,status){connectionChecks.set(c.id+fingerprint(c),{fingerprint:fingerprint(c),status});publishDashboard()}
function modelInfo(c,id=c?.model){return describeModel(c?.provider,(c?.modelCatalog||[]).find(m=>m.id===id)||(c?.availableModels||[]).find(m=>m.id===id)||id||'')}
function publishDashboard(){
  const selected=currentConnection();
  const list=Object.entries(providers).map(([id,p])=>{
    const c=selected?.provider===id?selected:state.connections.find(c=>c.provider===id);
    return {id,name:p.name,model:c?.model||p.defaultModel,metadata:modelInfo(c||{provider:id,model:p.defaultModel}),configured:!!c&&(!!c.apiKey||id==='omniroute'),selected:c?.id===selected?.id,status:connectionStatus(c)};
  });
  window.dispatchEvent(new CustomEvent('deck:state',{detail:{providers:list,connections:state.connections.map(c=>({id:c.id,name:c.name,status:connectionStatus(c)})),selected:{name:providers[selected?.provider]?.name||'No provider',model:active?.model||selected?.model,metadata:modelInfo(selected,active?.model||selected?.model),models:[...new Map([modelInfo(selected,active?.model||selected?.model),...(selected?.availableModels||[]).map(m=>describeModel(selected.provider,m))].filter(m=>m.id).map(m=>[m.id,m])).values()],status:connectionStatus(selected),count:selected?.availableModels?.length||0},chats:state.chats.length,busy}}));
}
function chooseConnection(c){if(busy){notice('Wait for the current response before changing connections.');return}attachments.clear();active=null;syncConnection(c);persist();render();window.dispatchEvent(new Event('modeldeck:conversation'))}
window.addEventListener('deck:action',e=>{
  const {action,provider,id}=e.detail;
  if(action==='pick-model'){setModel(currentConnection().provider,id);return}
  if(action==='snapshot'){publishDashboard();return}
  if(action==='settings'){openSettings('connections');return}
  if(action==='models'){openSettings('models');return}
  if(action==='connection'){const c=state.connections.find(x=>x.id===id);if(c){chooseConnection(c);openSettings('connections')}return}
  if(action==='select'||action==='details'){
    if(busy){notice('Wait for the current response before changing models.');return}
    let c=state.connections.find(x=>x.id===state.selectedConnectionId&&x.provider===provider)||state.connections.find(x=>x.provider===provider);
    if(!c){c={id:crypto.randomUUID(),name:providers[provider].name,provider,apiKey:'',baseUrl:providers[provider].baseUrl,model:providers[provider].defaultModel,availableModels:[]};state.connections.push(c)}
    chooseConnection(c);
    if(action==='details')openSettings('models');else if(!c.apiKey&&provider!=='omniroute')openSettings('connections');
  }
});
function currentConnection(){return state.connections.find(x=>x.id===(active?.connectionId||state.selectedConnectionId))||state.connections[0]}function syncConnection(x){if(!x)return;state.selectedConnectionId=x.id;state.provider=x.provider;state.keys[x.provider]=x.apiKey;state.baseUrls[x.provider]=x.baseUrl;state.models[x.provider]=x.model;state.availableModels[x.provider]=x.availableModels||[]}function currentModel(p){const x=currentConnection();p=p||x?.provider||state.provider;return normalizeId(x&&x.provider===p?x.model:state.models[p]||providers[p].defaultModel||'',p)}
function persist(){if(!write(store,JSON.stringify(state)))notice('Browser storage is unavailable or full. Your latest changes may not be saved.')}
function notice(s){const n=$('status');if(n)n.textContent=s||'';const modal=$('formNotice');if(modal&&$('settings').classList.contains('open'))modal.textContent=s||''}
function applyTheme(){document.documentElement.dataset.mode=mode;document.documentElement.dataset.accent=accent;$('themeLabel').textContent=mode[0].toUpperCase()+mode.slice(1)+' · '+(accents[accent]?.[0]||'Apple Blue');const dark=mode==='dark'||(mode==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.querySelector('meta[name=theme-color]').content=dark?'#101214':'#faf9f4'}
const savedTheme=parse(read(themeStore),null)||parse(read('modeldeck-theme-v1'),{});mode=['light','dark','system'].includes(savedTheme.mode)?savedTheme.mode:'dark';accent=accents[savedTheme.accent]?savedTheme.accent:'blue';applyTheme();if(window.matchMedia)matchMedia('(prefers-color-scheme:dark)').addEventListener?.('change',()=>{if(mode==='system')applyTheme()});
function cacheFor(p){return(state.availableModels[p]||[]).map(x=>typeof x==='string'?{id:x,name:x}:x).filter(x=>x&&typeof x.id==='string')}
function modelLabel(x){const m=describeModel(currentConnection()?.provider,x);return (m.pricingStatus==='free'?'[FREE] ':'')+(x.name&&x.name!==x.id?x.name+' — '+x.id:x.id)+' · '+(m.capabilities.map(c=>CAPABILITIES[c]).join(', ')||'Capability unknown')}
function populateHeader(){publishDashboard();const sel=$('model'),x=currentConnection(),p=active?.provider||x?.provider||state.provider,current=normalizeId(active?.model||currentModel(p),p),items=x&&x.provider===p?(x.availableModels||[]):cacheFor(p);sel.replaceChildren();if(!items.some(x=>x.id===current)){const opt=document.createElement('option');opt.value=current;opt.textContent=current||'Choose a model';sel.append(opt)}items.forEach(x=>{const opt=document.createElement('option');opt.value=x.id;opt.textContent=modelLabel(x);opt.title=x.id;sel.append(opt)});const manage=document.createElement('option');manage.value='__manage__';manage.textContent='Manage / refresh models…';sel.append(manage);const switcher=document.createElement('option');switcher.value='__connections__';switcher.textContent='Switch API key / connection…';sel.append(switcher);sel.value=current;if(sel.value!==current)sel.selectedIndex=0;sel.title=(providers[p]?.name||p)+' · '+current}
// Retain unchanged message nodes so old replies do not animate or announce again.
const messageViews = new WeakMap();
let renderedChat = null;
const sendIcon = $('send').innerHTML;
function setBusy(value) {
  busy = value;
  $('send').disabled = value;
  $('send').setAttribute('aria-label', value ? 'Waiting for model response' : 'Send message');
  $('send').innerHTML = value ? '<span class="send-pulse" aria-hidden="true">···</span>' : sendIcon;
  document.querySelector('.composer-shell').classList.toggle('is-thinking', value);
}
function messageView(message) {
  const signature = JSON.stringify([message.content, message.loading, message.error, message.attachments]);
  const cached = messageViews.get(message);
  if (cached?.signature === signature) return cached.node;
  const node = document.createElement('div');
  node.className = 'message ' + (message.role === 'user' ? 'user' : 'assistant') + (message.error ? ' error' : '') + (message.loading ? ' thinking-message' : '');
  let questView;
  if (message.loading) {
    message.quest ||= createQuest(providers[active?.provider]?.name||'Selected provider',message.model||active?.model||'Your model');
    node.setAttribute('aria-live','off');
    questView=createQuestView(message,persist);
    node.append(questView.card);
  } else {
    if(message.error)node.setAttribute('aria-live','off');
    if(message.error && message.quest){
      questView=createQuestView(message,persist);
      const errorCopy=document.createElement('div');errorCopy.className='quest-error-copy';errorCopy.textContent=String(message.content??'');
      node.append(questView.card,errorCopy);
    } else if(message.role==='assistant'&&!message.error)renderMarkdown(node,String(message.content??''));else node.textContent=String(message.content??'');
    renderImages(node,message.attachments);
    if (message.role === 'assistant' && !message.error) {
      const source = extractWebsite(String(message.content ?? ''));
      if (source) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'website-preview-button'; button.textContent = '▣ Preview website ↗';
        button.onclick = () => window.dispatchEvent(new CustomEvent('modeldeck:preview', {detail:{source}}));
        node.append(button);
      }
      if(['finishing','complete'].includes(message.quest?.stage)&&cached?.node.isConnected)celebrateReply(node);
    }
  }
  messageViews.set(message, {signature, node, questView});
  return node;
}
function announceQuest(message) {
  const announcer=$('requestProgressAnnouncer');
  const q=message?.quest;
  const text=q?`${q.provider} · ${q.model}. ${stageDescription(q.stage,q.provider)}${q.stage==='error'?' '+message.content:''}`:'';
  if(announcer.textContent!==text)announcer.textContent=text;
}

function progress(message, stage) {
  if(!advanceQuest(message.quest,stage))return;
  // Update just this stable card, including when its conversation is detached.
  messageViews.get(message)?.questView?.update();
  if(active?.messages.includes(message))announceQuest(message);
  persist();
}

function render() {
  const history = $('history'); history.replaceChildren();
  state.chats.forEach(c => {
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = c.title || 'New chat'; button.title = button.textContent;
    button.setAttribute('aria-current', String(c === active));
    button.onclick = () => selectChat(c); history.append(button);
  });
  const has = !!active?.messages.length;
  const switched = renderedChat !== active;
  const scroller = $('chat');
  const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 100;
  $('welcome').hidden = has;document.documentElement.classList.toggle('has-conversation',has);
  const messages = $('messages');
  if (switched) messages.replaceChildren();
  const pendingHere = !!active?.messages.some(message => message.loading);
  document.querySelector('.model-area').classList.toggle('is-thinking', pendingHere);
  const hint = $('composerHint');
  if (hint) hint.textContent = busy ? (pendingHere ? 'Your model is thinking…' : 'A reply is still pending in another chat…') : 'A good idea starts with a hello.';
  (active?.messages || []).forEach((message, index) => {
    const node = messageView(message);
    const existing = messages.children[index];
    if (existing !== node) {
      if (existing) existing.replaceWith(node);
      else messages.append(node);
    }
  });
  while (messages.children.length > (active?.messages.length || 0)) messages.lastChild.remove();
  renderedChat = active;
  announceQuest(active?.messages.at(-1));
  populateHeader();
  // Do not pull readers away from an older reply when a request finishes.
  if (switched || nearBottom || pendingHere) requestAnimationFrame(() => scroller.scrollTo({
    top: has ? scroller.scrollHeight : 0,
    behavior: switched || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  }));
}

function closeSide(){const wasOpen=$('side').classList.contains('open');$('side').classList.remove('open');$('drawerShade').classList.remove('open');$('menu').setAttribute('aria-expanded','false');if(wasOpen)$('menu').focus()}
function newChat(){attachments.clear();window.dispatchEvent(new Event('modeldeck:conversation'));const x=currentConnection();active={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),title:'New chat',connectionId:x.id,provider:x.provider,model:currentModel(x.provider),messages:[]};state.chats.unshift(active);persist();render();closeSide();$('prompt').focus({preventScroll:true})}
function selectChat(c){attachments.clear();window.dispatchEvent(new Event('modeldeck:conversation'));active=c;const x=state.connections.find(y=>y.id===c.connectionId)||state.connections.find(y=>y.provider===c.provider)||state.connections[0];if(x){c.connectionId=x.id;syncConnection(x)}if(!providers[c.provider])c.provider=state.provider;if(c.model){state.models[c.provider]=normalizeId(c.model,c.provider);if(x&&x.provider===c.provider)x.model=normalizeId(c.model,c.provider);}if(!c.model)c.model=currentModel(c.provider);persist();render();closeSide()}
function setModel(p,id){if(busy){notice('Wait for the current response before switching models.');populateHeader();return}id=normalizeId(id,p);if(!id)return;const conn=currentConnection();state.provider=p;state.models[p]=id;if(conn&&conn.provider===p){conn.model=id;if(!conn.availableModels.some(m=>m.id===id))conn.availableModels.push(modelInfo(conn,id))}if(active){active.provider=p;active.model=id;active.connectionId=conn?.id||active.connectionId}persist();populateHeader();notice('Model switched to '+id+'.')}
let settingsTrigger=null;
function closeSettings(){clearModelViews();$('settings').classList.remove('open');$('settings').setAttribute('aria-hidden','true');settingsTrigger?.focus()}
function openSettings(type){clearModelViews();$('formNotice').textContent='';settingsTrigger=document.activeElement;kind=type;requestAnimationFrame(()=>$('settings').querySelector('input,select,button')?.focus());$('settings').classList.add('open');$('settings').setAttribute('aria-hidden','false');$('save').textContent=type==='models'?'Use model':'Save settings';$('sheetTitle').textContent=type==='appearance'?'Appearance':type==='models'?'Choose a model':'Connections & models';$('sheetSub').textContent=type==='appearance'?'A quiet, simple workspace for your device.':type==='models'?('Connection: '+currentConnection().name+' · '+providers[currentConnection().provider].name+'. Refresh models or enter an exact ID.'):'Enter the API URL and key for your provider once.';const c=$('sheetContent');c.replaceChildren();
if(type==='appearance'){c.innerHTML='<div class="group-title">Display mode</div><div class="modes">'+[['light','☀','Light','Bright and clear'],['dark','☾','Dark','Dim and focused'],['system','◐','System','Follow your device']].map(x=>'<button type="button" class="mode '+(mode===x[0]?'selected':'')+'" data-mode="'+x[0]+'"><strong>'+x[1]+' '+x[2]+'</strong><small>'+x[3]+'</small></button>').join('')+'</div><div class="group-title" style="margin-top:20px">Accent colour</div><div class="theme-grid">'+Object.entries(accents).map(([id,x])=>'<button type="button" class="theme '+(accent===id?'selected':'')+'" data-accent="'+id+'"><span class="swatch" style="--sw:'+x[1]+'"></span>'+x[0]+'</button>').join('')+'</div><p class="fine">Appearance preferences are saved on this device.</p>';c.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;applyTheme();write(themeStore,JSON.stringify({mode,accent}));c.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('selected',x===b))});c.querySelectorAll('[data-accent]').forEach(b=>b.onclick=()=>{accent=b.dataset.accent;applyTheme();write(themeStore,JSON.stringify({mode,accent}));c.querySelectorAll('[data-accent]').forEach(x=>x.classList.toggle('selected',x===b))});return}
if(type==='connections'){c.innerHTML='<div class="field"><label for="savedConnection">Saved API connections</label><select id="savedConnection"></select></div><div class="model-actions"><button type="button" class="secondary" id="addConnection">＋ Add API key</button><button type="button" class="secondary" id="removeConnection">Remove</button></div><div class="field"><label for="connectionName">Connection name</label><input id="connectionName" placeholder="e.g. Radox key 2"></div><div class="field"><label for="provider">Provider type</label><select id="provider"><option value="openrouter">OpenRouter</option><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option><option value="anthropic">Anthropic Claude</option><option value="groq">Groq</option><option value="deepseek">DeepSeek</option><option value="omniroute">OmniRoute</option><option value="nvidia">NVIDIA NIM</option><option value="custom">OpenAI-compatible URL (Radox AI / other)</option></select></div><div class="field"><label for="baseUrl">API base URL</label><input id="baseUrl" type="url" placeholder="https://your-provider.example/v1" autocomplete="url" inputmode="url" spellcheck="false"></div><div class="field"><label for="apiKey">API key</label><div class="field-row"><input id="apiKey" type="password" placeholder="Paste your API key" autocomplete="off" spellcheck="false"></div></div><div class="field"><label for="testModel">Model ID for chat test / manual selection</label><input id="testModel" placeholder="Exact model ID from your provider"><div id="connectionCapabilities" class="connection-model-capabilities"></div></div><label class="test-consent"><input type="checkbox" id="allowChatTest"> Allow a small chat fallback if discovery fails (may incur charges)</label><label class="model-filter"><input type="checkbox" id="connectionFreeOnly" aria-label="Free models only" aria-describedby="connectionFreeHelp"><span><strong>Free models only</strong><small id="connectionFreeHelp">Only show models available at no cost through this provider.</small></span></label><p id="connectionPricingNotice" class="pricing-notice"></p><div class="model-actions"><button type="button" class="secondary" id="testConnection">Test API key</button></div><div class="model-state" id="connectionTestState" role="status" aria-live="polite"></div><p class="fine">Save multiple API keys, including several keys for the same provider. Each connection keeps its own name, URL, key, and model list. Use the chat header to switch between models or connections. Keys are stored in browser local storage and are not encrypted.</p>';const p=$('provider'),url=$('baseUrl'),key=$('apiKey'),pick=$('savedConnection'),name=$('connectionName');let editing=currentConnection();function fill(){pick.replaceChildren();state.connections.forEach(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=x.name+' · '+providers[x.provider].name;pick.append(o)});pick.value=editing.id}function load(x){editing=x;pick.value=x.id;name.value=x.name;p.value=x.provider;url.value=x.baseUrl;key.value=x.apiKey;$('testModel').value=x.model;renderCapabilities($('connectionCapabilities'),modelInfo(x));$('connectionTestState').textContent='';$('allowChatTest').checked=false;$('connectionFreeOnly').checked=!!x.freeModelsOnly;$('connectionPricingNotice').textContent=pricingNotice(x)}fill();load(editing);$('testModel').oninput=()=>renderCapabilities($('connectionCapabilities'),modelInfo({...editing,provider:p.value},$('testModel').value));pick.onchange=()=>{const x=state.connections.find(y=>y.id===pick.value);if(x)load(x)};$('addConnection').onclick=()=>{const q=p.value,x={id:'conn-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:(providers[q]?.name||q)+' '+(state.connections.length+1),provider:q,apiKey:'',baseUrl:url.value||providers[q].baseUrl||'',model:providers[q].defaultModel||'',availableModels:[]};state.connections.push(x);editing=x;fill();load(x);name.focus()};$('removeConnection').onclick=()=>{if(state.connections.length<2){notice('Keep at least one connection.');return}if(!confirm('Remove this saved API connection?'))return;state.connections=state.connections.filter(x=>x.id!==editing.id);if(state.selectedConnectionId===editing.id)state.selectedConnectionId=state.connections[0].id;state.chats.forEach(ch=>{if(ch.connectionId===editing.id)ch.connectionId=state.selectedConnectionId});editing=state.connections.find(x=>x.id===state.selectedConnectionId)||state.connections[0];syncConnection(editing);persist();fill();load(editing);render()};p.onchange=()=>{$('connectionPricingNotice').textContent=pricingNotice({provider:p.value});url.value=providers[p.value].baseUrl||'';$('testModel').value=providers[p.value].defaultModel||'';renderCapabilities($('connectionCapabilities'),describeModel(p.value,$('testModel').value));const status=$('connectionTestState');if(status){status.textContent='';status.className='model-state'}};$('testConnection').onclick=async()=>{const status=$('connectionTestState'),btn=$('testConnection'),provider=p.value,draft={id:editing.id,name:name.value.trim()||providers[provider].name,provider,baseUrl:url.value.trim().replace(/\/+$/,''),apiKey:key.value.trim(),model:normalizeId($('testModel').value.trim()||providers[provider].defaultModel||'',provider),availableModels:editing.availableModels||[]};status.className='model-state';status.textContent='Testing API access and model discovery…';checked(draft,'Testing');btn.disabled=true;btn.textContent='Testing…';try{const result=await testApiConnection(draft,$('allowChatTest').checked);checked(draft,result.method==='chat'?'Verified':'Models loaded');if(!status.isConnected||pick.value!==draft.id)return;status.className='model-state success';status.textContent='✓ '+result.message}catch(e){checked(draft,'Test failed');if(!status.isConnected||pick.value!==draft.id)return;status.className='model-state error';status.textContent='✕ '+(e.message||'API test failed')}finally{btn.disabled=false;btn.textContent='Test API key'}};return}
if(type==='models'){
  const connection=currentConnection();
  c.innerHTML='<label class="model-filter"><input id="freeModelsOnly" type="checkbox" aria-label="Free models only" aria-describedby="freeModelsHelp"><span><strong>Free models only</strong><small id="freeModelsHelp">Only show models available at no cost through this provider.</small></span></label><p id="pricingNotice" class="pricing-notice" role="status"></p><div class="model-actions"><button type="button" class="secondary" id="refreshModels">↻ Refresh models</button></div><div class="model-state" id="modelState" role="status" aria-live="polite"></div><div class="field"><label for="modelList">Discovered models</label><select id="modelList"></select></div><div id="discoveryResults"></div><div class="field"><label for="modelId">Or enter a model ID manually</label><input id="modelId" placeholder="Model ID from your provider" autocomplete="off" spellcheck="false"><div id="manualCapabilities"></div></div><p class="model-help">Filtering affects discovery/import, not existing saved models. Saved models remain in the chat model picker. Icons describe provider capabilities, not features implemented in this workspace: chat currently sends text only. Image/audio/video generation and embeddings need their own API workflows.</p>';
  const sel=$('modelList'),manual=$('modelId'),status=$('modelState'),filter=$('freeModelsOnly');
  filter.checked=!!connection.freeModelsOnly;
  manual.value=currentModel();
  function choose(id){sel.value=id;manual.value=id;renderCapabilities($('manualCapabilities'),modelInfo(connection,id));fillRows()}
  function fillRows(){renderCatalog($('discoveryResults'),{models:visibleCatalog(connection),selected:manual.value,onSelect:choose})}
  function fillModels(){
    const items=visibleCatalog(connection);
    sel.replaceChildren();
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=items.length?'Choose a discovered model':'No matching discovered models';sel.append(placeholder);
    for(const m of items){const option=document.createElement('option');option.value=m.id;option.textContent=modelLabel(m);sel.append(option)}
    sel.value=items.some(m=>m.id===manual.value)?manual.value:'';
    $('pricingNotice').textContent=pricingNotice(connection);
    renderCapabilities($('manualCapabilities'),modelInfo(connection,manual.value));
    fillRows();
  }
  fillModels();
  filter.onchange=()=>{connection.freeModelsOnly=filter.checked;persist();fillModels()};
  sel.onchange=()=>{if(sel.value)choose(sel.value)};
  manual.oninput=()=>{renderCapabilities($('manualCapabilities'),modelInfo(connection,manual.value));fillRows()};
  $('refreshModels').onclick=async()=>{
    const button=$('refreshModels');status.textContent='Loading models…';button.disabled=true;
    try{const count=await fetchModels(connection.provider,true,connection);if(!status.isConnected||currentConnection()?.id!==connection.id)return;fillModels();status.textContent='Imported '+count+' matching models. '+pricingNotice(connection)}
    catch(e){status.textContent=e.message||'Could not load models.'}
    finally{button.disabled=false}
  };return;
}
}
function baseUrl(p,conn){const raw=conn&&conn.provider===p?conn.baseUrl:(state.baseUrls[p]||providers[p]?.baseUrl||'');return String(raw||'').trim().replace(/\/+$/,'')}
function endpoint(p,kind,m,conn){const meta=providers[p],base=baseUrl(p,conn);if(!base)throw Error('Enter an API base URL in Connections & models.');let url;try{new URL(base)}catch(e){throw Error('That API base URL is not valid. Include https:// (or http:// for localhost).')}
if(meta.type==='gemini'){if(kind==='models')return base.replace(/\/models$/,'')+'/models';const id=encodeURIComponent(normalizeId(m,p));return base.replace(/\/models(?:\/.*)?$/,'')+'/models/'+id+':generateContent'}
if(meta.type==='anthropic'){if(kind==='models')return base.replace(/\/messages$/,'').replace(/\/models$/,'')+'/models';return base.replace(/\/models$/,'').replace(/\/messages$/,'')+'/messages'}
if(kind==='models'){if(/\/models$/i.test(base))return base;if(/\/chat\/completions$/i.test(base))return base.replace(/\/chat\/completions$/i,'/models');return base+'/models'}
if(/\/chat\/completions$/i.test(base))return base;if(/\/models$/i.test(base))return base.replace(/\/models$/i,'/chat/completions');return base+'/chat/completions'}
function headersFor(p,key){const h={'Content-Type':'application/json'};if(p==='gemini')return h;if(p==='anthropic'){h['x-api-key']=key;h['anthropic-version']='2023-06-01';h['anthropic-dangerous-direct-browser-access']='true';return h}if(key)h.Authorization='Bearer '+key;if(p==='openrouter'){h['HTTP-Referer']=location.origin;h['X-Title']='ModelDeck'}return h}
async function requestJson(url,init,timeout,onStage){const secrets=[new URL(url).searchParams.get('key'),init.headers?.['x-api-key'],init.headers?.Authorization?.replace(/^Bearer /,'')].filter(Boolean);const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout||25000);try{onStage?.('sending');const pending=fetch(url,{...init,signal:ctrl.signal});onStage?.('waiting');const res=await pending;onStage?.('receiving');const txt=await res.text();let data;try{data=txt?JSON.parse(txt):{}}catch(e){data={message:txt}}if(!res.ok){const detail=data.error?.message||data.message||data.error||('Request failed ('+res.status+')');throw Error('HTTP '+res.status+': '+(typeof detail==='string'?detail:JSON.stringify(detail)))}return data}catch(e){if(e.name==='AbortError')throw Error('Request timed out. The API did not respond within the time limit.');if(e instanceof TypeError||/Failed to fetch|NetworkError|Load failed/i.test(String(e.message||'')))throw Error('The browser could not reach this API. This usually means a CORS restriction, a wrong URL, a network issue, or that a local API is not running. The key could not be verified from this browser.');let safe=String(e.message||'Request failed');for(const secret of secrets){safe=safe.split(secret).join('[redacted]').split(encodeURIComponent(secret)).join('[redacted]')}throw Error(safe)}finally{clearTimeout(timer)}}
function extractModels(data,p){return extractModelCatalog(data,p)}
async function fetchModels(p,quiet,connection){
  const conn=connection||currentConnection();
  if(!conn||conn.provider!==p)throw Error('Select the correct provider connection before refreshing.');
  if(discoveryPending.has(conn.id))throw Error('This connection is already loading models.');
  const snapshot={...conn},key=String(snapshot.apiKey||'').trim();
  if(!key&&p!=='omniroute')throw Error('Add an API key in Connections & models first.');
  discoveryPending.add(conn.id);checked(snapshot,'Loading');
  try{
    let url=endpoint(p,'models',null,snapshot);
    if(p==='gemini')url+=(url.includes('?')?'&':'?')+'key='+encodeURIComponent(key);
    const data=await requestJson(url,{method:'GET',headers:headersFor(p,key)},25000);
    const items=extractModels(data,p);
    if(!items.length)throw Error('No recognizable models were returned. Model discovery may be unsupported. Enter a model ID manually or use Test API key with the optional chat fallback.');
    if(fingerprint(conn)!==fingerprint(snapshot))throw Error('Connection changed during discovery. Refresh again for the updated connection.');
    conn.modelCatalog=items;conn.availableModels=reconcileImports(conn,items);
    // A manual model is not invalid merely because it is absent from a listing.
    if(!conn.model)conn.model=visibleCatalog(conn)[0]?.id||'';
    checked(snapshot,'Models loaded');
    if(currentConnection()?.id===conn.id){syncConnection(conn);populateHeader()}
    persist();publishDashboard();return visibleCatalog(conn).length;
  }catch(e){checked(snapshot,'Discovery failed');if(quiet)notice('Model discovery failed: '+e.message+' Use a manual model ID or test chat access.');throw e}
  finally{discoveryPending.delete(conn.id)}
}

async function testApiConnection(conn,allowChat=false){const p=conn.provider,key=String(conn.apiKey||'').trim();if(!key&&p!=='omniroute')throw Error('Paste an API key first.');if(!baseUrl(p,conn))throw Error('Enter the API base URL first.');let listError=null;try{let url=endpoint(p,'models',null,conn);if(p==='gemini')url+=(url.includes('?')?'&':'?')+'key='+encodeURIComponent(key);const data=await requestJson(url,{method:'GET',headers:headersFor(p,key)},18000);const items=extractModels(data,p);if(items.length)return{method:'models',count:items.length,message:'Model endpoint reachable. Found '+items.length+' models. Chat access has not been tested.'};listError=Error('The model endpoint replied but did not return recognizable model IDs.')}catch(e){listError=e}if(!allowChat)throw Error('Model discovery unavailable: '+listError.message+' Enter a model ID and enable the optional chat test to verify chat access (may incur provider charges).');const model=normalizeId(conn.model||providers[p].defaultModel||'',p);if(!model)throw Error('Could not load a model list ('+listError.message+'). Add a model ID, then test again.');try{let url=endpoint(p,'chat',model,conn),body,headers=headersFor(p,key);if(p==='gemini'){url+=(url.includes('?')?'&':'?')+'key='+encodeURIComponent(key);body={contents:[{role:'user',parts:[{text:'Reply with OK.'}]}],generationConfig:{maxOutputTokens:8}}}else if(p==='anthropic'){body={model,max_tokens:8,messages:[{role:'user',content:'Reply with OK.'}]}}else{body={model,max_tokens:8,messages:[{role:'user',content:'Reply with OK.'}]}}const probe=await requestJson(url,{method:'POST',headers,body:JSON.stringify(body)},25000);if(!responseText(probe,p))throw Error('The chat test returned an empty or unrecognized response. Check the model ID.');return{method:'chat',count:0,message:'API key works for a small chat request ('+model+'), but the model list could not be loaded. You can enter model IDs manually. Model list error: '+listError.message}}catch(e){throw Error('API test failed. Model-list request: '+listError.message+' Chat test: '+e.message)}}
function selectProvider(p,id){const oldBase=$('baseUrl')?.value.trim();if(oldBase&&providers[$('provider').value])state.baseUrls[$('provider').value]=oldBase;state.provider=p;if(id)state.models[p]=normalizeId(id,p);if(active){active.provider=p;active.model=currentModel(p)}persist();render()}
$('model').addEventListener('change',e=>{const value=e.target.value,p=active?.provider||currentConnection().provider;if(value==='__manage__'){populateHeader();openSettings('models');return}if(value==='__connections__'){populateHeader();openSettings('connections');return}setModel(p,value)});
$('appearance').onclick=()=>openSettings('appearance');$('topAppearance').onclick=()=>openSettings('appearance');$('connections').onclick=()=>openSettings('connections');$('topConnections').onclick=()=>openSettings('connections');$('close').onclick=closeSettings;
$('save').onclick=async()=>{if(kind==='connections'){const p=$('provider').value,url=$('baseUrl').value.trim().replace(/\/+$/,''),key=$('apiKey').value.trim(),name=$('connectionName').value.trim()||providers[p].name,editing=state.connections.find(x=>x.id===$('savedConnection').value);if(!url){notice('Enter the API base URL first.');$('baseUrl').focus();return}try{const parsed=new URL(url);if(!/^https?:$/.test(parsed.protocol))throw Error()}catch(e){notice('Enter a valid API URL including https://');$('baseUrl').focus();return}const conn=editing||state.connections[0];if(conn.provider!==p||conn.baseUrl!==url||conn.apiKey!==key){conn.availableModels=[];delete conn.modelCatalog;}conn.freeModelsOnly=$('connectionFreeOnly').checked;conn.name=name;conn.provider=p;conn.baseUrl=url;conn.apiKey=key;conn.model=normalizeId($('testModel').value.trim()||providers[p].defaultModel||'',p);conn.availableModels=conn.availableModels||[];state.selectedConnectionId=conn.id;state.provider=p;state.baseUrls[p]=url;state.keys[p]=key;state.models[p]=conn.model;state.availableModels[p]=conn.availableModels;syncConnection(conn);if(active){active.provider=p;active.connectionId=conn.id;active.model=conn.model}persist();render();closeSettings();if(key||p==='omniroute'){notice('Connection saved. Loading available models…');try{const n=await fetchModels(p,true,conn);notice('Imported '+n+' matching models. '+pricingNotice(conn)+' Chat access is not yet tested.')}catch(e){notice('Connection saved, but model listing failed: '+e.message+' You can still set a model manually.')}}else notice('API URL saved. Add an API key before chatting.');return}
if(kind==='models'){const manual=$('modelId').value.trim(),selected=$('modelList').value,id=normalizeId(manual||selected,currentConnection().provider);if(!id){notice('Select a model or enter a model ID.');return}setModel(currentConnection().provider,id);closeSettings();return}closeSettings()};
$('settings').onclick=e=>{if(e.target===$('settings'))closeSettings()};$('newChat').onclick=newChat;$('clear').onclick=()=>{if(confirm('Clear all saved chats from this browser?')){void deleteImages(state.chats.flatMap(c=>c.messages.flatMap(m=>m.attachments||[])));state.chats=[];active=null;window.dispatchEvent(new Event('modeldeck:conversation'));persist();render();closeSide();notice('Chat history cleared.')}};$('menu').onclick=()=>{const isOpen=!$('side').classList.contains('open');$('side').classList.toggle('open',isOpen);$('drawerShade').classList.toggle('open',isOpen);$('menu').setAttribute('aria-expanded',String(isOpen));if(isOpen)$('newChat').focus()};$('drawerShade').onclick=closeSide;$('closeSidebar').onclick=closeSide;
document.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{$('prompt').value=b.dataset.prompt;$('prompt').focus();resize()});function resize(){$('prompt').style.height='auto';$('prompt').style.height=Math.min($('prompt').scrollHeight,180)+'px'}$('prompt').addEventListener('input',resize);$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('form').requestSubmit()}});
function responseText(d,p){if(p==='gemini')return d.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('\n').trim()||'';if(p==='anthropic')return d.content?.filter(x=>x.type==='text'||x.text).map(x=>x.text||'').join('\n').trim()||'';const x=d.choices?.[0]?.message?.content;if(typeof x==='string')return x;if(Array.isArray(x))return x.map(y=>typeof y==='string'?y:(y.text||'')).join('\n').trim();return x&&typeof x==='object'?JSON.stringify(x):''}
async function send(raw) {
  let text=String(raw||'').trim();
  if(busy)return;
  let images;try{images=attachments.get()}catch(e){notice(e.message);return}
  if(!text&&!images.length)return;
  const generate=$('requestMode').value==='image';
  if(generate&&!text){notice('Write a prompt describing the image you want to generate.');return}
  if(!text)text='Describe these images.';
  const conn=state.connections.find(x=>x.id===(active?.connectionId||state.selectedConnectionId))||currentConnection();
  if(conn)syncConnection(conn);
  const p=active?.provider||conn?.provider||state.provider,m=normalizeId(active?.model||conn?.model||currentModel(p),p),key=String(conn?.apiKey||'').trim();
  if(!key&&p!=='omniroute'){openSettings('connections');$('sheetSub').textContent='Add an API key to chat with '+(providers[p]?.name||p)+'.';return}
  if(!baseUrl(p,conn)){openSettings('connections');$('sheetSub').textContent='Add the API base URL for this provider.';return}
  if(!m){openSettings('models');return}
  const info=modelInfo(conn,m),imageApi=generate&&['openai','custom','omniroute'].includes(p);
  if(generate&&!['openai','openrouter','gemini','custom','omniroute'].includes(p)){notice('Image generation is not implemented for this provider. Use OpenAI, OpenRouter, Gemini, or a compatible Images API connection.');return}
  if(generate&&info.capabilities.length&&!info.capabilities.includes('imageOutput')){notice('This model is not marked for image generation. Select an image-output model or enter its exact ID. Vision is image understanding, not image generation.');return}
  if(imageApi&&images.length){notice('This image-generation endpoint supports text prompts here, not image editing. Switch to Chat / vision to discuss attachments, or use an image-capable Gemini/OpenRouter model.');return}
  const hasImageContext=images.length||(active?.messages||[]).some(x=>x.role==='user'&&x.attachments?.length);
  if(!imageApi&&hasImageContext&&info.capabilities.length&&!info.capabilities.includes('vision')){notice('The selected model is not marked for image input. Select a vision model or start a text-only conversation.');return}
  if(!generate&&info.capabilities.length&&!info.capabilities.includes('text')&&info.capabilities.some(c=>['embeddings','imageOutput','audioInput','audioOutput','video'].includes(c))){openSettings('models');notice('This model requires a non-text API workflow. Choose Generate image for supported image models, or choose a text/chat model.');return}
  let url;try{url=imageApi?generationEndpoint(baseUrl(p,conn)):endpoint(p,'chat',m,conn)}catch(e){notice(e.message);return}
  attachments.clear(false);
  if(!active)newChat();
  document.documentElement.classList.remove('models-expanded');
  const chat=active,requestConnection={...conn};chat.provider=p;chat.connectionId=conn.id;chat.model=m;
  chat.messages.push({role:'user',content:text,...(images.length?{attachments:images}:{})});
  if(!chat.title||chat.title==='New chat')chat.title=text.replace(/\s+/g,' ').slice(0,38);
  const loading={role:'assistant',content:'Thinking…',loading:true,model:m,quest:createQuest(providers[p]?.name||p,m)};
  chat.messages.push(loading);setBusy(true);$('prompt').value='';resize();notice('');persist();render();
  document.querySelector('.chat-workspace')?.scrollIntoView({block:'nearest',behavior:'instant'});
  try{
    let requestUrl=url;const headers=headersFor(p,key);
    if(p==='gemini')requestUrl+=(requestUrl.includes('?')?'&':'?')+'key='+encodeURIComponent(key);
    const history=chat.messages.filter(x=>x!==loading&&!x.loading&&!x.error&&(x.role==='user'||String(x.content||'').trim()));
    const body=imageApi?{model:m,prompt:text,n:1,...(p!=='openai'||['dall-e-2','dall-e-3'].includes(m)?{response_format:'b64_json'}:{})}:await chatPayload(p,m,history,{generate});
    const data=await requestJson(requestUrl,{method:'POST',headers,body:JSON.stringify(body)},generate?120000:90000,stage=>progress(loading,stage));
    const answer=await readResponse(data,p,{generate});
    if(!answer.text.trim()&&!answer.attachments.length)throw Error(generate?'The provider returned no image. Check that the selected model and endpoint support image generation.':'The provider returned an empty response. Check the selected model and try again.');
    progress(loading,'finishing');loading.content=answer.text;
    if(answer.attachments.length)loading.attachments=answer.attachments;
    delete loading.loading;checked(requestConnection,'Verified');
  }catch(e){checked(requestConnection,'Request failed');failQuest(loading.quest);loading.error=true;loading.content=(e.message||'Unknown network error')+'\n\nCheck the API URL, key, model capabilities, account quota, internet connection, and browser CORS permissions.';delete loading.loading}
  finally{
    setBusy(false);persist();render();if(!loading.error)progress(loading,'complete');
    if(!state.chats.includes(chat))void deleteImages(loading.attachments);
    if(active===chat&&!$('settings').classList.contains('open')&&!document.documentElement.classList.contains('preview-open'))$('prompt').focus({preventScroll:true});
  }
}
$('form').addEventListener('submit',e=>{e.preventDefault();send($('prompt').value)});
function syncViewport(){document.documentElement.style.setProperty('--visual-height',Math.round(window.visualViewport?.height||window.innerHeight)+'px')}syncViewport();window.visualViewport?.addEventListener('resize',syncViewport);window.addEventListener('resize',syncViewport);document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('settings').classList.contains('open'))closeSettings();closeSide()}if(e.key==='Tab'&&$('side').classList.contains('open')&&!$('settings').classList.contains('open')){const nodes=[...$('side').querySelectorAll('a,button')].filter(el=>!el.disabled&&el.offsetParent!==null);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}if(e.key==='Tab'&&$('settings').classList.contains('open')){const nodes=[...$('settings').querySelectorAll('button,input,select,[tabindex]')].filter(el=>!el.disabled&&el.offsetParent!==null);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}});
if(state.chats.length){active=state.chats[0];if(!active.provider)active.provider=state.provider;if(!active.model)active.model=currentModel();if(providers[active.provider])state.provider=active.provider}render();if(storageWarning)notice('Browser storage is unavailable. Some changes may not persist.');
})();
}
