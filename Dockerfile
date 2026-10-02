FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY api/package*.json ./
RUN npm ci

COPY api/ ./

RUN DIRECT_URL=postgresql://localhost:5432/build npx prisma generate
RUN npm run build

FROM builder AS migration
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM node:22-alpine AS runtime-dependencies
WORKDIR /usr/src/app
COPY api/package*.json ./
# Prisma CLI e TypeScript são peers opcionais do client; também ficam fora do runtime.
RUN npm ci --omit=dev --omit=optional

FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --chown=node:node --from=runtime-dependencies /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node --from=runtime-dependencies /usr/src/app/package*.json ./
USER node

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
