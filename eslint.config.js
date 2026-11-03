import tomer from '@tomer/eslint-config'

export default [
  ...tomer,
  {
    rules: {
      '@typescript-eslint/no-misused-promises': `off`,
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
