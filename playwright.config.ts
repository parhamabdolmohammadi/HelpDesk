import { defineConfig, devices } from '@playwright/test'

const CLIENT_URL = 'http://localhost:5174'
const SERVER_URL = 'http://localhost:4100'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: CLIENT_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      name: 'server',
      command: 'bun --env-file=.env.test run src/index.ts',
      cwd: './server',
      url: `${SERVER_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      name: 'client',
      command: 'bun run vite --port 5174 --strictPort',
      cwd: './client',
      url: CLIENT_URL,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_SERVER_URL: SERVER_URL,
      },
    },
  ],
})
