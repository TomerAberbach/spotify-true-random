import { InMemoryCachingStrategy, SpotifyApi } from '@spotify/web-api-ts-sdk'
import type { Page } from '@spotify/web-api-ts-sdk'
import {
  filter,
  filterAsync,
  flatMapAsync,
  map,
  mapAsync,
  pipe,
  reduce,
  reduceAsync,
  takeAsync,
  toArray,
} from 'lfi'
import { SITE_URL } from './url.ts'

export const authenticateWithSpotify = async (): Promise<boolean> =>
  (await spotify.authenticate()).authenticated

export const playTracks = async (
  deviceId: string,
  trackUris: string[],
): Promise<void> =>
  spotify.player.startResumePlayback(deviceId, undefined, trackUris)

export const fetchDevices = async (): Promise<[string, string][]> =>
  pipe(
    (await spotify.player.getAvailableDevices()).devices,
    filter(device => !device.is_restricted && Boolean(device.id)),
    map((device): [string, string] => [device.id!, device.name]),
    reduce(toArray()),
  )

export const fetchSavedTrackUris = async (): Promise<string[]> =>
  pipe(
    paginate(offset => spotify.currentUser.tracks.savedTracks(50, offset)),
    filterAsync(({ track }) => !track.is_local),
    mapAsync(({ track }) => track.uri),
    takeAsync(MAX_PLAYABLE_URIS),
    reduceAsync(toArray()),
  )

export const fetchSavedAlbumTrackUris = async (): Promise<string[]> =>
  pipe(
    paginate(offset => spotify.currentUser.albums.savedAlbums(50, offset)),
    flatMapAsync(({ album }) =>
      paginate(offset =>
        spotify.albums.tracks(album.id, undefined, 50, offset),
      ),
    ),
    filterAsync(track => !track.is_local),
    mapAsync(track => track.uri),
    takeAsync(MAX_PLAYABLE_URIS),
    reduceAsync(toArray()),
  )

export const fetchPlaylistTrackUris = async (
  playlistId: string,
): Promise<string[]> =>
  pipe(
    paginate(offset =>
      spotify.playlists.getPlaylistItems(
        playlistId,
        undefined,
        `items(track(uri))`,
        50,
        offset,
      ),
    ),
    mapAsync(({ track }) => track.uri),
    takeAsync(MAX_PLAYABLE_URIS),
    reduceAsync(toArray()),
  )

// Trying to play more URIs than this results in a "Payload Too Large" 413 error
// from Spotify.
const MAX_PLAYABLE_URIS = 382

export const fetchPlaylistIdsAndNames = async (): Promise<[string, string][]> =>
  pipe(
    paginate(offset => spotify.currentUser.playlists.playlists(50, offset)),
    mapAsync(({ id, name }): [string, string] => [id, name]),
    reduceAsync(toArray()),
  )

async function* paginate<Item>(
  fetch: (offset: number) => Promise<Page<Item>>,
): AsyncIterable<Item> {
  let offset = 0
  let lastPage: Page<Item>
  do {
    lastPage = await fetch(offset)
    yield* lastPage.items
    offset += lastPage.items.length
  } while (offset < lastPage.total)
}

const spotify = SpotifyApi.withImplicitGrant(
  `b61d28d1ed4c49e8ba5d2923ed367262`,
  SITE_URL,
  [
    `playlist-read-private`,
    `playlist-read-collaborative`,
    `user-modify-playback-state`,
    `user-library-read`,
    `user-read-playback-state`,
  ],
  { cachingStrategy: new InMemoryCachingStrategy() },
)
