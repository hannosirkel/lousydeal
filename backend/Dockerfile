# The Medusa backend image: the API and the predeploy migration Job both run
# from this one image (`args:` in `deploys` selects which -- not written yet,
# T13).
#
# Build context is the **repository root**, not `backend/` -- this is an npm
# workspace and the dependency tree it installs is the one `package-lock.json`
# at the root describes:
#
#     podman build --file backend/Dockerfile .
#
# The ignore-file for this build is `backend/Dockerfile.dockerignore`. That
# name is not decorative: with a context of `.`, this repository's builders --
# verified against podman 5.4.2 / buildah 1.39.3 only, and T12 will exercise a
# different one, which is the builder this claim needs to hold for -- read
# `<dockerfile>.dockerignore` beside the Dockerfile, and would never look at a
# `.dockerignore` inside `backend/`. See `scripts/images.test.ts`.
#
# ## Nothing environment-specific is baked in
#
# There is no `ARG` in this file, and every `ENV` it sets is identical in every
# environment. The synthetic values on the `medusa build` line below exist only
# because `medusa-config.ts` reads its configuration at module scope and the
# compiler loads it; they are inline on the `RUN` instruction, so they are not
# `ENV`, do not persist into any layer, and are not what the running container
# reads. `src/config/runtime.ts` re-reads all of it from `process.env` at
# start-up, from whatever later projects the Secrets.

# node:24.18.1-trixie-slim
FROM node:24.20.0-trixie-slim@sha256:50c3b2f6988dfc307b86e5301d69611af31f4789bdf232863b07d3b02fe55ae0 AS build

WORKDIR /src

# The manifests first, so the install layer is cached against them rather than
# against the source. All three are needed even for a single workspace: npm
# reads every workspace's `package.json` before it resolves anything.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY storefront/package.json storefront/package.json

RUN npm ci --workspace backend --include-workspace-root

COPY backend/ backend/

# `medusa build` compiles `src/` and `medusa-config.ts` into `.medusa/server`
# and builds the Admin bundle into `.medusa/server/public`. It evaluates the
# config to do it, which is why the required variables are supplied here.
#
# Every value below is a placeholder and none of them can reach a request:
# `postgres://build:build@127.0.0.1:5432/build` points at the build
# container's own loopback, `redis.example.test` is an RFC 2606 reserved name
# that resolves to nothing, and the secrets are the literal word `build`.
# `MEDUSA_DISABLE_TELEMETRY` and `XDG_CONFIG_HOME` keep the compiler from
# phoning home from, or writing outside, a build.
#
# This list is exactly what `readBackendRuntimeConfig`
# (`backend/src/config/runtime.ts`) requires: `DATABASE_URL`, `JWT_SECRET`,
# `COOKIE_SECRET`, the three `REDIS_*`, and the two required Stripe values --
# `STRIPE_PAYMENT_METHOD_CONFIGURATION_ID` is read through `optionalEnv` and
# is deliberately absent here for the same reason. No `STORE_CORS`,
# `ADMIN_CORS` or `AUTH_CORS`: `runtime.ts` does not read them, and Medusa
# itself defaults all three when unset.
RUN NODE_ENV=production \
  DATABASE_URL=postgres://build:build@127.0.0.1:5432/build \
  JWT_SECRET=build \
  COOKIE_SECRET=build \
  REDIS_HOST=redis.example.test \
  REDIS_PORT=6379 \
  REDIS_PASSWORD=build \
  STRIPE_SECRET_KEY=build \
  STRIPE_WEBHOOK_SECRET=whsec_build \
  MEDUSA_DISABLE_TELEMETRY=true \
  XDG_CONFIG_HOME=/tmp/medusa-build-config \
  npm run build --workspace backend

# The runtime dependency tree, resolved from the same lockfile with the
# development half omitted. It is installed in its own stage so that no
# compiler, no `@swc`, no `typescript` and no build cache reaches the image
# that ships.
# node:24.18.1-trixie-slim
FROM node:24.20.0-trixie-slim@sha256:50c3b2f6988dfc307b86e5301d69611af31f4789bdf232863b07d3b02fe55ae0 AS runtime-dependencies

WORKDIR /src

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY storefront/package.json storefront/package.json

RUN npm ci --omit=dev --workspace backend --include-workspace-root

