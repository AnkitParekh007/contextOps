FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm","run","dev"]
