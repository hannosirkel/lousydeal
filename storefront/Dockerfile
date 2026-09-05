# The Next.js storefront image.
#
# Build context is the **repository root**, not `storefront/` -- the
# dependency tree comes from the workspace lockfile at the root:
#
#     podman build --file storefront/Dockerfile .
#
# The ignore-file for this build is `storefront/Dockerfile.dockerignore`; with
# a context of `.`, this repository's builders -- verified against podman
# 5.4.2 / buildah 1.39.3 only, and T12 will exercise a different one, which is
# the builder this claim needs to hold for -- read `<dockerfile>.dockerignore`
# beside the Dockerfile and would never look at a `.dockerignore` inside
# `storefront/`. See `scripts/images.test.ts`.
#
# ## Nothing environment-specific is baked in, and this is where that is won
#
# Next.js inlines a **direct** `process.env.NEXT_PUBLIC_*` reference into the
# client bundle at build time; a dynamic lookup of the same prefix is not
# inlined (`storefront/tests/no-next-public-env.test.ts:7-9`, citing Next's
# own docs). So this file declares **no `ARG` at all**: there is no build
# argument to pass a publishable key or a base URL through, and the only
# `ENV` instructions it carries are `NODE_ENV`, the port and the bind
# address, which are identical in every environment.
#
# `storefront/tests/no-next-public-env.test.ts` holds the source to the same
# rule, and `scripts/images.test.ts` holds this file to declaring no build
# argument. The storefront reads all of it from `process.env` per request, in
# `storefront/src/config/runtime-config.ts`.

# node:24.18.1-trixie-slim
FROM node:24.18.1-trixie-slim@sha256:ac39e4b5fcb2b1b34b20364fd58b2e898f3bb80731ee6f62a7536f9df3d6aadc AS build

WORKDIR /src

# The manifests first, so the install layer is cached against them rather than
# against the source. All three are needed even for a single workspace: npm
# reads every workspace's `package.json` before it resolves anything.
COPY package.json package-lock.json ./
COPY storefront/package.json storefront/package.json
COPY backend/package.json backend/package.json

RUN npm ci --workspace storefront --include-workspace-root

COPY storefront/ storefront/

# `output: "standalone"` in `next.config.ts` makes this emit a server plus the
# exact subset of `node_modules` file tracing proved it needs. No variable is
# set: a value that is not present at build time cannot be inlined by a build,
# and `next.config.ts`'s own header explains why none is read here.
RUN NODE_ENV=production npm run build --workspace storefront

# node:24.18.1-trixie-slim
FROM node:24.18.1-trixie-slim@sha256:ac39e4b5fcb2b1b34b20364fd58b2e898f3bb80731ee6f62a7536f9df3d6aadc AS runtime

LABEL org.opencontainers.image.description="Lousy Deal storefront"
LABEL org.opencontainers.image.licenses=UNLICENSED

ENV NODE_ENV=production
ENV PORT=3000
# The generated standalone server reads `process.env.HOSTNAME || '0.0.0.0'`
# (`.next/standalone/storefront/server.js:15`) -- so an unset `HOSTNAME` does
# fall back to `0.0.0.0` in isolation, but the container runtime does not
# leave it unset: podman and Docker both inject `HOSTNAME=<container id>`
# into every container that declares none (measured: `podman run --rm
# node:24.18.1-trixie-slim sh -c 'echo $HOSTNAME'` prints the container ID).
# Left undeclared, that injected value would win over the literal default and
# the server would bind to a name nothing routes to. Declaring it here is
# what keeps the bind address `0.0.0.0` rather than a matter of which runtime
# ships this image.
ENV HOSTNAME=0.0.0.0

# UID and GID 10001, the same pair the backend image runs as -- see
# `backend/Dockerfile` for why a later row's manifests are expected to match
# it.
RUN groupadd --gid 10001 lousydeal \
  && useradd --uid 10001 --gid 10001 --home-dir /nonexistent --no-create-home lousydeal

# The traced tree sits at the workspace root in the standalone output, and is
# placed at `/` here for the same reason as `/app` below: `/` stands in for
# the repository root and `/app` for the `storefront` workspace, so resolution
# from the server is the resolution the build traced.
COPY --from=build /src/storefront/.next/standalone/node_modules /node_modules

# `/app`, matching the reference's convention for a Next.js standalone
# workspace's own output.
WORKDIR /app

COPY --from=build /src/storefront/.next/standalone/storefront ./
# Not traced into the standalone output; Next expects it beside the server.
COPY --from=build /src/storefront/.next/static ./.next/static
# `public/` is not traced into the standalone output either, and V13 is the row
# the note above anticipated: it adds `public/fonts/`, the two unmodified IBM
# Plex Mono TTFs that `src/app/opengraph-image.tsx` hands to Satori. Without
# this line the social image route throws ENOENT at runtime and `next build`
# says nothing, because the file it reads is read on the first request.
COPY --from=build /src/storefront/public ./public

RUN mkdir -p /app/.next/cache && chown 10001:10001 /app/.next/cache

# Every package manager is removed from the image that ships, because this
# image runs none of them: the command is `node server.js` (`CMD` below), and
# a later row's manifests are expected to declare neither `command:` nor
# `args:` beyond that. Everything a package manager was needed for happened in
# the build stage above, which is a different image.
#
# npm is removed rather than upgraded because it is not needed at all, and
# what is not in the image cannot be a finding: the base image's npm vendors
# its own dependency tree -- `tar` 7.5.15, confirmed by reading
# `/usr/local/lib/node_modules/npm/node_modules/tar/package.json` inside this
# exact base image -- and that tree is not described by `package-lock.json`.
# corepack and yarn go with it for the same reason: each carries a vendored
# tree this repository does not govern and has no use for.
#
# The `test` before the removal and the `!` after it keep it honest across a
# base image change: the build fails if these were not where it expects them,
# and fails if any survived. `scripts/images.test.ts` holds this file to
# carrying the removal at all.
RUN test -x /usr/local/bin/npm && test -x /usr/local/bin/corepack \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
    /usr/local/lib/node_modules/corepack /usr/local/bin/corepack \
    /opt/yarn-v* /usr/local/bin/yarn /usr/local/bin/yarnpkg \
  && ! command -v npm && ! command -v npx && ! command -v corepack \
  && ! command -v yarn && ! command -v yarnpkg \
  && command -v node

USER 10001:10001

EXPOSE 3000

# A later row's manifests are expected to express what this container runs
# with `args:`, the same way the backend image's are -- and the `node` base
# image ships its own `ENTRYPOINT`, which would prefix whatever they say.
ENTRYPOINT []
CMD ["node", "server.js"]
