# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Use --legacy-peer-deps if there are dependency conflicts, but let's try standard first
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package.json ./

EXPOSE 8800

# Next.js production server
CMD ["npm", "start"]
