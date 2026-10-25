import React from "react";
import { createRoot } from "react-dom/client";
import {
  MessageSquare,
  Image,
  Eye,
  Mic,
  Volume2,
  Video,
  Network,
  Code2,
  Brain,
  Layers,
  Box,
} from "lucide-react";
import { CAPABILITIES } from "./metadata";
import "./models.css";
const icons = {
  text: MessageSquare,
  imageOutput: Image,
  vision: Eye,
  audioInput: Mic,
  audioOutput: Volume2,
  video: Video,
  embeddings: Network,
  code: Code2,
  reasoning: Brain,
  multimodal: Layers,
};
const priority = [
  "embeddings",
  "imageOutput",
  "audioOutput",
  "video",
  "code",
  "reasoning",
  "multimodal",
  "text",
  "vision",
  "audioInput",
];
export function CapabilityBadges({ model, compact = false }) {
  const caps = priority.filter((c) => model?.capabilities?.includes(c));
  return (
    <span className="model-capabilities" aria-label="Model capabilities">
      {caps.length ? (
        caps.map((c, index) => {
          const Icon = icons[c],
            label =
              c === "video"
                ? `Video (${model.videoDirection || "direction unknown"})`
                : CAPABILITIES[c];
          return (
            <span
              key={c}
              className={
                "capability " + (index === 0 ? "primary-capability" : "")
              }
              title={`${label} · ${model.capabilitySource}`}
            >
              <Icon size={13} role="img" aria-label={label} />
              {!compact && <span>{label}</span>}
            </span>
          );
        })
      ) : (
        <span
          className="capability"
          title="Capability unknown — provider metadata or a documented map is unavailable"
        >
          <Box size={13} role="img" aria-label="Capability unknown" />
          {!compact && <span>Unknown</span>}
        </span>
      )}
      {model?.pricingStatus === "free" && (
        <span
          className="free-badge"
          title="OpenRouter-reported zero pricing or documented :free variant at last discovery. Quotas and rate limits still apply."
        >
          FREE
        </span>
      )}
    </span>
  );
}
function CatalogRows({ models, selected, onSelect }) {
  const [query, setQuery] = React.useState("");
  const found = models.filter((m) =>
    (m.id + " " + m.name).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="catalog-browser">
      <label className="catalog-search">
        Search discovered models
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Model name or ID"
        />
      </label>
      <div className="catalog-results" aria-label="Model discovery results">
        {found.map((m) => (
          <button
            className={"catalog-row " + (selected === m.id ? "selected" : "")}
            type="button"
            key={m.id}
            onClick={() => onSelect(m.id)}
          >
            <span className="catalog-name">
              {m.name || m.id}
              <small>{m.id}</small>
            </span>
            <CapabilityBadges model={m} compact />
            <span className="pricing-label">
              {m.pricingStatus === "free"
                ? "Zero-priced"
                : m.pricingStatus === "paid"
                  ? "Paid"
                  : "Pricing unknown"}
            </span>
          </button>
        ))}
        {!found.length && (
          <p className="catalog-empty">
            No matching models. Change the filter, refresh, or enter a model ID
            manually.
          </p>
        )}
      </div>
    </div>
  );
}
const roots = new Map();
export function clearModelViews() {
  for (const root of roots.values()) root.unmount();
  roots.clear();
}
function mount(host, node) {
  if (!host) return;
  let root = roots.get(host);
  if (!root) {
    root = createRoot(host);
    roots.set(host, root);
  }
  root.render(node);
}
export function renderCatalog(host, props) {
  mount(host, <CatalogRows {...props} />);
}
export function renderCapabilities(host, model) {
  mount(host, <CapabilityBadges model={model} />);
}
