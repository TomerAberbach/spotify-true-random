import { useLoaderData, useRevalidator } from '@remix-run/react'
import { useCallback, useId, useState } from 'react'
import type {
  ChangeEventHandler,
  ComponentProps,
  Dispatch,
  ReactNode,
  SetStateAction,
} from 'react'
import spotifyPngUrl from './spotify.png?url'
import LoadingSpinner from './loading.svg?react'
import {
  authenticateWithSpotify,
  fetchDevices,
  fetchPlaylistIdsAndNames,
  fetchPlaylistTrackUris,
  fetchSavedAlbumTrackUris,
  fetchSavedTrackUris,
  playTracks,
} from '~/services/spotify.ts'
import shuffle from '~/services/shuffle.ts'

export const HydrateFallback = () => (
  <Layout>
    <div className='mb-1 flex min-h-36 flex-col items-center justify-center'>
      <LoadingSpinner title='Loading' />
    </div>
  </Layout>
)

const IndexPage = () => {
  const { devices = [] } = useLoaderData<typeof clientLoader>() ?? {}
  const [deviceId, setDeviceId] = useState(devices[0]?.[0])

  const [isQueueing, setQueueing] = useState(false)
  const play = useCallback<(trackUris: string[]) => Promise<void>>(
    async trackUris => {
      setQueueing(true)
      try {
        await playTracks(deviceId!, trackUris)
      } finally {
        setQueueing(false)
      }
    },
    [deviceId],
  )
  const canPlay = !isQueueing && Boolean(deviceId)

  const { revalidate } = useRevalidator()

  return (
    <Layout>
      <div className='flex flex-wrap justify-center gap-x-4 gap-y-3'>
        <div className='flex gap-1'>
          <PlaySavedTracksButton canPlay={canPlay} play={play} />
          <PlaySavedAlbums canPlay={canPlay} play={play} />
        </div>
        <PlaylistSelect canPlay={canPlay} play={play} />
      </div>

      <DeviceSelect deviceId={deviceId} setDeviceId={setDeviceId} />

      <div className='mt-3'>
        <Button onClick={revalidate}>Refresh</Button>
      </div>
    </Layout>
  )
}

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
    <p className='mx-auto mb-10 mt-5 max-w-[45ch] text-xl font-medium sm:text-2xl'>
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
  play: (trackUris: string[]) => Promise<void>
}) => {
  const [isQueuing, setQueuing] = useState(false)
  const playSavedTracks = useCallback(async () => {
    setQueuing(true)
    await play(shuffle(await fetchSavedTrackUris()))
    setQueuing(false)
  }, [play])

  return (
    <Button disabled={!canPlay} onClick={playSavedTracks}>
      {isQueuing ? `Queueing...` : `Play Liked Songs`}
    </Button>
  )
}

const PlaySavedAlbums = ({
  canPlay,
  play,
}: {
  canPlay: boolean
  play: (trackUris: string[]) => Promise<void>
}) => {
  const [isQueuing, setQueuing] = useState(false)
  const playSavedAlbums = useCallback(async () => {
    setQueuing(true)
    await play(shuffle(await fetchSavedAlbumTrackUris()))
    setQueuing(false)
  }, [play])

  return (
    <Button disabled={!canPlay} onClick={playSavedAlbums}>
      {isQueuing ? `Queueing...` : `Play Library Albums`}
    </Button>
  )
}

const PlaylistSelect = ({
  canPlay,
  play,
}: {
  canPlay: boolean
  play: (trackUris: string[]) => Promise<void>
}) => {
  const { playlists = [] } = useLoaderData<typeof clientLoader>() ?? {}

  const playButtonId = useId()
  const [playlistId, setPlaylistId] = useState(playlists[0]?.[0])
  const updatePlaylistId = useCallback<ChangeEventHandler<HTMLSelectElement>>(
    e => setPlaylistId(e.target.value),
    [setPlaylistId],
  )

  const [isQueuing, setQueuing] = useState(false)
  const playPlaylist = useCallback(async () => {
    setQueuing(true)
    await play(shuffle(await fetchPlaylistTrackUris(playlistId!)))
    setQueuing(false)
  }, [play, playlistId])

  return (
    <div className='flex gap-1 sm:text-lg'>
      <Button
        id={playButtonId}
        disabled={!canPlay || !playlistId}
        onClick={playPlaylist}
      >
        {isQueuing ? `Queueing...` : `Play`}
      </Button>
      {playlists.length === 0 && <span>No playlists found</span>}
      {playlists.length > 0 && (
        <select
          aria-labelledby={playButtonId}
          onChange={updatePlaylistId}
          className='max-w-[75vw] border border-black bg-white p-1.5'
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
  setDeviceId,
}: {
  deviceId: string | undefined
  setDeviceId: Dispatch<SetStateAction<string | undefined>>
}) => {
  const { devices = [] } = useLoaderData<typeof clientLoader>() ?? {}

  const devicesSelectId = useId()
  const updateDeviceId = useCallback<ChangeEventHandler<HTMLSelectElement>>(
    e => setDeviceId(e.target.value),
    [setDeviceId],
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
          defaultValue={deviceId}
          onChange={updateDeviceId}
          className='border border-black bg-white p-1.5'
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
    className='border border-black bg-white p-1.5 sm:text-lg'
  />
)

export const clientLoader = async () => {
  if (!(await authenticateWithSpotify())) {
    return null
  }

  const [playlists, devices] = await Promise.all([
    fetchPlaylistIdsAndNames(),
    fetchDevices(),
  ])
  return { playlists, devices }
}

export default IndexPage
