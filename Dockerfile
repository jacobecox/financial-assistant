# syntax=docker/dockerfile:1

FROM node:23-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:23-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Env vars are injected at runtime via Control Plane workload config;
# provide placeholders so Next.js can build without real values.
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
RUN npm run build

FROM node:23-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy the standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
