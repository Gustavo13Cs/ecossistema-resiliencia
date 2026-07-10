FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY api/package*.json ./
RUN npm ci

COPY api/ ./

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/package*.json ./

EXPOSE 3000
CMD ["node", "dist/src/main.js"]