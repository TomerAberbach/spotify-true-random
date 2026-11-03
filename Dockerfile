FROM node:24-slim AS base
RUN corepack enable && corepack prepare pnpm@12.9.0 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM base
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
EXPOSE 3000
# Calls the binary directly, because pnpm would first try to install the dev
# dependencies the image leaves out
CMD ["node_modules/.bin/react-router-serve", "./build/server/index.js"]
