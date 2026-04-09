FROM node:20-alpine

WORKDIR /usr/src/app/web

# Copia apenas os arquivos do frontend
COPY package*.json ./

# Instala as dependências forçando ignorar conflitos de versão do React 19
RUN npm install --legacy-peer-deps

# Copia o resto do código do frontend
COPY . .

EXPOSE 3000

# Roda o Next.js em modo de desenvolvimento
CMD ["npm", "run", "dev"]