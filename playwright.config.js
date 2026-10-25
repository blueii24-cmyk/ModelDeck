import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage'] } : {},
    viewport: { width: 1440, height: 900 }
  },
  webServer: { command: 'npm run dev', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI }
});
