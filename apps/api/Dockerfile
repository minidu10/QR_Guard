# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# 1. Install all dependencies and build.
FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/api ./apps/api
# Installing also runs "prisma generate" (postinstall).
RUN pnpm install --frozen-lockfile --filter api...
RUN pnpm --filter api... build
# Copy only production dependencies (+ dist, prisma folder) into /prod/api.
RUN pnpm --filter api deploy --legacy --prod /prod/api

# 2. Small runtime image.
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder --chown=node:node /prod/api ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health || exit 1
# Apply any new database migrations, then start the API.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
