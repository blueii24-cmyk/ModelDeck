/** Provider adapters: no UI, credentials, network calls, or name heuristics.
 * Sources and exact-ID fallback scope are documented in docs/model-metadata.md.
 */
export const CAPABILITIES = {
  text: "Text / chat",
  imageOutput: "Image generation",
  vision: "Image understanding / vision",
  audioInput: "Audio input",
  audioOutput: "Audio output / text-to-speech",
  video: "Video",
  embeddings: "Embeddings",
  code: "Code specialized",
  reasoning: "Reasoning",
  multimodal: "Multimodal",
};
const exact = {
  openai: {
    "gpt-4o": ["text", "vision", "multimodal"],
    "gpt-4o-mini": ["text", "vision", "multimodal"],
    "gpt-4.1": ["text", "vision", "multimodal"],
    "gpt-4.1-mini": ["text", "vision", "multimodal"],
    o3: ["text", "vision", "reasoning", "multimodal"],
    "o3-mini": ["text", "reasoning"],
    "text-embedding-3-small": ["embeddings"],
    "text-embedding-3-large": ["embeddings"],
    "text-embedding-ada-002": ["embeddings"],
    "dall-e-3": ["imageOutput"],
    "gpt-image-1": ["vision", "imageOutput", "multimodal"],
    "whisper-1": ["audioInput"],
    "tts-1": ["audioOutput"],
    "tts-1-hd": ["audioOutput"],
  },
  gemini: {
    "gemini-2.0-flash": ["text", "vision", "audioInput", "video", "multimodal"],
    "gemini-2.5-flash": [
      "text",
      "vision",
      "audioInput",
      "video",
      "reasoning",
      "multimodal",
    ],
    "gemini-2.5-pro": [
      "text",
      "vision",
      "audioInput",
      "video",
      "reasoning",
      "multimodal",
    ],
    "gemini-embedding-001": ["embeddings"],
    "text-embedding-004": ["embeddings"],
  },
  anthropic: {
    "claude-3-5-haiku-latest": ["text", "vision", "multimodal"],
    "claude-sonnet-4-20250514": ["text", "vision", "reasoning", "multimodal"],
  },
  deepseek: {
    "deepseek-chat": ["text"],
    "deepseek-reasoner": ["text", "reasoning"],
    "deepseek-coder": ["text", "code"],
  },
  groq: {
    "llama-3.3-70b-versatile": ["text"],
    "whisper-large-v3": ["audioInput"],
    "whisper-large-v3-turbo": ["audioInput"],
  },
};
const unique = (values) => [...new Set(values)];
const modalities = (value) =>
  Array.isArray(value)
    ? value.filter((x) => typeof x === "string").map((x) => x.toLowerCase())
    : [];
