import type { Config } from 'tailwindcss'
import typographyPlugin from '@tailwindcss/typography'

const config: Config = {
  content: [`./src/**/*.{js,cjs,mjs,ts,cts,mts,jsx,tsx}`],
  theme: {
    fontFamily: {
      sans: [`Open Sans`, `sans-serif`],
    },
  },
  plugins: [typographyPlugin],
}

export default config
