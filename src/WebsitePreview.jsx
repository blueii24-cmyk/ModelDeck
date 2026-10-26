import React, { useEffect, useRef, useState } from "react";
import {
  X, Code2, Monitor, Smartphone, Tablet, RotateCcw, Download, Play,
  Eye, Globe, Terminal, Maximize,
} from "lucide-react";
import { sandboxDocument } from "./preview-utils";
import "./preview.css";

export default function WebsitePreview() {
  const [source, setSource] = useState(null);
  const [running, setRunning] = useState("");
  const [tab, setTab] = useState("preview");
  const [viewport, setViewport] = useState("desktop");
  const [webResources, setWebResources] = useState(false);
  const [revision, setRevision] = useState(0);
  const [logs, setLogs] = useState([]);
  const closeButton = useRef(null);
  const trigger = useRef(null);
  const frame = useRef(null);
  const channel = useRef(null);
  if (!channel.current) channel.current = "modeldeck-preview-" + Math.random().toString(36).slice(2);

  const close = () => {
    setSource(null);
    trigger.current?.isConnected && trigger.current.focus();
  };

  useEffect(() => {
    const open = (event) => {
      const next = String(event.detail?.source || "");
      if (!next) return;
      trigger.current = document.activeElement;
      setSource(next);
      setRunning(next);
      setTab("preview");
      setViewport("desktop");
      setWebResources(false);
      setLogs([]);
      setRevision((v) => v + 1);
      requestAnimationFrame(() => closeButton.current?.focus());
    };
    const reset = () => setSource(null);
    window.addEventListener("modeldeck:preview", open);
    window.addEventListener("modeldeck:conversation", reset);
    return () => {
      window.removeEventListener("modeldeck:preview", open);
      window.removeEventListener("modeldeck:conversation", reset);
    };
  }, []);

  useEffect(() => {
    const receive = (event) => {
      if (event.source !== frame.current?.contentWindow) return;
      const detail = event.data;
      if (detail?.type !== "modeldeck-preview-console" || detail.channel !== channel.current) return;
      const level = ["log", "info", "warn", "error", "debug"].includes(detail.level) ? detail.level : "log";
      setLogs((items) => [
        ...items,
        {
          id: Date.now() + Math.random(),
          level,
          message: String(detail.message || "").slice(0, 1800),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        },
      ].slice(-200));
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("preview-open", source !== null);
    return () => document.documentElement.classList.remove("preview-open");
  }, [source !== null]);

  if (source === null) return null;

  const download = () => {
    const url = URL.createObjectURL(new Blob([source], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "modeldeck-website.html";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const run = () => {
    setRunning(source);
    setLogs([]);
    setRevision((v) => v + 1);
    setTab("preview");
  };
  const reload = () => {
    setLogs([]);
    setRevision((v) => v + 1);
  };
  const toggleWebResources = () => {
    const next = !webResources;
    setWebResources(next);
    setRunning(source);
    setLogs([]);
    setRevision((v) => v + 1);
    setTab("preview");
  };
  const fullscreen = async () => {
    try {
      await frame.current?.requestFullscreen?.();
    } catch {
      setTab("preview");
    }
  };
  const errorCount = logs.filter((entry) => entry.level === "error").length;
  const frameKey = revision + (webResources ? "-web" : "-offline");

  return (
    <aside
      className="website-preview"
      aria-label="Website preview"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !document.fullscreenElement) {
          event.stopPropagation();
          close();
        }
      }}
    >
      <header className="preview-heading">
        <div>
          <span className="modal-eyebrow">IDEA → REALITY</span>
          <h2>Website preview</h2>
        </div>
        <button ref={closeButton} className="iconbtn" onClick={close} aria-label="Close website preview">
          <X size={20} />
        </button>
      </header>

      <div className="preview-controls">
        <div className="preview-tabs" role="tablist" aria-label="Preview view">
          <button role="tab" aria-selected={tab === "preview"} aria-pressed={tab === "preview"} onClick={() => setTab("preview")}>
            <Eye size={14} /> Preview
          </button>
          <button role="tab" aria-selected={tab === "code"} aria-pressed={tab === "code"} onClick={() => setTab("code")}>
            <Code2 size={14} /> Code
          </button>
          <button role="tab" aria-label="Console" aria-selected={tab === "console"} aria-pressed={tab === "console"} onClick={() => setTab("console")}>
            <Terminal size={14} /> Console
            {errorCount > 0 && <span className="preview-error-count">{errorCount}</span>}
          </button>
        </div>
        <div className="preview-devices" aria-label="Preview viewport size">
          <button aria-label="Desktop preview" title="Desktop" aria-pressed={viewport === "desktop"} onClick={() => setViewport("desktop")}><Monitor size={16} /></button>
          <button aria-label="Tablet preview" title="Tablet" aria-pressed={viewport === "tablet"} onClick={() => setViewport("tablet")}><Tablet size={16} /></button>
          <button aria-label="Mobile preview" title="Phone" aria-pressed={viewport === "mobile"} onClick={() => setViewport("mobile")}><Smartphone size={16} /></button>
        </div>
      </div>

      <div className="preview-actions">
        <button onClick={run} title="Run the latest code in the editor"><Play size={13} /> Run changes{source !== running ? " •" : ""}</button>
        <button onClick={reload} aria-label="Reload preview" title="Reload preview"><RotateCcw size={14} /></button>
        <button onClick={fullscreen} aria-label="Fullscreen preview" title="Fullscreen preview"><Maximize size={14} /></button>
        <button onClick={download}><Download size={14} /> Download HTML</button>
        <button
          className={"preview-network" + (webResources ? " enabled" : "")}
          aria-label="Toggle web resources"
          aria-pressed={webResources}
          title="When enabled, external scripts, assets, APIs and WebSockets can load in the isolated preview."
          onClick={toggleWebResources}
        >
          <Globe size={14} /> Web access <span>{webResources ? "On" : "Off"}</span>
        </button>
      </div>

      <div className={"preview-canvas " + viewport} hidden={tab !== "preview"}>
        <iframe
          key={frameKey}
          ref={frame}
          title="Generated website"
          sandbox="allow-scripts allow-pointer-lock"
          allow="fullscreen; gamepad; autoplay; clipboard-write"
          allowFullScreen
          referrerPolicy="no-referrer"
          srcDoc={sandboxDocument(running, { allowExternalResources: webResources, channel: channel.current })}
        />
      </div>

      {tab === "code" && (
        <textarea
          className="preview-editor"
          aria-label="Website HTML code"
          spellCheck={false}
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
      )}

      {tab === "console" && (
        <section className="preview-console" aria-label="Preview console">
          <div className="preview-console-heading">
            <span>Runtime output <span className="preview-console-count">{logs.length}</span></span>
            <button onClick={() => setLogs([])}>Clear</button>
          </div>
          {logs.length === 0 ? (
            <div className="preview-console-empty">
              No console output yet. Run the preview or enable Web access if external assets are needed.
            </div>
          ) : (
            <ol className="preview-console-list">
              {logs.map((entry) => (
                <li key={entry.id} className={"preview-console-row " + entry.level}>
                  <span className="preview-console-time">{entry.time}</span>
                  <span className="preview-console-level">{entry.level}</span>
                  <pre>{entry.message}</pre>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <p className="preview-notice">
        {webResources
          ? "Web access is ON · External scripts, fonts, media, APIs and WebSockets may load. This remains an isolated preview, but it can contact third-party servers. Do not enter secrets."
          : "Isolated offline preview · External libraries, APIs, network requests and WebSockets are blocked. Turn on Web access to try CDN-based sites or games."}
        {" "}Edits are temporary; download the HTML to keep a copy.
      </p>
    </aside>
  );
}
