import { expect, test } from 'vitest'
import { getSiteUrl, SITE_URL } from './url.ts'

test(`SITE_URL is the origin of the current page`, () => {
  expect(SITE_URL).toBe(location.origin)
})

test(`getSiteUrl resolves a path against the origin of the current page`, () => {
  const url = getSiteUrl(`/about/`)

  expect(url).toBe(`${location.origin}/about`)
})
