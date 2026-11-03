import { useCallback, useEffect, useId, useState } from 'react'
import type { ChangeEventHandler, ComponentProps, ReactNode } from 'react'
import { useLoaderData, useRevalidator } from 'react-router'
import LoadingSpinner from './loading.svg?react'
import spotifyPngUrl from './spotify.png?url'
import shuffle from '~/services/shuffle.ts'
import { SpotifyResponseError } from '~/services/spotify-error.ts'
import type { SpotifyFailure } from '~/services/spotify-error.ts'
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

const IndexPage = () => {
  const loaderData = useLoaderData<typeof clientLoader>()
  const { devices = [], loadFailure } = loaderData ?? {}
  const [deviceId, setDeviceId] = useSelectedId(devices)

  const [failure, setFailure] = useState<Failure>()
  const clearFailure = useCallback(() => setFailure(undefined), [])

  const [queueing, setQueueing] = useState(false)
  const play = useCallback<Play>(
    async fetchTrackUris => {
      setQueueing(true)
      clearFailure()
      try {
        const trackUris = await fetchTrackUris()
        if (trackUris.length === 0) {
          setFailure(`no-tracks`)
          return
        }

        await playTracks(deviceId!, shuffle(trackUris))
      } catch (error) {
        console.error(error)
        setFailure(getRequestFailure(error))
      } finally {
        setQueueing(false)
      }
    },
    [deviceId, clearFailure],
  )
  const canPlay = !queueing && Boolean(deviceId)

  const { revalidate } = useRevalidator()
  const refresh = useCallback(async () => {
    clearFailure()
    await revalidate()
  }, [clearFailure, revalidate])

  // Clear Spotify tokens from the URL after load.
  useEffect(() => {
    history.replaceState(``, ``, location.pathname + location.search)
  }, [])

  if (!loaderData) {
    return <HydrateFallback />
  }

  if (loadFailure) {
    return (
      <Layout>
        <FailureMessage failure={loadFailure} />
        <div className='mt-3'>
          <Button onClick={refresh}>Try Again</Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='flex flex-wrap justify-center gap-x-4 gap-y-3'>
        <div className='flex gap-1'>
          <PlaySavedTracksButton canPlay={canPlay} play={play} />
          <PlaySavedAlbums canPlay={canPlay} play={play} />
        </div>
        <PlaylistSelect
          canPlay={canPlay}
          disabled={queueing}
          play={play}
          onSelect={clearFailure}
        />
      </div>

      <DeviceSelect
        deviceId={deviceId}
        disabled={queueing}
        setDeviceId={setDeviceId}
        onSelect={clearFailure}
      />

      {failure && <FailureMessage failure={failure} />}

      <div className='mt-3'>
        <Button onClick={refresh}>Refresh</Button>
      </div>
    </Layout>
  )
}

type Failure = SpotifyFailure | `no-tracks`

const FAILURE_MESSAGES: Record<Failure, string> = {
  'no-tracks': `There are no playable tracks to play.`,
  'device-unavailable': `That device is no longer available. Refresh and choose another device.`,
  'playback-refused': `Spotify refused to start playback. Check that your account has Spotify Premium, which playback requires.`,
  'login-expired': `Your Spotify login is no longer valid.`,
  'rate-limited': `Spotify is limiting requests. Wait a while before trying again.`,
  unexpected: `Something went wrong while talking to Spotify. Try again.`,
}

const getRequestFailure = (error: unknown): SpotifyFailure =>
  error instanceof SpotifyResponseError ? error.failure : `unexpected`

const FailureMessage = ({ failure }: { failure: Failure }) => {
  const { revalidate } = useRevalidator()
  const logIn = useCallback(async () => {
    logOutOfSpotify()
    await revalidate()
  }, [revalidate])

  return (
    <>
      <p role='alert' className='mt-3 font-medium text-red-700 sm:text-lg'>
        {FAILURE_MESSAGES[failure]}
      </p>
      {failure === `login-expired` && (
        <div className='mt-3'>
          <Button onClick={logIn}>Log In Again</Button>
        </div>
      )}
    </>
  )
}

type Play = (fetchTrackUris: () => Promise<string[]>) => Promise<void>

const useSelectedId = (idsAndNames: [string, string][]) => {
  const [selectedId, setSelectedId] = useState(idsAndNames[0]?.[0])

  // Storing the fallback means a removed option that returns isn't reselected.
  const resolvedId = idsAndNames.some(([id]) => id === selectedId)
    ? selectedId
    : idsAndNames[0]?.[0]
  if (resolvedId !== selectedId) {
    setSelectedId(resolvedId)
  }

  return [resolvedId, setSelectedId] as const
}

export const HydrateFallback = () => (
  <Layout>
    <div className='mb-1 flex min-h-36 flex-col items-center justify-center'>
      <LoadingSpinner title='Loading' />
    </div>
  </Layout>
)

const Layout = ({ children }: { children: ReactNode }) => (
  <main className='flex flex-col items-center p-5 text-center sm:p-7'>
    <Header />

    {children}

    <a
      href='https://tomeraberba.ch'
      className='mt-10 font-medium underline sm:text-lg'
    >
      Tomer Aberbach
    </a>
  </main>
)

const Header = () => (
  <div className='flex flex-col items-center'>
    <h1 className='mb-5 text-2xl font-semibold sm:text-3xl'>True Random For</h1>
    <img src={spotifyPngUrl} alt='Spotify' className='my-5 w-[20vw] min-w-52' />
    <p className='mx-auto mt-5 mb-10 max-w-[45ch] text-xl font-medium sm:text-2xl'>
      An application for unbiased truly random playlist and library shuffling
      with Spotify.
    </p>
  </div>
)

const PlaySavedTracksButton = ({
  canPlay,
  play,
}: {
  canPlay: boolean
  play: Play
}) => {
  const [queueing, setQueueing] = useState(false)
  const playSavedTracks = useCallback(async () => {
    setQueueing(true)
    await play(fetchSavedTrackUris)
    setQueueing(false)
  }, [play])

  return (
    <Button disabled={!canPlay} onClick={playSavedTracks}>
      {queueing ? `Queueing...` : `Play Liked Songs`}
    </Button>
  )
}

const PlaySavedAlbums = ({
  canPlay,
  play,
}: {
  canPlay: boolean
  play: Play
}) => {
  const [queueing, setQueueing] = useState(false)
  const playSavedAlbums = useCallback(async () => {
    setQueueing(true)
    await play(fetchSavedAlbumTrackUris)
    setQueueing(false)
  }, [play])

  return (
    <Button disabled={!canPlay} onClick={playSavedAlbums}>
      {queueing ? `Queueing...` : `Play Library Albums`}
    </Button>
  )
}

const PlaylistSelect = ({
  canPlay,
  disabled,
  play,
  onSelect,
}: {
  canPlay: boolean
  disabled: boolean
  play: Play
  onSelect: () => void
}) => {
  const { playlists = [] } = useLoaderData<typeof clientLoader>() ?? {}

  const playButtonId = useId()
  const [playlistId, setPlaylistId] = useSelectedId(playlists)
  const updatePlaylistId = useCallback<ChangeEventHandler<HTMLSelectElement>>(
    e => {
      setPlaylistId(e.target.value)
      onSelect()
    },
    [setPlaylistId, onSelect],
  )

  const [queueing, setQueueing] = useState(false)
  const playPlaylist = useCallback(async () => {
    setQueueing(true)
    await play(() => fetchPlaylistTrackUris(playlistId!))
    setQueueing(false)
  }, [play, playlistId])

  return (
    <div className='flex items-center gap-1 sm:text-lg'>
      <Button
        id={playButtonId}
        disabled={!canPlay || !playlistId}
        onClick={playPlaylist}
      >
        {queueing ? `Queueing...` : `Play`}
      </Button>
      {playlists.length === 0 && <span>No playlists found</span>}
      {playlists.length > 0 && (
        <select
          aria-labelledby={playButtonId}
          value={playlistId}
          disabled={disabled}
          onChange={updatePlaylistId}
          className='max-w-[60vw] border border-black bg-white p-1.5 disabled:cursor-not-allowed disabled:opacity-70'
        >
          {playlists.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

const DeviceSelect = ({
  deviceId,
  disabled,
  setDeviceId,
  onSelect,
}: {
  deviceId: string | undefined
  disabled: boolean
  setDeviceId: (id: string) => void
  onSelect: () => void
}) => {
  const { devices = [] } = useLoaderData<typeof clientLoader>() ?? {}

  const devicesSelectId = useId()
  const updateDeviceId = useCallback<ChangeEventHandler<HTMLSelectElement>>(
    e => {
      setDeviceId(e.target.value)
      onSelect()
    },
    [setDeviceId, onSelect],
  )

  return (
    <div className='mt-3 flex items-center gap-2 sm:text-lg'>
      <label htmlFor={devicesSelectId} className='font-medium'>
        Device:
      </label>
      {devices.length === 0 && <span>No devices detected</span>}
      {devices.length > 0 && (
        <select
          id={devicesSelectId}
          value={deviceId}
          disabled={disabled}
          onChange={updateDeviceId}
          className='border border-black bg-white p-1.5 disabled:cursor-not-allowed disabled:opacity-70'
        >
          {devices.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

const Button = (props: ComponentProps<`button`>) => (
  <button
    {...props}
    type='button'
    className='cursor-pointer border border-black bg-white p-1.5 disabled:cursor-not-allowed disabled:opacity-70 sm:text-lg'
  />
)

export const clientLoader = async () => {
  try {
    if (!(await authenticateWithSpotify())) {
      return null
    }

    const [playlists, devices] = await Promise.all([
      fetchPlaylistIdsAndNames(),
      fetchDevices(),
    ])
    return { playlists, devices }
  } catch (error) {
    console.error(error)
    return { loadFailure: getRequestFailure(error) }
  }
}

export default IndexPage
