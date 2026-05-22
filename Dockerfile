FROM node:20-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm install

# Copiar o restante do código
COPY . .

# Build de produção do Next.js
# As variáveis de ambiente devem ser passadas durante o build ou run
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=""

RUN npm run build

# Expor a porta
EXPOSE 3000

# Iniciar o servidor de produção
CMD ["npm", "run", "start"]
