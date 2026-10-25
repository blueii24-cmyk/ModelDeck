# ModelDeck

**One workspace. Any model.**

ModelDeck is a browser-first multi-provider AI chat workspace. Bring your own provider API keys, choose a model, and chat in one place.

## Live website

After the GitHub Pages workflow completes, visit:  
**https://blueii24-cmyk.github.io/ModelDeck/**

The deployment workflow runs on every push to `main` and can also be started manually from the **Actions** tab.

## Features

- Multiple provider connections: OpenRouter, OpenAI, Google Gemini, Anthropic Claude, Groq, DeepSeek, NVIDIA NIM, OmniRoute, and compatible custom endpoints.
- Model discovery and manual model IDs.
- Unified chat with saved conversations and model switching.
- Named API-key profiles persisted in this browser (unencrypted).
- Theme customization: Light, Dark, System, and seven accent themes (Amber, Midnight, Emerald, Violet, Rose, Ochre, Ocean).
- Responsive interface for desktop and mobile.

## Run locally

Requires Node.js 22.12+ (Vite 8).

```bash
npm install
npm run dev
```

## Security

This is a browser-based prototype. Browser local storage is not encrypted, and API keys can be exposed to scripts running in the page. Requests go directly to configured providers, whose terms, quotas, billing, and privacy policies apply. Do not put personal API keys in source code. A public multi-user production service should use a secure backend with authentication, rate limiting, and a carefully designed secret-management system.

Some providers may block direct browser requests because of CORS restrictions. Always verify provider requests with your own API keys.

## Frontend

The React + Vite dashboard uses a dark charcoal/amber palette, original pixel avatars, a horizontal provider gallery, and a responsive chat-and-connections workspace. New users default to dark mode; existing appearance preferences are preserved. Fonts are bundled locally (no font CDN).

- `src/main.jsx`: React shell, prompt cards, and quick-start help.
- `src/Dashboard.jsx`: provider gallery, original pixel avatars, sanitized connection state, profile controls, and collapsible sidebar.
- `src/dashboard.css`: cohesive dashboard theme and responsive panel layout.
- `src/workspace.js`: existing chat/provider controller and storage compatibility; initialized once after the shell mounts. Controller-owned history, messages, and settings are isolated from React-updated components.
- `src/legacy.css`: shared workspace and settings foundations.
- `src/style.css`: retro theme, layout, and responsive overrides.

Build with `npm run build`, then serve `dist` using `npm run preview`.

## UI tests

```bash
npx playwright install --with-deps chromium
npm test
```

Tests cover prompts, settings, appearance, saved history, mobile navigation, layout overflow, and a mocked provider response. Live provider calls require your own credentials and are not exercised by the tests. Set `CHROMIUM_PATH` to use an existing Chromium executable.

## Built-in website preview

Choose **Build something**, or ask a model for a self-contained website in an `html` code fence. Completed HTML replies get a **Preview website** button. Separate CSS and JavaScript fences in the same reply are combined with the first HTML block. Full raw HTML documents also work; JSX/React source and build-tool projects are not compiled by this feature.

The preview includes Preview/Code views, a temporary editable HTML buffer, **Run edits**, reload, desktop/mobile widths, and HTML download. Changing conversations closes the preview. Edits do not overwrite the original response or persist across closing/reloading; download them to keep them.

Generated code runs only after opening the preview, in an iframe with `sandbox="allow-scripts"` and without same-origin access. A restrictive CSP blocks fetches, external scripts/styles/images, nested frames, and form submissions. Inline JavaScript works; the preview cannot read ModelDeck's local storage. This is not a general-purpose hostile-code runtime: generated scripts can still consume browser resources. Inspect untrusted code before running it. Downloaded HTML runs outside this sandbox when opened separately.

## Motion and request status

The interface uses subtle mascot motion, staggered prompt-card arrivals, message transitions, and animated panel entrances. Pending chat requests display an interactive pixel workshop and five-stage quest with the requested model's name, plus composer feedback. This indicates that a request is pending; it does not expose model reasoning or simulate token progress. The indicator clears on success, error, or timeout, and interrupted requests are marked as errors on reload. Switching conversations keeps the pending card with its original chat.

Unchanged message elements are retained to avoid replaying animations and live-region announcements. Completion does not auto-scroll readers away from earlier replies. System **Reduce motion** preferences disable animations and smooth scrolling while preserving readable status text.

## Provider dashboard and connection checks

