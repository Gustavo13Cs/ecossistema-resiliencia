FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:22-alpine AS production

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

EXPOSE 3001
CMD ["npm", "start"]