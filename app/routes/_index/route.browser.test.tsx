import { createRoutesStub } from 'react-router'
import { beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import IndexPage, { clientLoader, HydrateFallback } from './route.tsx'
import { SpotifyResponseError } from '~/services/spotify-error.ts'
import {
  authenticateWithSpotify,
  fetchDevices,
  fetchPlaylistIdsAndNames,
  fetchPlaylistTrackUris,
  fetchSavedAlbumTrackUris,
  fetchSavedTrackUris,
  logOutOfSpotify,
  playTracks,
} from '~/services/spotify.ts'

vi.mock(`~/services/spotify.ts`)

// Reversing makes the played order predictable and distinct from the fetched
// order
vi.mock(`~/services/shuffle.ts`, () => ({
  default: (array: unknown[]) => array.toReversed(),
}))

const PLAYLISTS: [string, string][] = [
  [`road-trip-id`, `Road Trip`],
  [`workout-id`, `Workout`],
]
const DEVICES: [string, string][] = [
  [`phone-id`, `Phone`],
  [`laptop-id`, `Laptop`],
]

const DEVICE_UNAVAILABLE_ERROR = new SpotifyResponseError(`Failed`, {
  status: 404,
  failure: `device-unavailable`,
})

const PLAY_BUTTONS = [
  { name: `Play Liked Songs`, fetchTrackUris: fetchSavedTrackUris },
  { name: `Play Library Albums`, fetchTrackUris: fetchSavedAlbumTrackUris },
  { name: `Play`, fetchTrackUris: fetchPlaylistTrackUris },
]

beforeEach(() => {
  vi.spyOn(console, `error`).mockImplementation(() => {})
  vi.mocked(authenticateWithSpotify).mockResolvedValue(true)
  vi.mocked(fetchPlaylistIdsAndNames).mockResolvedValue(PLAYLISTS)
  vi.mocked(fetchDevices).mockResolvedValue(DEVICES)
  vi.mocked(fetchSavedTrackUris).mockResolvedValue([`track`])
  vi.mocked(fetchSavedAlbumTrackUris).mockResolvedValue([`track`])
  vi.mocked(fetchPlaylistTrackUris).mockResolvedValue([`track`])
  vi.mocked(playTracks).mockResolvedValue()
})

const renderRoute = async () => {
  const Stub = createRoutesStub([
    {
      path: `/`,
      Component: IndexPage,
      HydrateFallback,
      loader: clientLoader,
    },
  ])
  await render(<Stub />)
}

const renderPage = async () => {
  await renderRoute()
  await expect.element(page.getByText(`Device:`)).toBeInTheDocument()
}

const button = (name: string) => page.getByRole(`button`, { name, exact: true })
const playlistSelect = () => page.getByRole(`combobox`, { name: `Play` })
const deviceSelect = () => page.getByRole(`combobox`, { name: `Device:` })

test(`an unauthenticated visitor sees a loading spinner and nothing is fetched`, async () => {
  vi.mocked(authenticateWithSpotify).mockResolvedValue(false)

  await renderRoute()
  await vi.waitFor(() => expect(authenticateWithSpotify).toHaveBeenCalledWith())

  await expect.element(page.getByTitle(`Loading`)).toBeInTheDocument()
  expect(fetchDevices).not.toHaveBeenCalled()
  expect(fetchPlaylistIdsAndNames).not.toHaveBeenCalled()
})

test(`an authenticated visitor can choose from their playlists and devices`, async () => {
  await renderPage()

  await expect.element(playlistSelect()).toHaveDisplayValue(`Road Trip`)
  await expect
    .element(page.getByRole(`option`, { name: `Workout` }))
    .toBeInTheDocument()
  await expect.element(deviceSelect()).toHaveDisplayValue(`Phone`)
  await expect
    .element(page.getByRole(`option`, { name: `Laptop` }))
    .toBeInTheDocument()
})

test.each(PLAY_BUTTONS)(
  `$name plays the shuffled tracks on the first device`,
  async ({ name, fetchTrackUris }) => {
    vi.mocked(fetchTrackUris).mockResolvedValue([`track-1`, `track-2`])
    await renderPage()

    await button(name).click()

    await vi.waitFor(() =>
      expect(playTracks).toHaveBeenCalledExactlyOnceWith(`phone-id`, [
        `track-2`,
        `track-1`,
      ]),
    )
  },
)

test(`playing a playlist fetches the first playlist by default`, async () => {
  await renderPage()

  await button(`Play`).click()

  await vi.waitFor(() =>
    expect(fetchPlaylistTrackUris).toHaveBeenCalledWith(`road-trip-id`),
  )
})

test(`playing a playlist fetches the selected playlist`, async () => {
  await renderPage()
  await playlistSelect().selectOptions(`Workout`)

  await button(`Play`).click()

  await vi.waitFor(() =>
    expect(fetchPlaylistTrackUris).toHaveBeenCalledWith(`workout-id`),
  )
})

test(`playing uses the selected device`, async () => {
  await renderPage()
  await deviceSelect().selectOptions(`Laptop`)

  await button(`Play Liked Songs`).click()

  await vi.waitFor(() =>
    expect(playTracks).toHaveBeenCalledWith(`laptop-id`, [`track`]),
  )
})

test(`every play button is disabled when no devices are detected`, async () => {
  vi.mocked(fetchDevices).mockResolvedValue([])

  await renderPage()

  await expect
    .element(page.getByText(`No devices detected`))
    .toBeInTheDocument()
  await expect.element(button(`Play Liked Songs`)).toBeDisabled()
  await expect.element(button(`Play Library Albums`)).toBeDisabled()
  await expect.element(button(`Play`)).toBeDisabled()
})

test(`only the playlist play button is disabled when there are no playlists`, async () => {
  vi.mocked(fetchPlaylistIdsAndNames).mockResolvedValue([])

  await renderPage()

  await expect.element(page.getByText(`No playlists found`)).toBeInTheDocument()
  await expect.element(button(`Play`)).toBeDisabled()
  await expect.element(button(`Play Liked Songs`)).toBeEnabled()
  await expect.element(button(`Play Library Albums`)).toBeEnabled()
})

test.each([
  { pending: `tracks are fetched`, pendingCall: fetchSavedTrackUris },
  { pending: `tracks start`, pendingCall: playTracks },
])(
  `every play button is disabled and the clicked one shows progress while $pending`,
  async ({ pendingCall }) => {
    vi.mocked(pendingCall).mockReturnValue(new Promise<never>(() => {}))
    await renderPage()

    await button(`Play Liked Songs`).click()

    await expect.element(button(`Queueing...`)).toBeDisabled()
    await expect.element(button(`Play Library Albums`)).toBeDisabled()
    await expect.element(button(`Play`)).toBeDisabled()
  },
)

test(`the play buttons recover once tracks have started`, async () => {
  await renderPage()

  await button(`Play Liked Songs`).click()

  await expect.element(button(`Play Liked Songs`)).toBeEnabled()
  await expect.element(button(`Play Library Albums`)).toBeEnabled()
  await expect.element(button(`Play`)).toBeEnabled()
})

test.each([
  { failure: `fetching tracks`, failingCall: fetchSavedTrackUris },
  { failure: `starting playback`, failingCall: playTracks },
])(`the play buttons recover after $failure fails`, async ({ failingCall }) => {
  vi.mocked(failingCall).mockRejectedValue(new Error(`Spotify failed`))
  await renderPage()

  await button(`Play Liked Songs`).click()

  await expect.element(button(`Play Liked Songs`)).toBeEnabled()
  await expect.element(button(`Play Library Albums`)).toBeEnabled()
  await expect.element(button(`Play`)).toBeEnabled()
})

test(`refresh shows a device that appeared and enables playing on it`, async () => {
  vi.mocked(fetchDevices).mockResolvedValue([])
  await renderPage()
  vi.mocked(fetchDevices).mockResolvedValue([[`tablet-id`, `Tablet`]])

  await button(`Refresh`).click()

  await expect.element(deviceSelect()).toHaveDisplayValue(`Tablet`)
  await button(`Play Liked Songs`).click()
  await vi.waitFor(() =>
    expect(playTracks).toHaveBeenCalledWith(`tablet-id`, [`track`]),
  )
})

test(`loading the page clears the Spotify tokens from the URL hash and keeps the search`, async () => {
  const { search } = location
  location.hash = `#access_token=secret`

  await renderPage()

  expect(location.hash).toBe(``)
  expect(location.search).toBe(search)
})

test(`refresh enables playing a playlist that appeared`, async () => {
  vi.mocked(fetchPlaylistIdsAndNames).mockResolvedValue([])
  await renderPage()
  vi.mocked(fetchPlaylistIdsAndNames).mockResolvedValue(PLAYLISTS)

  await button(`Refresh`).click()

  await expect.element(playlistSelect()).toHaveDisplayValue(`Road Trip`)
  await expect.element(button(`Play`)).toBeEnabled()
})

test(`refresh stops playing on a selected device that disappeared`, async () => {
  await renderPage()
  await deviceSelect().selectOptions(`Laptop`)
  vi.mocked(fetchDevices).mockResolvedValue([[`phone-id`, `Phone`]])

  await button(`Refresh`).click()
  await expect.element(page.getByText(`Laptop`)).not.toBeInTheDocument()
  await button(`Play Liked Songs`).click()

  await vi.waitFor(() =>
    expect(playTracks).toHaveBeenCalledWith(`phone-id`, [`track`]),
  )
})

test(`refresh stops playing a selected playlist that disappeared`, async () => {
  await renderPage()
  await playlistSelect().selectOptions(`Workout`)
  vi.mocked(fetchPlaylistIdsAndNames).mockResolvedValue([
    [`road-trip-id`, `Road Trip`],
  ])

  await button(`Refresh`).click()
  await expect.element(page.getByText(`Workout`)).not.toBeInTheDocument()
  await button(`Play`).click()

  await vi.waitFor(() =>
    expect(fetchPlaylistTrackUris).toHaveBeenCalledWith(`road-trip-id`),
  )
})

test.each([
  {
    description: `an unknown error while fetching tracks`,
    failingCall: fetchSavedTrackUris,
    error: new Error(`Spotify failed`),
    message: `Something went wrong while talking to Spotify. Try again.`,
  },
  {
    description: `an unknown error while starting playback`,
    failingCall: playTracks,
    error: new Error(`Spotify failed`),
    message: `Something went wrong while talking to Spotify. Try again.`,
  },
  {
    description: `a 401 while fetching tracks`,
    failingCall: fetchSavedTrackUris,
    error: new SpotifyResponseError(`Failed`, { status: 401 }),
    message: `Your Spotify login is no longer valid.`,
  },
  {
    description: `a 401 while starting playback`,
    failingCall: playTracks,
    error: new SpotifyResponseError(`Failed`, { status: 401 }),
    message: `Your Spotify login is no longer valid.`,
  },
  {
    description: `a 429 while fetching tracks`,
    failingCall: fetchSavedTrackUris,
    error: new SpotifyResponseError(`Failed`, { status: 429 }),
    message: `Spotify is limiting requests. Wait a while before trying again.`,
  },
  {
    description: `a 429 while starting playback`,
    failingCall: playTracks,
    error: new SpotifyResponseError(`Failed`, { status: 429 }),
    message: `Spotify is limiting requests. Wait a while before trying again.`,
  },
  {
    description: `an unavailable device`,
    failingCall: playTracks,
    error: DEVICE_UNAVAILABLE_ERROR,
    message: `That device is no longer available. Refresh and choose another device.`,
  },
  {
    description: `refused playback`,
    failingCall: playTracks,
    error: new SpotifyResponseError(`Failed`, {
      status: 403,
      failure: `playback-refused`,
    }),
    message: `Spotify refused to start playback. Check that your account has Spotify Premium, which playback requires.`,
  },
])(
  `$description shows its message`,
  async ({ failingCall, error, message }) => {
    vi.mocked(failingCall).mockRejectedValue(error)
    await renderPage()

    await button(`Play Liked Songs`).click()

    await expect.element(page.getByRole(`alert`)).toHaveTextContent(message)
  },
)

test(`a failed play logs the error`, async () => {
  const consoleError = vi.spyOn(console, `error`)
  vi.mocked(playTracks).mockRejectedValue(DEVICE_UNAVAILABLE_ERROR)
  await renderPage()

  await button(`Play Liked Songs`).click()

  await vi.waitFor(() =>
    expect(consoleError).toHaveBeenCalledWith(DEVICE_UNAVAILABLE_ERROR),
  )
})

test(`no error message shows after playback starts`, async () => {
  await renderPage()

  await button(`Play Liked Songs`).click()

  await expect.element(button(`Play Liked Songs`)).toBeEnabled()
  await expect.element(page.getByRole(`alert`)).not.toBeInTheDocument()
})

test.each([
  { action: `a new play`, clear: () => button(`Play Liked Songs`).click() },
  { action: `refresh`, clear: () => button(`Refresh`).click() },
  {
    action: `selecting another device`,
    clear: () => deviceSelect().selectOptions(`Laptop`),
  },
  {
    action: `selecting another playlist`,
    clear: () => playlistSelect().selectOptions(`Workout`),
  },
])(`$action clears the previous error message`, async ({ clear }) => {
  vi.mocked(playTracks).mockRejectedValueOnce(DEVICE_UNAVAILABLE_ERROR)
  await renderPage()
  await button(`Play Liked Songs`).click()
  await expect.element(page.getByRole(`alert`)).toBeInTheDocument()

  await clear()

  await expect.element(page.getByRole(`alert`)).not.toBeInTheDocument()
})

test.each(PLAY_BUTTONS)(
  `$name skips playback when there are no tracks`,
  async ({ name, fetchTrackUris }) => {
    vi.mocked(fetchTrackUris).mockResolvedValue([])
    await renderPage()

    await button(name).click()

    await expect
      .element(page.getByRole(`alert`))
      .toHaveTextContent(`There are no playable tracks to play.`)
    expect(playTracks).not.toHaveBeenCalled()
  },
)

test(`logging in again clears the login and reauthenticates`, async () => {
  vi.mocked(playTracks).mockRejectedValue(
    new SpotifyResponseError(`Failed`, { status: 401 }),
  )
  await renderPage()
  await button(`Play Liked Songs`).click()
  vi.mocked(authenticateWithSpotify).mockClear()

  await button(`Log In Again`).click()

  expect(logOutOfSpotify).toHaveBeenCalledWith()
  await vi.waitFor(() => expect(authenticateWithSpotify).toHaveBeenCalledWith())
})

test(`a failed initial load shows an error and retrying recovers`, async () => {
  vi.mocked(fetchDevices).mockRejectedValueOnce(new Error(`Spotify failed`))

  await renderRoute()

  await expect
    .element(page.getByRole(`alert`))
    .toHaveTextContent(
      `Something went wrong while talking to Spotify. Try again.`,
    )
  await button(`Try Again`).click()
  await expect.element(deviceSelect()).toHaveDisplayValue(`Phone`)
})

test(`an expired login during the initial load offers logging in again`, async () => {
  vi.mocked(fetchDevices).mockRejectedValueOnce(
    new SpotifyResponseError(`Failed`, { status: 401 }),
  )

  await renderRoute()
  await button(`Log In Again`).click()

  expect(logOutOfSpotify).toHaveBeenCalledWith()
})

test(`a failed refresh shows an error and retrying recovers`, async () => {
  await renderPage()
  vi.mocked(fetchDevices).mockRejectedValueOnce(
    new SpotifyResponseError(`Failed`, { status: 429 }),
  )

  await button(`Refresh`).click()

  await expect
    .element(page.getByRole(`alert`))
    .toHaveTextContent(
      `Spotify is limiting requests. Wait a while before trying again.`,
    )
  await button(`Try Again`).click()
  await expect.element(deviceSelect()).toHaveDisplayValue(`Phone`)
})

test(`the selects are disabled while queueing and enabled afterward`, async () => {
  const { promise, resolve } = Promise.withResolvers<string[]>()
  vi.mocked(fetchSavedTrackUris).mockReturnValue(promise)
  await renderPage()

  await button(`Play Liked Songs`).click()

  await expect.element(deviceSelect()).toBeDisabled()
  await expect.element(playlistSelect()).toBeDisabled()
  resolve([`track`])
  await expect.element(deviceSelect()).toBeEnabled()
  await expect.element(playlistSelect()).toBeEnabled()
})

test(`refresh keeps the default device when the device list is reordered`, async () => {
  await renderPage()
  vi.mocked(fetchDevices).mockResolvedValue(DEVICES.toReversed())

  await button(`Refresh`).click()
  await expect
    .element(deviceSelect().getByRole(`option`).first())
    .toHaveTextContent(`Laptop`)

  await expect.element(deviceSelect()).toHaveDisplayValue(`Phone`)
})

test(`refresh keeps the default playlist when the playlist list is reordered`, async () => {
  await renderPage()
  vi.mocked(fetchPlaylistIdsAndNames).mockResolvedValue(PLAYLISTS.toReversed())

  await button(`Refresh`).click()
  await expect
    .element(playlistSelect().getByRole(`option`).first())
    .toHaveTextContent(`Workout`)

  await expect.element(playlistSelect()).toHaveDisplayValue(`Road Trip`)
})

test(`a removed device that returns isn't reselected`, async () => {
  await renderPage()
  await deviceSelect().selectOptions(`Laptop`)
  vi.mocked(fetchDevices).mockResolvedValue([[`phone-id`, `Phone`]])
  await button(`Refresh`).click()
  await expect.element(page.getByText(`Laptop`)).not.toBeInTheDocument()
  vi.mocked(fetchDevices).mockResolvedValue(DEVICES)

  await button(`Refresh`).click()
  await expect.element(page.getByText(`Laptop`)).toBeInTheDocument()

  await expect.element(deviceSelect()).toHaveDisplayValue(`Phone`)
})