- Gallery cards show each provider's selected/suggested model ID, not invented availability. Unconfigured provider IDs are explicitly marked as suggestions. Available models come from the selected saved connection's endpoint.
- Multiple profiles for the same provider are isolated. A late discovery result cannot activate another profile, overwrite its models, or silently change a manually selected model. Editing a provider, key, or endpoint invalidates its old model cache.
- **Not configured / Not tested** are not connection successes. **Models loaded** only means the listing endpoint responded; it does not prove chat access. **Verified** follows a successful chat or explicit chat probe. Test/discovery failures are shown separately. Verification state is session-local and resets on reload or changed credentials.
- **Test API key** first attempts model discovery. Optional small chat fallback requires explicit consent and a model ID, because provider charges may apply. Unsupported discovery can always be bypassed with a manually entered model ID.
- Request errors redact the actual credential (including URL-encoded forms) before display or chat-history storage. Keys remain masked in the form and are excluded from the React dashboard state bridge. Browser devtools still necessarily expose direct provider request credentials to the device owner; this is not a server-side secret vault.
- Mobile conversations hide the gallery to prioritize chat; **Model playground** reopens it. Connection/model details are collapsible sections. All navigation is in-page, with relative bundled assets for GitHub Pages subpath deployment.

The test suite uses intercepted provider responses, including multiple profiles, Gemini discovery/authentication, Anthropic fallback, credential redaction, and all provider chat formats. It does not claim live provider connectivity or billing validation.

## Free-only imports and model capability icons

In **Models & discovery** (or connection configuration before saving), enable **Free models only** to import models with verified zero pricing. The preference is saved per connection. Toggle it off to show the complete cached catalog; **Refresh models** imports matching entries. Saved and manually entered models stay available regardless of the filter.

**OpenRouter currently supports reliable free filtering** using actual prompt/completion pricing, with conservative checks for additional costs. All other supported providers display “Free status unavailable for this provider”; a trial or free tier is not treated as pricing evidence. Zero-priced models may still have quotas and rate limits.

The searchable model dropdown, discovery rows, provider cards, active chat model, and connection settings share Lucide capability icons and FREE badges. Input/output modalities are distinguished, multiple capabilities can be shown, and unknown models use a neutral icon. Non-text generation workflows are not implemented merely because their models appear in discovery.

See [adapter support, exact-ID fallbacks, pricing rules and limitations](docs/model-metadata.md). Tests cover reversible filtering, saved-model preservation, persistence, malformed pricing, duplicates, directional modalities, unknown capabilities, keyboard selection and mobile layouts, alongside the existing provider/chat/preview regression suite.

## Pixel workshop and request quests

A compact original SVG workshop now replaces the simple thinking dots. A terminal worker, parcel conveyor, server lamps, and a reply desk respond to **frontend lifecycle events**, not remote private thoughts. The five checkpoints are tappable; expand the quest log for descriptions or tap the worker for its current local task. Each pending message stores its own stage, reached checkpoints, provider/model labels, and collapsed-log preference.

- **Preparing:** the local conversation context and provider payload are being built.
- **Sending:** the browser's fetch function is being invoked. This is not proof that a remote server has accepted the request.
- **Waiting:** the fetch promise is pending; response headers have not arrived.
- **Receiving:** response headers arrived; the body is being read and checked. This includes error bodies and does not imply success.
- **Finishing / complete:** a nonempty provider answer has been validated and is passed to the renderer.
- **Stopped:** HTTP/network errors, invalid/empty replies, timeouts, and interrupted requests on reload show a paused error scene and the existing actionable error message. Later checkpoints are not marked complete.

Fast synchronous stages may pass between browser paints. There are **no minimum stage durations, fake percentages, token streaming, or added request delays**. The answer appears immediately; a short decorative document-delivery/“QUEST COMPLETE” flourish accompanies it rather than holding it back. Background completion does not replay that flourish when another chat is opened. Reduced-motion users see static artwork and the same readable statuses.

Artwork and animation are local (`src/thinking/quest.js`, `src/thinking/quest.css`), with no new packages or asset requests. CSS handles decorative loops; there are no animation intervals or request-progress polling. Stage updates patch the existing message card without replacing completed messages or rebuilding the dashboard. A persistent polite screen-reader status announces each milestone, while decorative art and the expanded log are excluded from automatic live announcements. Existing text-chat provider formats, credential handling, model imports, capability icons and website previews are unchanged.

Progress remains limited by the non-streaming provider request flow: a server/proxy may send headers before the actual answer, so the **Receiving** phase can last while the body is still downloading. No remote token progress or reasoning is inferred. Tests use controllable fetch promises/response bodies and fake clocks, not paid provider requests.
