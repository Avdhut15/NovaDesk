FROM oven/bun:1-alpine AS base

# ─── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy package management files
COPY package.json bun.lock ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies (frozen lockfile ensures reproducibility)
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Generate Prisma Client
RUN cd server && bunx prisma generate

# Build the frontend (Vite React app)
RUN cd client && bun run build

# ─── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy built frontend assets
COPY --from=builder /app/client/dist ./client/dist

# Copy server files and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./package.json

# Copy the entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose the single port Express will run on
EXPOSE 3001

# Run the entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]
