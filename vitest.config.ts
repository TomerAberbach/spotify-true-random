import { playwright } from '@vitest/browser-playwright'
import svgr from 'vite-plugin-svgr'
import { defineConfig } from 'vitest/config'

const BROWSER_TEST_FILES = `app/**/*.browser.test.{ts,tsx}`

// Without this file, Vitest loads `vite.config.ts`, whose React Router plugin
// rejects test runs
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    mockReset: true,
    projects: [
      {
        extends: true,
        test: {
          name: `node`,
          include: [`app/**/*.test.{ts,tsx}`],
          exclude: [BROWSER_TEST_FILES],
        },
      },
      {
        extends: true,
        plugins: [svgr()],
        test: {
          name: `browser`,
          include: [BROWSER_TEST_FILES],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            screenshotFailures: false,
            instances: [{ browser: `chromium` }],
          },
        },
      },
    ],
  },
})
