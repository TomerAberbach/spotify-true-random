# spotify-true-random

A web app for unbiased, truly random shuffling of Spotify playlists and
libraries.

## Project structure

```
spotify-true-random
├── app/
│   ├── routes/_index/route.tsx   # The app's only page
│   └── services/                 # Shuffling, Spotify API calls, and site URLs
│
└── .claude/
    └── hooks/lint-format.sh      # Lints and formats each written file
```

## Development

```sh
# Everything CI runs. Run before handing work back
pnpm check

# Run one test file
pnpm test --run app/services/shuffle.test.ts
```

## Deployment

- Pushing to `main` deploys to Fly.io through `.github/workflows/deploy.yml`
