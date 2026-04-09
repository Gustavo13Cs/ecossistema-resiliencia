# Estágio de Build
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copia apenas os arquivos de dependências primeiro (otimiza cache)
COPY package*.json ./
RUN npm install

# Copia o restante dos arquivos e gera o build do NestJS
COPY . .
RUN npm run build

# Estágio de Produção/Execução
FROM node:20-alpine

WORKDIR /usr/src/app

# Copia apenas o necessário do estágio anterior
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package*.json ./

# Expõe a porta que a sua API usa (geralmente 3000)
EXPOSE 3000

CMD ["node", "dist/main"]