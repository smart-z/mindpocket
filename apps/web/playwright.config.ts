import { defineConfig, devices } from "@playwright/test"

const port = Number(process.env.PORT || "3100")
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm --filter web exec next dev --port ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: "test",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || baseURL,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || baseURL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "test-secret-for-playwright",
      DATABASE_URL:
        process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/mindpocket",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
