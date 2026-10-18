FROM node:20-alpine

WORKDIR /app

# Instalar dependencias necesarias para compilar Prisma y bcrypt en alpine
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# Compilar la aplicación
RUN npm run build

EXPOSE 3000

# Comando para ejecutar la app
CMD ["npm", "run", "start"]