# esbuild is deleted from the runtime tree, because it is a build tool that
# ships a compiled Go standard library and nothing in the runtime path calls
# it.
#
# It is here at all as a *production* transitive dependency, so `--omit=dev`
# does not remove it (measured with `npm ls esbuild --workspace backend --all`
# against this repository's own tree):
#
#     @medusajs/medusa -> @medusajs/admin-bundler -> vite 5.4.21
#       -> esbuild 0.21.5 -> @esbuild/linux-x64 (bin/esbuild, a Go binary)
#
# `@medusajs/admin-bundler` exports four entry points. Three of them --
# `build`, `develop` and `plugin` -- `await import("vite")`, and all three are
# build-time commands that run in the `build` stage above, never here. The
# fourth, `serve`, is the only one `medusa start` reaches: the framework's
# admin loader calls it for every non-development `NODE_ENV`, and it is
# `compression`, `express`, `fs` and `path` serving the pre-built bundle out
# of `.medusa/server/public`. Because the vite imports are dynamic and inside
# those three functions, loading `@medusajs/admin-bundler` does not load vite,
# and nothing loads esbuild.
#
# The two halves below are a removal and an assertion, and they are separate
# on purpose, because a removal by name can only ever delete what it was told
# to look for.
#
# The `find … -exec rm -rf` is the removal. It matches on names, and it is
# allowed to match nothing: a future dependency tree that has dropped esbuild
# is a clean tree, not a build failure, so this must not insist the package
# was there.
#
# The `test -z` is the assertion, and it is what the removal is actually held
# to. It looks for what a vulnerability scanner looks for rather than for a
# name: `Go buildinf:` is the ASCII part of the build-information magic that
# Go stamps into every binary it links. `-a` is load-bearing rather than
# tidiness -- without it, whether a binary file can match at all is left to
# the grep implementation's own heuristics, and an implementation that treats
# binary files as non-matching would report nothing while the binary ships.
# `scripts/images.test.ts` holds this file to carrying both halves.
RUN find . -depth \( -name esbuild -o -name '@esbuild' \) -exec rm -rf {} + \
  && test -z "$(find . -type f \( -perm -u+x -o -size +1M \) \
       -exec grep -la 'Go buildinf:' {} + 2>/dev/null)"

# node:24.18.1-trixie-slim
FROM node:24.20.0-trixie-slim@sha256:50c3b2f6988dfc307b86e5301d69611af31f4789bdf232863b07d3b02fe55ae0 AS runtime

LABEL org.opencontainers.image.description="Lousy Deal Medusa backend"
LABEL org.opencontainers.image.licenses=UNLICENSED

ENV NODE_ENV=production
# `medusa start` runs under `npm run`, and npm wants somewhere to put a cache
# and a crash log. A later row gives this container a read-only root
# filesystem, so npm is pointed at `/tmp` rather than at a `$HOME` it cannot
# create.
ENV HOME=/tmp
ENV npm_config_cache=/tmp/.npm
ENV npm_config_update_notifier=false
ENV MEDUSA_DISABLE_TELEMETRY=true

# npm is upgraded, in the image that ships, because it is this image's
# entrypoint and it carries its own vendored dependency tree. The base image's
# npm 11.16.0 vendors `tar` 7.5.15 (confirmed by reading
# `/usr/local/lib/node_modules/npm/node_modules/tar/package.json` inside this
# exact base image); 11.18.0 is the first npm 11 whose vendored `tar` fixes
# that, and 11.19.0 -- confirmed to exist on the registry -- is the newest
# npm 11, carrying everything fixed between the two. The major is deliberately
# unchanged from the base image's own 11.16.0, so `npm run` behaves exactly as
# it did.
#
# Pinned exactly, never a range: a floating package manager would make two
# builds of one source revision differ, which is the property the whole
# rebuild-live-from-source argument rests on. `scripts/images.test.ts` refuses
# any `npm install` in either Dockerfile that is not exactly this shape.
#
# The cache goes in the same layer that creates it: `npm_config_cache` above
# points npm at `/tmp/.npm`, which is right at run time and wrong here.
RUN npm install --global npm@11.19.0 \
  && rm -rf /tmp/.npm /tmp/node-compile-cache

# corepack and yarn go, and only npm and node stay. npm stays because it is
# this image's entrypoint (`CMD` below, and every later `args:` this image is
# given, is `npm run <script>`). corepack and yarn are not invoked anywhere in
# this repository, and each carries its own vendored dependency tree that
# `package-lock.json` does not describe and no `overrides` entry here governs
# -- exactly the shape of finding npm's own vendored `tar` already is.
#
# `command -v npm` at the end is the difference between this instruction and
# the storefront's: a removal that took npm with it must fail here rather than
# in a crash-looping container whose command no longer resolves.
RUN test -x /usr/local/bin/corepack \
  && rm -rf /usr/local/lib/node_modules/corepack /usr/local/bin/corepack \
    /opt/yarn-v* /usr/local/bin/yarn /usr/local/bin/yarnpkg \
  && ! command -v corepack && ! command -v yarn && ! command -v yarnpkg \
  && command -v npm && command -v node

