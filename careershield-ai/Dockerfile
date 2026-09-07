# Multi-stage Dockerfile for CareerShield AI
# Stage 1: Build Vite frontend
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY server/ ./server/
COPY src/lib/ ./src/lib/
COPY --from=builder /app/dist ./dist

EXPOSE 8787

CMD ["node", "server.js"]
