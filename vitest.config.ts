import { defineConfig } from 'vitest/config'

// Without this file, Vitest loads `vite.config.ts`, whose React Router plugin
// rejects test runs
export default defineConfig({})
