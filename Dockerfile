# syntax=docker/dockerfile:1.7
FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.0 --activate

COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN HUSKY=0 pnpm install --frozen-lockfile || true \
  && pnpm approve-builds --all \
  && HUSKY=0 pnpm install --frozen-lockfile

COPY . .
RUN --mount=type=secret,id=app_env,target=/run/secrets/app_env \
  sh -ac 'set -a && . /run/secrets/app_env && set +a && pnpm build'

EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
