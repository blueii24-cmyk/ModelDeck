import React, { useEffect, useRef, useState } from 'react';
import { X, Code2, Monitor, Smartphone, RotateCcw, Download, Play, Eye } from 'lucide-react';
import { sandboxDocument } from './preview-utils';
import './preview.css';

export default function WebsitePreview() {
  const [source, setSource] = useState(null);
  const [running, setRunning] = useState('');
  const [tab, setTab] = useState('preview');
  const [mobile, setMobile] = useState(false);
  const [revision, setRevision] = useState(0);
  const closeButton = useRef(null);
  const trigger = useRef(null);
  const close = () => { setSource(null); trigger.current?.isConnected && trigger.current.focus(); };
  useEffect(() => {
    const open = (event) => {
      trigger.current = document.activeElement;
      setSource(event.detail.source); setRunning(event.detail.source); setTab('preview'); setRevision(v => v + 1);
      requestAnimationFrame(() => closeButton.current?.focus());
    };
    const reset = () => setSource(null);
    window.addEventListener('modeldeck:preview', open);
    window.addEventListener('modeldeck:conversation', reset);
    return () => { window.removeEventListener('modeldeck:preview', open); window.removeEventListener('modeldeck:conversation', reset); };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('preview-open', source !== null);
    return () => document.documentElement.classList.remove('preview-open');
  }, [source !== null]);
  if (source === null) return null;
  const download = () => {
    const url = URL.createObjectURL(new Blob([source], {type:'text/html'}));
    const link = document.createElement('a'); link.href = url; link.download = 'modeldeck-website.html'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const run = () => { setRunning(source); setRevision(v => v + 1); setTab('preview'); };
  return <aside className="website-preview" aria-label="Website preview" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
    <header className="preview-heading"><div><span className="modal-eyebrow">IDEA → REALITY</span><h2>Website preview</h2></div><button ref={closeButton} className="iconbtn" onClick={close} aria-label="Close website preview"><X size={20}/></button></header>
    <div className="preview-controls"><div className="preview-tabs" aria-label="Preview view"><button aria-pressed={tab==='preview'} onClick={()=>setTab('preview')}><Eye size={14}/> Preview</button><button aria-pressed={tab==='code'} onClick={()=>setTab('code')}><Code2 size={14}/> Code</button></div><div className="preview-devices"><button aria-label="Desktop preview" aria-pressed={!mobile} onClick={()=>setMobile(false)}><Monitor size={16}/></button><button aria-label="Mobile preview" aria-pressed={mobile} onClick={()=>setMobile(true)}><Smartphone size={16}/></button></div></div>
    <div className="preview-actions"><button onClick={run}><Play size={13}/> Run edits{source!==running?' •':''}</button><button onClick={()=>setRevision(v=>v+1)} aria-label="Reload preview"><RotateCcw size={14}/></button><button onClick={download}><Download size={14}/> Download HTML</button></div>
    <div className={'preview-canvas '+(mobile?'mobile':'')} hidden={tab!=='preview'}><iframe key={revision} title="Generated website" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={sandboxDocument(running)}/></div>
    {tab==='code' && <textarea className="preview-editor" aria-label="Website HTML code" spellCheck={false} value={source} onChange={event=>setSource(event.target.value)}/>}
    <p className="preview-notice">Isolated preview · External requests and libraries are blocked. Use self-contained HTML, CSS, and JavaScript. Edits are temporary; download to keep them. Downloaded files run outside this sandbox.</p>
  </aside>;
}
