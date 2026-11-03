export type SpotifyFailure =
  | `device-unavailable`
  | `playback-refused`
  | `login-expired`
  | `rate-limited`
  | `unexpected`

const STATUS_FAILURES: Partial<Record<number, SpotifyFailure>> = {
  401: `login-expired`,
  429: `rate-limited`,
}

export class SpotifyResponseError extends Error {
  public readonly status: number
  public readonly failure: SpotifyFailure

  public constructor(
    message: string,
    options: ErrorOptions & { status: number; failure?: SpotifyFailure },
  ) {
    super(message, options)
    this.name = `SpotifyResponseError`
    this.status = options.status
    this.failure =
      options.failure ?? STATUS_FAILURES[options.status] ?? `unexpected`
  }
}
