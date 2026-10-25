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
- Theme customization: Light, Dark, System, and seven accent themes (Apple Blue, Midnight, Emerald, Violet, Rose, Amber, Ocean).
- Responsive interface for desktop and mobile.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

## Security

This is a browser-based prototype. Browser local storage is not encrypted, and API keys can be exposed to scripts running in the page. Requests go directly to configured providers, whose terms, quotas, billing, and privacy policies apply. Do not put personal API keys in source code. A public multi-user production service should use a secure backend with authentication, rate limiting, and a carefully designed secret-management system.

Some providers may block direct browser requests because of CORS restrictions. Always verify provider requests with your own API keys.
