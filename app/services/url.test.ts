import { afterEach, expect, test, vi } from 'vitest'

const importUrlWithSiteUrlEnv = async (siteUrl: string | undefined) => {
  vi.resetModules()
  vi.stubEnv(`SITE_URL`, siteUrl)
  return import(`./url.ts`)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

test.each([
  { env: undefined, siteUrl: `http://localhost:3000` },
  { env: `https://example.com`, siteUrl: `https://example.com` },
  { env: `https://example.com/`, siteUrl: `https://example.com` },
  { env: `https://example.com/some/path`, siteUrl: `https://example.com` },
])(
  `SITE_URL is $siteUrl when the env var is $env`,
  async ({ env, siteUrl }) => {
    const url = await importUrlWithSiteUrlEnv(env)

    expect(url.SITE_URL).toBe(siteUrl)
  },
)

test.each([
  { path: `/`, siteUrl: `https://example.com` },
  { path: `/about`, siteUrl: `https://example.com/about` },
  { path: `/about/`, siteUrl: `https://example.com/about` },
])(
  `getSiteUrl resolves $path against the site URL without a trailing slash`,
  async ({ path, siteUrl }) => {
    const { getSiteUrl } = await importUrlWithSiteUrlEnv(`https://example.com`)

    const url = getSiteUrl(path)

    expect(url).toBe(siteUrl)
  },
)
