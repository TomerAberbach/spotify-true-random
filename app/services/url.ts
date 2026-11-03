const removeTrailingSlash = (url: string): string =>
  url.endsWith(`/`) ? url.slice(0, -1) : url

export const getSiteUrl = (path: string): string =>
  removeTrailingSlash(new URL(path, SITE_URL).href)

export const SITE_URL: string = removeTrailingSlash(
  new URL(
    `/`,
    typeof window === `undefined`
      ? (process.env.SITE_URL ?? `http://localhost:3000`)
      : globalThis.location.href,
  ).href,
)
