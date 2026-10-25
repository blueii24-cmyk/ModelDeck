# ModelDeck

**One workspace. Any model.**

ModelDeck is a browser-first multi-provider AI chat workspace. Bring your own provider API keys, choose a model, and chat in one place.

## Live website

After the GitHub Pages workflow completes, visit:  
**https://blueii24-cmyk.github.io/ModelDeck/**

The deployment workflow runs on every push to `main` and can also be started manually from the **Actions** tab.

## Features

- Multiple provider connections: OpenRouter, OpenAI, Google Gemini, Anthropic Claude, Groq, DeepSeek, Together AI, and compatible custom endpoints.
- Model discovery and manual model IDs.
- Unified chat with saved conversations and model switching.
- Session-only or browser-persisted API keys.
- Theme customization: Light, Dark, System, and seven accent themes (Terracotta, Midnight, Emerald, Violet, Rose, Amber, Ocean).
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

The React + Vite interface pairs pixel typography and an original handheld-inspired mascot with a minimal, responsive workspace. Fonts are bundled locally (no font CDN).

- `src/main.jsx`: React shell, prompt cards, and quick-start help.
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
