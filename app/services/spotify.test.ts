import type { SdkOptions } from '@spotify/web-api-ts-sdk'
import { expect, test, vi } from 'vitest'
import {
  authenticateWithSpotify,
  fetchDevices,
  fetchPlaylistIdsAndNames,
  fetchPlaylistTrackUris,
  fetchSavedAlbumTrackUris,
  fetchSavedTrackUris,
  logOutOfSpotify,
  playTracks,
} from './spotify.ts'

const sdk = vi.hoisted<{ options?: SdkOptions }>(() => ({}))

const spotify = vi.hoisted(() => ({
  authenticate: vi.fn(),
  logOut: vi.fn(),
  player: { startResumePlayback: vi.fn(), getAvailableDevices: vi.fn() },
  currentUser: {
    tracks: { savedTracks: vi.fn() },
    albums: { savedAlbums: vi.fn() },
    playlists: { playlists: vi.fn() },
  },
  albums: { tracks: vi.fn() },
  playlists: { getPlaylistItems: vi.fn() },
}))

vi.mock(`@spotify/web-api-ts-sdk`, () => ({
  SpotifyApi: {
    withUserAuthorization: (
      _clientId: string,
      _redirectUri: string,
      _scopes: string[],
      options: SdkOptions,
    ) => {
      sdk.options = options
      return spotify
    },
  },
}))

const page =
  <Item>(items: Item[]) =>
  (limit: number, offset: number) =>
    Promise.resolve({
      items: items.slice(offset, offset + limit),
      total: items.length,
    })

const validateResponseWithStatus = (status: number) =>
  sdk.options!.responseValidator!.validateResponse(
    new Response(`Spotify response body`, { status }),
  )

const track = (uri: string, isLocal = false) => ({ uri, is_local: isLocal })

test.each([true, false])(
  `authenticateWithSpotify returns %s when Spotify reports that authentication state`,
  async authenticated => {
    spotify.authenticate.mockResolvedValue({ authenticated })

    const result = await authenticateWithSpotify()

    expect(result).toBe(authenticated)
  },
)

test.each([
  { trackCount: 382, playedCount: 382 },
  { trackCount: 383, playedCount: 382 },
])(
  `playTracks plays $playedCount of $trackCount tracks to stay under Spotify's payload limit`,
  async ({ trackCount, playedCount }) => {
    const trackUris = Array.from({ length: trackCount }, (_, i) => `track-${i}`)

    await playTracks(`device`, trackUris)

    expect(spotify.player.startResumePlayback).toHaveBeenCalledWith(
      `device`,
      undefined,
      trackUris.slice(0, playedCount),
    )
  },
)

test(`playTracks resolves for a successful response`, async () => {
  spotify.player.startResumePlayback.mockReturnValue(
    validateResponseWithStatus(200),
  )

  await expect(playTracks(`device`, [`track`])).resolves.toBeUndefined()
})

test.each([
  { status: 401, failure: `login-expired` },
  { status: 403, failure: `playback-refused` },
  { status: 404, failure: `device-unavailable` },
  { status: 429, failure: `rate-limited` },
  { status: 500, failure: `unexpected` },
])(
  `playTracks rejects with a $failure failure for a $status response`,
  async ({ status, failure }) => {
    spotify.player.startResumePlayback.mockReturnValue(
      validateResponseWithStatus(status),
    )

    await expect(playTracks(`device`, [`track`])).rejects.toMatchObject({
      failure,
    })
  },
)

test(`logOutOfSpotify logs out of the Spotify client`, () => {
  logOutOfSpotify()

  expect(spotify.logOut).toHaveBeenCalledWith()
})

test(`playTracks rejects when the request fails without a response`, async () => {
  const networkError = new TypeError(`Failed to fetch`)
  spotify.player.startResumePlayback.mockRejectedValue(networkError)

  await expect(playTracks(`device`, [`track`])).rejects.toBe(networkError)
})

test(`a failed response while fetching tracks rejects with the status and body`, async () => {
  spotify.currentUser.tracks.savedTracks.mockReturnValue(
    validateResponseWithStatus(404),
  )

  await expect(fetchSavedTrackUris()).rejects.toThrow(
    /404.*Spotify response body/u,
  )
})

