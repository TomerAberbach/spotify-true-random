import tomer from '@tomer/eslint-config'

export default [
  ...tomer,
  {
    rules: {
      '@typescript-eslint/no-misused-promises': `off`,
    },
  },
  {
    // Vitest browser tests query through `page` locators
    files: [`**/*.browser.test.{ts,tsx}`],
    rules: {
      'testing-library/prefer-screen-queries': `off`,
    },
  },
  {
    // React Router reads the route config at build time
    files: [`app/routes.ts`],
    rules: {
      'import/no-extraneous-dependencies': [`error`, { devDependencies: true }],
    },
  },
]
