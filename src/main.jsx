import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, MessageSquare, Plug, Palette, Trash2, ArrowUp, ArrowUpRight, Menu, Code2, Lightbulb, Feather, Compass, Settings2, HelpCircle } from 'lucide-react';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/pixelify-sans/400.css';
import './legacy.css';
import './style.css';
import { initializeWorkspace } from './workspace';

function PixelFriend({small=false}) {
  return <svg className={small?'pixel-friend small':'pixel-friend'} viewBox="0 0 32 30" aria-hidden="true" shapeRendering="crispEdges"><path fill="currentColor" d="M8 2h16v3h4v4h3v15h-4v4h-6v-4H11v4H5v-4H1V9h3V5h4z"/><path fill="var(--friend-face)" d="M7 9h18v12H7z"/><path fill="var(--text)" d="M10 12h3v4h-3zm9 0h3v4h-3zm-6 6h6v2h-6z"/><path fill="var(--friend-face)" d="M12 3h8v2h-8z"/></svg>;
}
const quests=[{icon:Feather,title:'Make something',desc:'A first draft. A fresh start.',prompt:'Help me write something creative. Ask me what I have in mind.',color:'peach'}, {icon:Code2,title:'Build something',desc:'From “what if” to working code.',prompt:'Help me build a small project. Ask about my idea and experience.',color:'green'}, {icon:Lightbulb,title:'Learn something',desc:'Big questions, simple answers.',prompt:'Explain a difficult concept simply. Ask what I want to learn.',color:'yellow'}, {icon:Compass,title:'Explore an idea',desc:'Follow your curiosity.',prompt:'Help me brainstorm and explore a new idea. Ask what I am thinking about.',color:'purple'}];
function Quests(){const [selected,setSelected]=useState(null);return <div className="quests">{quests.map(({icon:Icon,...q},i)=><button key={q.title} className={'quest '+q.color+(selected===i?' picked':'')} onClick={()=>{setSelected(i);const input=document.getElementById('prompt');input.value=q.prompt;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}}><span className="quest-top"><Icon size={20}/><ArrowUpRight size={16}/></span><strong>{q.title}</strong><span>{q.desc}</span></button>)}</div>}
function Help(){const [open,setOpen]=useState(false);return <><button className="help-button" onClick={()=>setOpen(!open)} aria-expanded={open}><HelpCircle size={15}/> Quick start <ArrowUpRight size={13}/></button>{open&&<div className="quick-help"><strong>Ready, player one?</strong><p>1. Open Connections and add a provider API key.</p><p>2. Pick your model in the top bar.</p><p>3. Ask away. Your chats stay in this browser.</p><small>Keys are stored locally, unencrypted. Provider usage fees apply.</small></div>}</>}
function App(){useEffect(()=>{initializeWorkspace();},[]);return <div className="app">
<aside className="side" id="side">
<a className="brand" href="./" aria-label="ModelDeck home"><span className="brand-icon"><PixelFriend small/></span>ModelDeck<span className="brand-dot">▪</span></a>
<div className="side-caption">YOUR AI PLAYGROUND</div>
<button className="new" id="newChat"><Plus size={17}/> New chat <kbd>+</kbd></button>
<div className="side-label">YOUR CHATS <span>↓</span></div><nav className="history" id="history" aria-label="Recent chats"/>
<div className="empty-history"><MessageSquare size={18}/><span>A clean slate.<br/>Your next idea starts here.</span></div>
<div className="side-bottom"><div className="connection-card"><span className="tiny-cartridge">▥</span><div>Your keys. Your models.<small>One happy little workspace.</small></div></div><button className="navbtn" id="connections"><Plug size={17}/> Connections <span>↗</span></button><button className="navbtn" id="appearance"><Palette size={17}/> Appearance <span id="themeLabel" hidden/></button><button className="navbtn" id="clear"><Trash2 size={16}/> Clear chats</button><div className="sidebar-footer"><span><i/> LOCAL SAVE ON</span><span>v.02</span></div></div>
</aside>
<main className="main"><header className="top"><div className="model-area"><button className="iconbtn mobile-menu" id="menu" aria-label="Open navigation"><Menu size={20}/></button><span className="model-indicator"/><div className="model-control"><span className="micro-label">CURRENT MODEL</span><select className="modelpick" id="model" aria-label="Switch model"/></div></div><div className="top-actions"><span className="byok"><span>✳</span> Bring your own key</span><span className="header-divider"/><button className="iconbtn" id="topAppearance" aria-label="Change appearance"><Palette size={18}/></button><button className="iconbtn" id="topConnections" aria-label="Manage connections"><Settings2 size={18}/></button></div></header>
<section className="chat" id="chat" aria-label="Conversation"><div className="welcome" id="welcome"><div className="welcome-art"><span className="spark spark-one">✦</span><span className="spark spark-two">+</span><div className="friend-stage"><PixelFriend/><span className="friend-shadow"/></div><span className="spark spark-three">+</span><span className="art-label">HELLO, HUMAN.</span></div><div className="eyebrow">LESS SWITCHING. MORE MAKING.</div><h1>A little space for<br/><span>big ideas.</span></h1><p>Your favorite models, all in one place.<br/>Pick a direction. Let’s make something good.</p><div className="quest-label"><span>CHOOSE YOUR NEXT ADVENTURE</span><span>01 — 04</span></div><Quests/></div><div className="messages" id="messages" aria-live="polite"/></section>
<div className="composer-wrap"><div className="composer-shell"><form className="composer" id="form"><textarea id="prompt" rows="1" placeholder="What’s on your mind?" aria-label="Message ModelDeck"/><div className="composer-toolbar"><span><span className="mini-spark">✳</span> A good idea starts with a hello.</span><button className="send" id="send" type="submit" aria-label="Send message"><ArrowUp size={19}/></button></div></form></div><div className="hint"><span><kbd>↵</kbd> to send <span className="hint-dot">·</span> <kbd>shift + ↵</kbd> for a new line</span><span>AI can make mistakes. Stay curious.</span></div><div className="status" id="status" role="status" aria-live="polite"/></div>
<footer className="main-footer"><span><i/> NO SUBSCRIPTIONS. JUST POSSIBILITIES.</span><Help/></footer></main>
<button className="drawer-shade" id="drawerShade" type="button" aria-label="Close navigation"/>
<div className="overlay" id="settings" aria-hidden="true"><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" tabIndex={-1}><span className="modal-eyebrow">WORKSPACE SETTINGS</span><h2 id="sheetTitle">Connections</h2><p className="sub" id="sheetSub"/><div id="sheetContent"/><div className="foot"><button className="secondary" id="close">Done</button><button className="primary" id="save">Save settings</button></div></section></div>
</div>}
createRoot(document.getElementById('root')).render(<App/>);