test.each([
  { status: 401, failure: `login-expired` },
  { status: 403, failure: `unexpected` },
  { status: 404, failure: `unexpected` },
  { status: 429, failure: `rate-limited` },
])(
  `a $status response while fetching tracks rejects with a $failure failure`,
  async ({ status, failure }) => {
    spotify.currentUser.tracks.savedTracks.mockReturnValue(
      validateResponseWithStatus(status),
    )

    await expect(fetchSavedTrackUris()).rejects.toMatchObject({ failure })
  },
)

test(`fetchDevices excludes restricted devices and devices without an ID`, async () => {
  spotify.player.getAvailableDevices.mockResolvedValue({
    devices: [
      { id: `phone`, name: `Phone`, is_restricted: false },
      { id: `speaker`, name: `Speaker`, is_restricted: true },
      { id: null, name: `Unknown`, is_restricted: false },
    ],
  })

  const devices = await fetchDevices()

  expect(devices).toStrictEqual([[`phone`, `Phone`]])
})

test(`fetchSavedTrackUris returns the non-local tracks from every page`, async () => {
  const savedTracks = [
    { track: track(`track-1`) },
    { track: track(`local-track`, true) },
    ...Array.from({ length: 50 }, () => ({ track: track(`track-2`) })),
    { track: track(`track-3`) },
  ]
  spotify.currentUser.tracks.savedTracks.mockImplementation(page(savedTracks))

  const trackUris = await fetchSavedTrackUris()

  expect(trackUris).toStrictEqual([
    `track-1`,
    ...Array.from({ length: 50 }, () => `track-2`),
    `track-3`,
  ])
})

test(`fetchSavedTrackUris returns nothing when the library is empty`, async () => {
  spotify.currentUser.tracks.savedTracks.mockImplementation(page([]))

  const trackUris = await fetchSavedTrackUris()

  expect(trackUris).toStrictEqual([])
})

test(`fetchSavedAlbumTrackUris returns the non-local tracks of every album on every page`, async () => {
  const albumTracks = new Map([
    [`album-1`, [track(`track-1`), track(`local-track`, true)]],
    [`album-2`, [track(`track-2`), track(`track-3`)]],
  ])
  const savedAlbums = [
    ...Array.from({ length: 50 }, () => ({ album: { id: `album-1` } })),
    { album: { id: `album-2` } },
  ]
  spotify.currentUser.albums.savedAlbums.mockImplementation(page(savedAlbums))
  spotify.albums.tracks.mockImplementation(
    (albumId: string, _market: undefined, limit: number, offset: number) =>
      page(albumTracks.get(albumId)!)(limit, offset),
  )

  const trackUris = await fetchSavedAlbumTrackUris()

  expect(trackUris).toStrictEqual([
    ...Array.from({ length: 50 }, () => `track-1`),
    `track-2`,
    `track-3`,
  ])
})

test(`fetchPlaylistTrackUris returns the playlist's tracks from every page without local or removed tracks`, async () => {
  const playlistItems = [
    { track: track(`track-1`) },
    { track: null },
    { track: track(`local-track`, true) },
    ...Array.from({ length: 50 }, () => ({ track: track(`track-2`) })),
  ]
  spotify.playlists.getPlaylistItems.mockImplementation(
    (
      _playlistId: string,
      _market: undefined,
      _fields: string,
      limit: number,
      offset: number,
    ) => page(playlistItems)(limit, offset),
  )

  const trackUris = await fetchPlaylistTrackUris(`playlist`)

  expect(spotify.playlists.getPlaylistItems).toHaveBeenCalledWith(
    `playlist`,
    undefined,
    expect.any(String),
    50,
    0,
  )
  expect(trackUris).toStrictEqual([
    `track-1`,
    ...Array.from({ length: 50 }, () => `track-2`),
  ])
})

test(`fetchPlaylistIdsAndNames returns the ID and name of the playlists on every page`, async () => {
  const playlists = [
    ...Array.from({ length: 50 }, () => ({ id: `id-1`, name: `Name 1` })),
    { id: `id-2`, name: `Name 2` },
  ]
  spotify.currentUser.playlists.playlists.mockImplementation(page(playlists))

  const idsAndNames = await fetchPlaylistIdsAndNames()

  expect(idsAndNames).toStrictEqual([
    ...Array.from({ length: 50 }, () => [`id-1`, `Name 1`]),
    [`id-2`, `Name 2`],
  ])
})
