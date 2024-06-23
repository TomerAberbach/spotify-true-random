# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.1.0
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Remix"

ARG PNPM_VERSION=9.1.1
RUN npm install -g pnpm@$PNPM_VERSION

WORKDIR /app

ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
  apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules
COPY --link package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Copy application code
COPY --link . .

# Build application
RUN pnpm run build

# Remove development dependencies
RUN pnpm prune --prod --config.ignore-scripts=true


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "pnpm", "run", "start" ]
