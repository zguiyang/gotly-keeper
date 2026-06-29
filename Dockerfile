# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

FROM base AS deps
COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN HUSKY=0 pnpm install --frozen-lockfile || true \
  && pnpm approve-builds --all \
  && HUSKY=0 pnpm install --frozen-lockfile

FROM base AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
ARG DATABASE_URL
ARG REDIS_URL
ARG REDIS_KEY_PREFIX
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG AI_GATEWAY_API_KEY
ARG AI_GATEWAY_URL
ARG AI_MODEL_NAME
ARG AI_EMBEDDING_MODEL_NAME
ARG AI_EMBEDDING_DIMENSIONS
ARG RESEND_KEY
ARG GITHUB_CLIENT_ID
ARG GITHUB_CLIENT_SECRET
RUN HUSKY=0 pnpm install --frozen-lockfile || true \
  && pnpm approve-builds --all \
  && HUSKY=0 pnpm install --frozen-lockfile
RUN --mount=type=secret,id=app_env,required=false,target=/run/secrets/app_env \
  sh -ac 'if [ -f /run/secrets/app_env ]; then set -a && . /run/secrets/app_env && set +a; fi; \
    export DATABASE_URL="$DATABASE_URL" \
      REDIS_URL="$REDIS_URL" \
      REDIS_KEY_PREFIX="$REDIS_KEY_PREFIX" \
      BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
      BETTER_AUTH_URL="$BETTER_AUTH_URL" \
      AI_GATEWAY_API_KEY="$AI_GATEWAY_API_KEY" \
      AI_GATEWAY_URL="$AI_GATEWAY_URL" \
      AI_MODEL_NAME="$AI_MODEL_NAME" \
      AI_EMBEDDING_MODEL_NAME="$AI_EMBEDDING_MODEL_NAME" \
      AI_EMBEDDING_DIMENSIONS="$AI_EMBEDDING_DIMENSIONS" \
      RESEND_KEY="$RESEND_KEY" \
      GITHUB_CLIENT_ID="$GITHUB_CLIENT_ID" \
      GITHUB_CLIENT_SECRET="$GITHUB_CLIENT_SECRET"; \
    pnpm build && pnpm worker:build'

FROM base AS worker-migrate-deps
COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN node -e "const fs=require('node:fs'); const root=require('./package.json'); const deps=['dotenv','drizzle-kit','drizzle-orm','pg']; const pkg={name:'gotly-keeper-worker-migrate',private:true,dependencies:Object.fromEntries(deps.map((name)=>[name,root.dependencies[name]]))}; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')" \
  && HUSKY=0 pnpm install --prod --no-frozen-lockfile || true \
  && pnpm approve-builds --all \
  && HUSKY=0 pnpm install --prod --no-frozen-lockfile

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

COPY --from=builder /app/dist-workers ./dist-workers
COPY --from=worker-migrate-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/scripts/load-env.ts ./scripts/load-env.ts
COPY --from=builder /app/server/lib/db/schema.ts ./server/lib/db/schema.ts

USER nextjs

CMD ["node", "dist-workers/run-workers.cjs"]
