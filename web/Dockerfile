FROM node:22-alpine AS builder

WORKDIR /usr/src/app
ARG INTERNAL_API_URL=http://api:3000
ENV INTERNAL_API_URL=${INTERNAL_API_URL}

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:22-alpine AS production

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

WORKDIR /usr/src/app

COPY --chown=node:node --from=builder /usr/src/app/.next/standalone ./
COPY --chown=node:node --from=builder /usr/src/app/.next/static ./.next/static
COPY --chown=node:node --from=builder /usr/src/app/public ./public
USER node

EXPOSE 3001
CMD ["node", "server.js"]