# UID and GID 10001. A later row's manifests are expected to run this image
# with a matching `runAsUser`/`runAsGroup`/`fsGroup` and `runAsNonRoot: true`;
# this makes the image refuse to run as root on its own, so a bare `podman
# run` behaves the same way a cluster will.
RUN groupadd --gid 10001 lousydeal \
  && useradd --uid 10001 --gid 10001 --home-dir /nonexistent --no-create-home lousydeal

# The one dependency tree `npm ci --omit=dev --workspace backend
# --include-workspace-root` (`:88`) produces for this repository hoists to a
# single workspace-level `node_modules` -- confirmed by `ls backend/node_modules`
# reporting nothing after that exact install, unlike the reference
# implementation, whose conflicting transitive versions force a second, nested
# tree under its own backend workspace. One copy is therefore enough here.
# "Workspace-level" and not "flat": the tree still nests where a version
# conflict forces it, for example `/node_modules/@medusajs/admin-bundler/node_modules/vite`.
#
# `--chown=10001:10001`, not a root-owned tree with a handful of directories
# chowned after the fact: `medusa db:migrate` -- the predeploy Job's own
# command, not the API's -- creates a `dist/migrations` directory *inside the
# package tree* the first time each module with no migrations table runs,
# one `mkdir` per module (`@medusajs/modules-sdk/dist/medusa-app.js`'s
# `applyMigration`). A root-owned copy makes every one of those `mkdir`s
# EACCES under the non-root UID this image runs as -- measured as nine
# failures across `payment-stripe`, `auth-emailpass`, `fulfillment-manual`,
# `notification-local`, `cache-inmemory`, `event-bus-redis`, `locking` and
# `file`, and `medusa db:migrate` exiting 1. The set of modules that create
# one is not fixed here, in this file or in Medusa's own source, and a
# module added later would need a directory this Dockerfile did not know to
# chown; owning the copy at the one COPY instruction that produces it costs
# one flag and does not need updating when the module list does. `fsGroup`
# cannot substitute: it applies to mounted volumes, not to a layer already
# baked into the image.
COPY --from=runtime-dependencies --chown=10001:10001 /src/node_modules /node_modules

# `/app`, matching the reference's convention for where a Medusa backend
# workspace's compiled output lands, and load-bearing for one reason already
# proven rather than assumed: the `redis:preflight` script's own guard,
# `if [ -f ./src/config/redis-preflight.js ]`, is a path relative to the
# working directory, and it resolves only when that directory is
# `.medusa/server`'s own root -- which is what gets copied here. See
# `backend/src/config/redis-preflight.ts:1-5`.
WORKDIR /app

COPY --from=build /src/backend/.medusa/server ./

RUN mkdir -p /app/static && chown 10001:10001 /app/static

USER 10001:10001

EXPOSE 9000

# **Recorded for the row that routes to this image, not fixed here.** The
# Admin bundle `@medusajs/admin-bundler` serves is live on this same port:
# `/app` answers 200 on the image this row built, same as `/health`. Not a
# breach by itself -- the plan forbids a public *hostname* for the Admin, and
# Q8 sanctions shipping the bundle in this image -- but nothing in this
# repository yet asserts that whatever routes traffic to this container
# excludes `/app` from what a public hostname reaches. The row that writes
# that routing owns closing this.
#
# **Also recorded, not fixed here.** `CMD`'s `npm run start` runs `npm` as
# PID 1, and `npm` does not forward `SIGTERM` to the child it spawns: a
# trapped child inside it never receives the signal, and the container exits
# 1 on a normal `podman stop`/pod termination, not 0 and not 143 (measured
# against this image; not an artifact of the `&&` in `start`'s script --a
# single-command `start` behaves identically). No graceful shutdown happens
# on any ordinary termination. This is a manifest-level problem -- an
# `initContainer`, a different PID 1, or a signal-forwarding wrapper -- and
# belongs to whichever row writes the Pod spec this image runs in (T13).
#
# A later row's manifests are expected to select what this image does with
# `args:` the same way the reference's do -- `[npm, run, start]` for the API,
# `[npm, run, predeploy]` for the migration Job. Kubernetes `args` replaces
# `CMD` and leaves `ENTRYPOINT` **prefixed**, so an entrypoint would turn
# either into an argument list for something else.
#
# The `node` base image ships `ENTRYPOINT ["docker-entrypoint.sh"]`, a wrapper
# that prepends `node` when any of three conditions holds for the first
# argument (`/usr/local/bin/docker-entrypoint.sh:6` in this base image): it
# looks like a flag, `command -v` cannot resolve it, or it names a file that
# exists but is not executable. The second is the one `args:` could actually
# trip -- an `args:` entry naming something this image's `PATH` does not
# resolve, not one that merely starts with `-`. It is cleared rather than
# tolerated: whatever runs this container should say the whole of what it
# runs, not have this image prepend to it.
ENTRYPOINT []
CMD ["npm", "run", "start"]
