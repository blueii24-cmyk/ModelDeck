import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { useDeck, dashboardAction } from "../Dashboard";
import { CapabilityBadges } from "./ModelCapabilities";
export function ActiveModelCapabilities() {
  const data = useDeck();
  return <CapabilityBadges model={data?.selected.metadata} compact />;
}
export default function ModelPicker({ placement = "header" }) {
  const data = useDeck(),
    [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const root = useRef(null),
    trigger = useRef(null),
    search = useRef(null);
  const models = (data?.selected.models || []).filter((m) =>
    (m.id + " " + m.name).toLowerCase().includes(query.toLowerCase()),
  );
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className={"rich-model-picker " + (placement === "composer" ? "composer-model-picker" : "header-model-picker")}
      ref={root}
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close();
        }
        if (
          open &&
          ["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) &&
          !(e.target === search.current && ["Home", "End"].includes(e.key))
        ) {
          e.preventDefault();
          const options = [...root.current.querySelectorAll("[role=option]")];
          const i = options.indexOf(document.activeElement);
          const next =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? options.length - 1
                : e.key === "ArrowDown"
                  ? (i + 1) % options.length
                  : i < 0
                    ? options.length - 1
                    : (i - 1 + options.length) % options.length;
          options[next]?.focus();
        }
      }}
    >
      <select
        id="model"
        className="controller-model-select"
        aria-label="Model selection controller"
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        ref={trigger}
        className="model-picker-trigger"
        type="button"
        aria-label="Switch model"
        aria-describedby="activeModelName"
        title={data?.selected.model || "Choose a model"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? "richModelOptions" : undefined}
        onClick={() => {
          setQuery("");
          setOpen(!open);
        }}
      >
        <CapabilityBadges model={data?.selected.metadata} compact />
        <span id="activeModelName" className="active-model-name">
          {data?.selected.model || "Choose a model"}
        </span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className={"model-picker-popup" + (placement === "composer" ? " model-picker-popup-above" : "")}>
          <label className="catalog-search">
            Search saved models
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Model name or ID"
            />
          </label>
          <div role="listbox" id="richModelOptions" aria-label="Saved models">
            {models.map((m) => (
              <button
                role="option"
                type="button"
                aria-selected={m.id === data.selected.model}
                disabled={data.busy}
                key={m.id}
                onClick={() => {
                  dashboardAction("pick-model", { id: m.id });
                  close();
                }}
              >
                <span>
                  {m.name || m.id}
                  <small>{m.id}</small>
                </span>
                <CapabilityBadges model={m} compact />
              </button>
            ))}
            {!models.length && (
              <p className="catalog-empty">No matching saved models.</p>
            )}
          </div>
          <button
            className="picker-manage"
            onClick={() => {
              setOpen(false);
              dashboardAction("models");
            }}
          >
            <Settings2 size={14} /> Import / refresh models
          </button>
        </div>
      )}
    </div>
  );
}