function costs(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (
    typeof value === "string" &&
    !/^[+]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value.trim())
  )
    return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  // Tiny positive decimal strings must not underflow into a false zero price.
  if (
    n === 0 &&
    typeof value === "string" &&
    /[1-9]/.test(value.trim().split(/[eE]/)[0])
  )
    return Number.MIN_VALUE;
  return n;
}
export function pricingFor(provider, raw = {}) {
  // Only OpenRouter exposes dependable pricing semantics in the supported
  // catalogue. Its documented :free variant is also a trustworthy free signal.
  if (provider !== "openrouter") return "unknown";
  const id = [raw.id, raw.canonical_slug, raw.slug].find(
    (value) => typeof value === "string",
  ) || "";
  const freeVariant = id === "openrouter/free" || /:free$/i.test(id);
  const pricing = raw.pricing;

  // If the provider explicitly advertises any positive price, do not call the
  // model free even if its slug happens to end in :free.
  if (pricing && typeof pricing === "object" && !Array.isArray(pricing)) {
    for (const value of Object.values(pricing)) {
      const n = costs(value);
      if (n !== null && n > 0) return "paid";
    }
  }
  // OpenRouter's documented :free variant and free router remain identifiable
  // even when the endpoint omits some or all pricing fields.
  if (freeVariant) return "free";
  if (!pricing || typeof pricing !== "object" || Array.isArray(pricing))
    return "unknown";
  const input = costs(pricing.prompt),
    output = costs(pricing.completion);
  if (input === null || output === null) return "unknown";

  // Unknown/invalid additional prices remain unknown; explicit nonzero values
  // were handled above. This avoids labelling partially priced models as free.
  for (const [key, value] of Object.entries(pricing)) {
    if (key === "prompt" || key === "completion") continue;
    const n = costs(value);
    if (n === null) return "unknown";
  }
  return "free";
}
export function capabilitiesFor(provider, raw = {}) {
  const id =
    typeof raw.id === "string"
      ? raw.id
      : typeof raw.name === "string"
        ? raw.name.replace(/^models\//, "")
        : "";
  let caps = [],
    source = "unknown",
    videoDirection;
  if (provider === "openrouter") {
    const architecture = raw.architecture;
    // Older official OpenRouter responses encode the same directions as text+image->text.
    const legacy =
      typeof architecture?.modality === "string"
        ? architecture.modality.match(
            /^([a-z]+(?:\+[a-z]+)*)->([a-z]+(?:\+[a-z]+)*)$/i,
          )
        : null;
    const input = Array.isArray(architecture?.input_modalities)
      ? modalities(architecture.input_modalities)
      : modalities(legacy?.[1].split("+"));
    const output = Array.isArray(architecture?.output_modalities)
      ? modalities(architecture.output_modalities)
      : modalities(legacy?.[2].split("+"));
    if (input.length || output.length) {
      source = "provider metadata";
      if (output.includes("text")) caps.push("text");
      if (input.includes("image")) caps.push("vision");
      if (output.includes("image")) caps.push("imageOutput");
      if (input.includes("audio")) caps.push("audioInput");
      if (output.includes("audio")) caps.push("audioOutput");
      if (input.includes("video") || output.includes("video")) {
        caps.push("video");
        videoDirection = input.includes("video")
          ? output.includes("video")
            ? "input and output"
            : "input"
          : "output";
      }
      if (output.includes("embeddings") || output.includes("embedding"))
        caps.push("embeddings");
      if (
        unique(
          [...input, ...output].filter((m) =>
            ["text", "image", "audio", "video"].includes(m),
          ),
        ).length > 1
      )
        caps.push("multimodal");
    }
    if (
      Array.isArray(raw.supported_parameters) &&
      raw.supported_parameters.some((p) =>
        ["reasoning", "reasoning_effort", "include_reasoning"].includes(p),
      )
    ) {
      caps.push("reasoning");
      source = "provider metadata";
    }
  }
  if (provider === "gemini" && Array.isArray(raw.supportedGenerationMethods)) {
    if (
      raw.supportedGenerationMethods.some((m) =>
        ["embedContent", "batchEmbedContents", "embedText"].includes(m),
      )
    ) {
      caps.push("embeddings");
      source = "provider metadata";
    }
    // generateContent does not specify input/output modalities. Do not guess them.
  }
  if (!caps.length && exact[provider]?.[id]) {
    caps = exact[provider][id];
    source = "documented exact-ID map";
  }
  // OpenRouter namespaces aren't evidence by themselves: only a small exact map supplements missing metadata.
  if (!caps.length && provider === "openrouter") {
    const fallback = {
      "openai/gpt-4o-mini": exact.openai["gpt-4o-mini"],
      "deepseek/deepseek-coder": ["text", "code"],
    };
    if (fallback[id]) {
      caps = fallback[id];
      source = "documented exact-ID map";
    }
  }
  if (
    provider === "gemini" &&
    source === "documented exact-ID map" &&
    caps.includes("video")
  )
    videoDirection = "input";
  return {
    capabilities: unique(caps),
    capabilitySource: source,
    videoDirection,
  };
}
export function normalizeModel(provider, raw) {
  if (!raw || typeof raw !== "object") return null;
  const value = raw.id ?? raw.name ?? raw.model;
  if (typeof value !== "string" || !value.trim()) return null;
  const id =
    provider === "gemini"
      ? value.trim().replace(/^models\//, "")
      : value.trim();
  const name =
    typeof raw.displayName === "string"
      ? raw.displayName
      : typeof raw.name === "string"
        ? raw.name.replace(/^models\//, "")
        : id;
  return {
    id,
    name,
    provider,
    metadataVersion: 1,
    pricingStatus: pricingFor(provider, raw),
    ...capabilitiesFor(provider, { ...raw, id }),
  };
}
export function extractModelCatalog(data, provider) {
  const array =
    provider === "gemini"
      ? data?.models
      : (data?.data ?? data?.models ?? data?.items);
  const models = new Map();
  if (Array.isArray(array))
    for (const raw of array) {
      const model = normalizeModel(provider, raw);
      if (!model) continue;
      // Conflicting duplicate metadata is not evidence of free status/capabilities.
      const previous = models.get(model.id);
      if (previous) {
        if (previous.pricingStatus !== model.pricingStatus)
          model.pricingStatus = "unknown";
        model.capabilities = previous.capabilities.filter((c) =>
          model.capabilities.includes(c),
        );
      }
      models.set(model.id, model);
    }
  return [...models.values()];
}
export function describeModel(provider, value) {
  const model = typeof value === "string" ? { id: value } : value || { id: "" };
  if (model.metadataVersion === 1 && model.provider === provider) {
    return {
      id: model.id,
      name: model.name || model.id,
      provider,
      metadataVersion: 1,
      videoDirection: ["input", "output", "input and output"].includes(
        model.videoDirection,
      )
        ? model.videoDirection
        : undefined,
      pricingStatus:
        provider === "openrouter" &&
        ["free", "paid"].includes(model.pricingStatus)
          ? model.pricingStatus
          : "unknown",
      capabilities: Array.isArray(model.capabilities)
        ? unique(
            model.capabilities.filter((c) => Object.hasOwn(CAPABILITIES, c)),
          )
        : [],
      capabilitySource: [
        "provider metadata",
        "documented exact-ID map",
      ].includes(model.capabilitySource)
        ? model.capabilitySource
        : "unknown",
    };
  }
  return (
    normalizeModel(provider, model) || {
      id: "",
      name: "",
      capabilities: [],
      pricingStatus: "unknown",
      capabilitySource: "unknown",
    }
  );
}
export const visibleCatalog = (connection) =>
  (connection.modelCatalog ?? connection.availableModels ?? [])
    .map((m) => describeModel(connection.provider, m))
    .filter((m) => !connection.freeModelsOnly || m.pricingStatus === "free");
export function reconcileImports(connection, catalog) {
  const all = new Map(catalog.map((m) => [m.id, m]));
  const saved = new Map(
    (connection.availableModels || []).map((m) => {
      const previous = describeModel(connection.provider, m);
      return [previous.id, all.get(previous.id) || previous];
    }),
  );
  for (const model of catalog)
    if (!connection.freeModelsOnly || model.pricingStatus === "free")
      saved.set(model.id, model);
  return [...saved.values()].filter((m) => m.id);
}
export function pricingNotice(connection) {
  if (connection.provider !== "openrouter")
    return "Free status unavailable for this provider. No reliable pricing metadata is exposed by its supported model-list API. Saved and manual models are kept.";
  if (!connection.modelCatalog)
    return "Refresh models to check provider pricing. Saved and manual models are kept.";
  const count = connection.modelCatalog.filter(
    (m) => m.pricingStatus === "free",
  ).length;
  return `${count} confirmed free model${count === 1 ? "" : "s"} in the latest response (zero-price metadata or an OpenRouter :free variant). ${connection.freeModelsOnly ? "Paid and unknown-price models are excluded from discovery results, not deleted from saved models. " : ""}Quotas, rate limits, and provider restrictions still apply. Refresh to recheck current pricing.`;
}
