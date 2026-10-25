import { defineConfig } from 'vite';
export default defineConfig({ base: './', server: { allowedHosts: ['.e2b.app'] }, preview: { allowedHosts: ['.e2b.app'] } });
