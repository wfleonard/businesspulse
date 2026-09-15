# syntax=docker/dockerfile:1

# --- deps: install all dependencies (incl. dev, for build + migrations) ---
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile the Next.js standalone bundle ---
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* vars are inlined at build time.
ARG NEXT_PUBLIC_APP_URL=https://businesspulse.app
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
# This stage retains devDependencies + source, so it doubles as the migrate/seed
# runner: `docker compose --profile tools run --rm migrate`.

# --- runner: minimal production image ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# --- worker: AEO snapshot worker (Node + the PHP Visibility Panel) ---
# Based on `build` for its dependencies and tsx. Both PHP test suites run here:
# Debian ships PHP 8.2 and the panel was developed on 8.5, so an incompatibility
# fails the image build instead of the first real run. php-sqlite3 is only for
# the smoke suite; job mode never touches SQLite.
FROM build AS worker
RUN apt-get update \
  && apt-get install -y --no-install-recommends php-cli php-curl php-mbstring php-sqlite3 \
  && rm -rf /var/lib/apt/lists/*
RUN php panel/tests/smoke.php && php panel/tests/job.php
ENV NODE_ENV=production
RUN groupadd --system --gid 1002 aeo \
  && useradd --system --uid 1002 --gid aeo aeo
USER aeo
CMD ["node", "--import", "tsx", "src/worker/index.ts"]
