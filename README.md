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

The interface uses subtle mascot motion, staggered prompt-card arrivals, message transitions, and animated panel entrances. Pending chat requests display a pixel-dot **Thinking** card with the requested model's name, plus composer feedback. This indicates that a request is pending; it does not expose model reasoning or simulate token progress. The indicator clears on success, error, or timeout, and interrupted requests are marked as errors on reload. Switching conversations keeps the pending card with its original chat.

Unchanged message elements are retained to avoid replaying animations and live-region announcements. Completion does not auto-scroll readers away from earlier replies. System **Reduce motion** preferences disable animations and smooth scrolling while preserving readable status text.

## Provider dashboard and connection checks

- Gallery cards show each provider's selected/suggested model ID, not invented availability. Unconfigured provider IDs are explicitly marked as suggestions. Available models come from the selected saved connection's endpoint.
- Multiple profiles for the same provider are isolated. A late discovery result cannot activate another profile, overwrite its models, or silently change a manually selected model. Editing a provider, key, or endpoint invalidates its old model cache.
- **Not configured / Not tested** are not connection successes. **Models loaded** only means the listing endpoint responded; it does not prove chat access. **Verified** follows a successful chat or explicit chat probe. Test/discovery failures are shown separately. Verification state is session-local and resets on reload or changed credentials.
- **Test API key** first attempts model discovery. Optional small chat fallback requires explicit consent and a model ID, because provider charges may apply. Unsupported discovery can always be bypassed with a manually entered model ID.
- Request errors redact the actual credential (including URL-encoded forms) before display or chat-history storage. Keys remain masked in the form and are excluded from the React dashboard state bridge. Browser devtools still necessarily expose direct provider request credentials to the device owner; this is not a server-side secret vault.
- Mobile conversations hide the gallery to prioritize chat; **Model playground** reopens it. Connection/model details are collapsible sections. All navigation is in-page, with relative bundled assets for GitHub Pages subpath deployment.

The test suite uses intercepted provider responses, including multiple profiles, Gemini discovery/authentication, Anthropic fallback, credential redaction, and all provider chat formats. It does not claim live provider connectivity or billing validation.
