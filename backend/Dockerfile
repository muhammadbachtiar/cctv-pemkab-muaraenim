# ─────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies terlebih dahulu (cache layer)
COPY package*.json ./
RUN npm install

# Copy seluruh source code
COPY . .

# Generate Prisma Client (MySQL/MariaDB built-in connector)
RUN npx prisma generate

# Build NestJS
RUN npm run build

# ─────────────────────────────────────────
# Stage 2: Production Runner
# ─────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy build artifacts dari stage 1
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.js ./prisma.config.js

EXPOSE 3001

# Jalankan migrasi lalu start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
