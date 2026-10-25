# Model pricing and capability adapters

Implementation: `src/models/metadata.js`. Reviewed 2026-10-25. Rules are deliberately conservative; this is not a universal model registry or a promise of current availability.

## Provider support

| Provider | Reliable free-only filtering | Capability detection |
| --- | --- | --- |
| OpenRouter | Yes, from the configured provider's `/models` response: `pricing.prompt` and `pricing.completion` must both be valid, non-negative numeric zero. Any additional advertised nonzero cost prevents a FREE label; malformed additional pricing is unknown. | `architecture.input_modalities`, `output_modalities` (or the older directional `modality` string); documented reasoning parameters in `supported_parameters`. A small exact-ID fallback covers GPT-4o mini and DeepSeek Coder when modality metadata is missing. |
| Google Gemini | No. The supported Models API response does not supply reliable per-account/free-tier pricing. | `supportedGenerationMethods` identifies embedding methods. Known exact Gemini IDs have documented input/output capability mappings. `generateContent` alone does **not** prove text, image, or audio modalities. |
| OpenAI | No. `/models` does not provide pricing/free-tier entitlements. | Explicit documented IDs only: selected GPT-4o/4.1/o3 models, embedding models, image models, Whisper and TTS. Unknown versions, aliases and model names are not guessed. |
| Anthropic Claude | No reliable pricing metadata in the supported model-list adapter. | A limited exact-ID map (Claude 3.5 Haiku alias and the listed Claude Sonnet 4 snapshot). Other IDs are neutral until metadata/map support is added. |
| DeepSeek | No reliable pricing metadata in the supported model-list adapter. | Exact `deepseek-chat`, `deepseek-reasoner`, `deepseek-coder` mappings. Reasoning and code specialization are separate from generic chat. |
| Groq | No reliable pricing/free-tier entitlement metadata in the supported model-list adapter. | Exact Llama 3.3 70B Versatile and Whisper v3/v3-turbo mappings. A free developer account or trial is **not** evidence of a free model. |
| NVIDIA NIM | Unsupported; pricing unknown. | Neutral unknown icon: no capability schema is assumed from an OpenAI-compatible model list. |
| OmniRoute | Unsupported; upstream/router pricing and account entitlements unknown. | Neutral unknown icon. Router aliases are not automatically mapped to upstream capabilities. |
| Custom compatible endpoints | Unsupported; arbitrary `free` or `pricing` fields are not interpreted as an official pricing contract. | Neutral unknown icon; an explicitly maintained adapter is required before interpreting vendor-specific fields. |

## Semantics

- FREE means **provider-reported zero pricing at the last discovery**, not unlimited access, successful authorization, or a guarantee about future prices. Rate limits, quotas, region/account restrictions and other provider terms can apply. Refresh to recheck.
- Never infer free status from `:free`, a model's name, open-source licensing, a trial, or a developer tier. Missing token prices, null, booleans, negative/dynamic prices, malformed numeric strings and infinity are unknown. Positive decimal strings that underflow a JavaScript number are still positive, not free.
- Input image produces **vision**, not **image generation**. Input audio and output audio are distinct. Video tooltips specify input/output when known. Embeddings are not chat. Whisper transcription is labeled audio input rather than a generic chat model.
- OpenRouter's explicit output modalities determine output capability icons. `reasoning`/`reasoning_effort`/`include_reasoning` parameters indicate reasoning support, not a claim about private chain-of-thought access or model quality.
- Multi-modal means more than one recognized text/image/audio/video modality across the documented inputs/outputs. Fallback maps are exact IDs, not substring or prefix guesses.
- No new generation API workflow is added. This workspace still sends **text chat**. Known embedding-only/image-only/audio-only/video-only models can be discovered and saved, but are blocked from being sent to a text-chat endpoint. Unknown models remain manually usable. Capability badges describe the model, not a promise that ModelDeck implements all its modalities.

## Storage and filtering

`freeModelsOnly` is stored **per saved connection**, including when configuring a new key before its automatic discovery. API-key testing is never filtered: it tests endpoint access independently of a zero-match free filter.

`modelCatalog` caches the last normalized model-list response so changing the checkbox can update the discovery view without a network call. `availableModels` is the imported/saved selection list. A refresh only adds eligible catalog entries, updates metadata for existing IDs, and deduplicates by exact ID. Saved models with unknown/paid pricing and manual IDs are **not deleted** when the filter changes. They remain in the saved-model dropdown. Disabling the checkbox shows the full cached response; Refresh imports it, and explicitly choosing a cached result also saves it.

The latest metadata takes precedence over older metadata for the same ID. Duplicate IDs with conflicting free status become unknown; conflicting capabilities are intersected rather than exaggerated. Older `{id, name}` records migrate to unknown pricing plus an exact-ID capability fallback where available. Changed provider/endpoint/credentials invalidate the old catalog as well as the old model cache. As before, settings save API keys locally without encryption; no keys enter the metadata adapter, icons, or dashboard bridge.

## Presentation and maintenance

- `ModelCapabilities.jsx`: shared Lucide icon/badge rendering, discovery rows, and lifecycle-managed roots for the existing settings controller.
- `ModelPicker.jsx`: searchable, keyboard-navigable saved-model dropdown. Native discovery select options retain readable capability labels; the adjacent discovery rows show the full SVG icons and FREE badges.
- Badges appear in the gallery, selected model details, chat header, saved-model picker, discovery list, manual-model preview, and connection model preview.
- Metadata has a version and provider ID. Persist only normalized fields, not arbitrary provider response objects.
- Add a provider schema only with an official source and tests. Add aliases/snapshots to the exact-ID map individually after verifying their documentation. Do not derive a code/reasoning/image capability from a suggestive model name. Pricing is never hardcoded into this map.

## Reference documentation

These are the provider documentation entry points for reviewing adapter rules and exact-ID additions; quotas and product catalogs can change independently of this application.

- OpenRouter model metadata: https://openrouter.ai/docs/guides/overview/models
- OpenRouter API reference: https://openrouter.ai/docs/api-reference/overview
- OpenRouter model variants/free: https://openrouter.ai/docs/guides/routing/model-variants/free
- OpenAI models and individual modality specifications: https://platform.openai.com/docs/models
- Gemini Models API (`supportedGenerationMethods`): https://ai.google.dev/api/models
- Gemini model input/output specifications: https://ai.google.dev/gemini-api/docs/models
- Anthropic model overview: https://docs.anthropic.com/en/docs/about-claude/models/overview
- DeepSeek model documentation: https://api-docs.deepseek.com/
- Groq supported models: https://console.groq.com/docs/models

No live model request or real API credential is needed for unit/UI tests; tests intercept provider calls with explicit fixtures. Live provider account entitlements are not tested or asserted.
