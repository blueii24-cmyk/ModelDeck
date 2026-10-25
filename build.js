// Compatibility for callers that previously ran `node build.js` directly.
import { build } from 'vite';
await build();
