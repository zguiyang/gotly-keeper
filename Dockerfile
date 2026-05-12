# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.32.0 --activate

FROM base AS deps
COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN HUSKY=0 pnpm install --frozen-lockfile || true \
  && pnpm approve-builds --all \
  && HUSKY=0 pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=secret,id=app_env,target=/run/secrets/app_env \
  sh -ac 'set -a && . /run/secrets/app_env && set +a && pnpm build && pnpm worker:build'

FROM base AS prod-deps
COPY --from=deps /app/node_modules ./node_modules
COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN node -e "const fs=require('node:fs'); const pkg=require('./package.json'); delete pkg.scripts.prepare; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')" \
  && pnpm prune --prod

FROM node:22-alpine AS web-runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

FROM node:22-alpine AS worker-runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist-workers ./dist-workers
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/scripts/load-env.ts ./scripts/load-env.ts
COPY --from=builder /app/server/lib/db/schema.ts ./server/lib/db/schema.ts

USER nextjs

CMD ["node", "dist-workers/run-workers.cjs"]
