import {CapabilityBadges} from './models/ModelCapabilities';
import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Plug,
  RefreshCw,
  Layers,
  ShieldCheck,
  Info,
  UserRound,
  MessageSquare,
} from "lucide-react";
export const dashboardAction = (action, extra = {}) =>
  window.dispatchEvent(
    new CustomEvent("deck:action", { detail: { action, ...extra } }),
  );
export function useDeck() {
  const [data, setData] = useState(null);
  useEffect(() => {
    const listener = (e) => setData(e.detail);
    window.addEventListener("deck:state", listener);
    dashboardAction("snapshot");
    return () => window.removeEventListener("deck:state", listener);
  }, []);
  return data;
}
export function Avatar({ index = 0 }) {
  const colors = [
    "#8faf85",
    "#92a9d5",
    "#d9a052",
    "#8bbfc0",
    "#c18868",
    "#b7a1cc",
    "#a5bd68",
    "#b2aaa0",
  ];
  return (
    <svg
      className="avatar"
      viewBox="0 0 64 64"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ color: colors[index % 8] }}
    >
      <path fill="#0e1114" d="M8 58h48v4H8z" />
      <path
        fill="currentColor"
        d={
          [
            "M16 12h32v8h8v28h-8v8H16v-8H8V20h8z",
            "M28 4h8v12h12v8h8v24H40v8H24v-8H8V24h8v-8h12z",
            "M12 8h12v8h16V8h12v32h-8v16H20V40h-8z",
            "M16 8h32v8h8v16h-8v24H16V32H8V16h8z",
          ][index % 4]
        }
      />
      <path fill="#262b2d" d="M16 24h32v20H16z" />
      <path
        fill="#e9e5d7"
        d={
          index % 2
            ? "M20 28h8v4h-8zm16 0h8v4h-8z"
            : "M20 28h4v8h-4zm20 0h4v8h-4z"
        }
      />
      <path fill="#d9a052" d="M28 38h8v2h-8z" />
      <path fill="#ffffff22" d="M20 16h24v4H20z" />
      <path fill="#121619" d="M20 52h8v8h-8zm16 0h8v8h-8z" />
    </svg>
  );
}
export function Dashboard() {
  const data = useDeck();
  if (!data) return null;
  return (
    <section className="dashboard" aria-label="Model playground">
      <div className="dashboard-intro">
        <div>
          <span className="micro-label">MODELDECK / PLAYGROUND</span>
          <h1>
            Your AI space<span>.</span>
          </h1>
          <p>
            Different minds. Endless possibilities. Find your next collaborator.
          </p>
        </div>
        <div className="dashboard-actions">
          <span className="local-badge">
            <ShieldCheck size={14} /> Local-first workspace
          </span>
          <button className="dashboard-open-chat" onClick={() => dashboardAction("chat")}>
            <MessageSquare size={14} /> Open chat <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      <div className="section-title">
        <h2>
          <Layers size={15} /> Choose your companion
        </h2>
        <span>
          {data.providers.length} providers{" "}
          <button
            aria-label="Previous providers"
            onClick={() =>
              document
                .querySelector(".model-gallery")
                .scrollBy({
                  left: -400,
                  behavior: matchMedia("(prefers-reduced-motion: reduce)")
                    .matches
                    ? "instant"
                    : "smooth",
                })
            }
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Next providers"
            onClick={() =>
              document
                .querySelector(".model-gallery")
                .scrollBy({
                  left: 400,
                  behavior: matchMedia("(prefers-reduced-motion: reduce)")
                    .matches
                    ? "instant"
                    : "smooth",
                })
            }
          >
            <ChevronRight size={16} />
          </button>
        </span>
      </div>
      <div className="model-gallery">
        {data.providers.map((p, i) => (
          <article
            className={"model-card " + (p.selected ? "selected" : "")}
            key={p.id}
          >
            <div className="card-top">
              <span>
                {String(i + 1).padStart(2, "0")} / {p.id.toUpperCase()}
              </span>
              <span
                className={
                  "card-dot " + (p.status === "Verified" ? "verified" : "")
                }
              />
            </div>
            <div className="avatar-scene">
              <Avatar index={i} />
              <span className="pixel-ground" />
            </div>
            <div className="card-body">
              <h3>{p.name}</h3>
              <p className="model-id" title={p.model}>
                {p.model || "Choose a model ID"}
              </p>
              <CapabilityBadges model={p.metadata} compact/><span className="connection-state">{p.status}</span>
              {!p.configured && (
                <small className="suggested-label">
                  Suggested ID · verify with provider
                </small>
              )}
              <div className="card-buttons">
                <button
                  disabled={data.busy}
                  onClick={() => dashboardAction("select", { provider: p.id })}
                >
                  {!p.configured
                    ? "Configure"
                    : p.selected
                      ? "Selected"
                      : "Select model"}
                  <ArrowUpRight size={12} />
                </button>
                <button
                  aria-label={"View " + p.name + " details"}
                  onClick={() => dashboardAction("details", { provider: p.id })}
                >
                  <Info size={13} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
export function WorkspaceInfo() {
  const data = useDeck();
  if (!data) return null;
  return (
    <aside className="workspace-info">
      <details open>
        <summary>
          <Plug size={15} /> Connections <span>{data.connections.length}</span>
        </summary>
        <p className="panel-caption">Your saved API profiles</p>
        {data.connections.map((c) => (
          <button
            key={c.id}
            className="connection-row"
            onClick={() => dashboardAction("connection", { id: c.id })}
          >
            <span
              className={
                "status-dot " + (c.status === "Verified" ? "verified" : "")
              }
            />
            <span>
              <strong>{c.name}</strong>
              <small>{c.status}</small>
            </span>
            <ArrowUpRight size={13} />
          </button>
        ))}
        <button
          className="panel-action"
          onClick={() => dashboardAction("settings")}
        >
          + Manage connections
        </button>
      </details>
      <details open>
        <summary>
          <Layers size={15} /> Selected model
        </summary>
        <div className="model-detail">
          <Avatar index={data.providers.findIndex((p) => p.selected)} />
          <strong>{data.selected.name}</strong>
          <code>{data.selected.model || "Not selected"}</code><CapabilityBadges model={data.selected.metadata}/>
          <span className="connection-state">{data.selected.status}</span>
        </div>
        <dl>
          <dt>Saved models</dt>
          <dd>{data.selected.count}</dd>
          <dt>Saved conversations</dt>
          <dd>{data.chats}</dd>
          <dt>Storage</dt>
          <dd>This browser</dd>
        </dl>
        <button
          className="panel-action"
          disabled={data.busy}
          onClick={() => dashboardAction("models")}
        >
          <RefreshCw size={12} /> Models & discovery
        </button>
        <button
          className="start-chat"
          onClick={() => document.getElementById("newChat").click()}
        >
          Start chat <ArrowUpRight size={14} />
        </button>
      </details>
      <div className="privacy-note">
        <ShieldCheck size={17} />
        <p>
          Your keys, your workspace.
          <br />
          <span>
            Keys stay in this browser, unencrypted. Provider usage fees apply.
          </span>
        </p>
      </div>
    </aside>
  );
}
export function ConnectionBadge() {
  const data = useDeck();
  return (
    <span className="connection-badge">
      <i className={data?.selected.status === "Verified" ? "verified" : ""} />
      {data?.selected.name || "Workspace"}
      <span> / {data?.selected.status || "Not tested"}</span>
    </span>
  );
}
export function SidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <button
      className="collapse-sidebar"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      onClick={() => {
        setCollapsed(!collapsed);
        document.documentElement.classList.toggle(
          "sidebar-collapsed",
          !collapsed,
        );
      }}
    >
      {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
    </button>
  );
}

export function LocalProfile() {
  const [open, setOpen] = useState(false);
  return (
    <div className="local-profile">
      <button
        className="profile-button"
        aria-label="Local workspace profile"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <UserRound size={16} />
      </button>
      {open && (
        <div
          className="profile-popover"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <strong>Local workspace</strong>
          <p>No ModelDeck account required.</p>
          <p>
            Conversations and saved keys live in this browser. Keys are not
            encrypted.
          </p>
          <button
            onClick={() => {
              setOpen(false);
              dashboardAction("settings");
            }}
          >
            Manage API profiles ↗
          </button>
        </div>
      )}
    </div>
  );
}
