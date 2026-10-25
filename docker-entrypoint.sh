#!/bin/sh
set -e

echo "Starting deployment process..."

# Navigate to the server directory where Prisma is located
cd /app/server

# Push the Prisma schema to the database (automatically applies changes)
# We use --accept-data-loss for safe continuous deployment during early stages, 
# but for production you may eventually switch to `bunx prisma migrate deploy`
echo "Running Prisma DB Push..."
bunx prisma db push --accept-data-loss

# Run idempotent seed (creates admin, agent, AI agent, and KB if empty)
echo "Running initial database seed..."
bun run prisma/seed.ts || echo "Seed notice: seed encountered an issue or was skipped, continuing..."

echo "Starting the Express server..."
# Run the backend using Bun
exec bun run src/index.ts
