FROM node:20-alpine

WORKDIR /usr/src/app

# Copia os arquivos de dependência da API
COPY api/package*.json ./api/

# Entra na pasta e instala
RUN cd api && npm install

# Copia o resto do código da API
COPY api/ ./api/

# Define a pasta de trabalho como a da API para rodar os comandos
WORKDIR /usr/src/app/api

# Gera o Prisma
RUN npx prisma generate

EXPOSE 3000

# Roda o NestJS em modo de desenvolvimento
CMD ["npm", "run", "start:dev"]