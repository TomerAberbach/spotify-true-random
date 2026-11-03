import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    svgr(),
    tailwindcss(),
    reactRouter(),
    visualizer({ emitFile: true }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
