# Debian-based Node runtime (glibc) to support bcrypt prebuilt binaries
FROM node:20-bullseye-slim

# Install curl and build tools (python3, make, g++) for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps
COPY package*.json ./
# Prefer deterministic installs; fall back if lock not present
RUN npm ci || npm i
RUN npm rebuild bcrypt --build-from-source

# Copy source
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start API
CMD ["node", "server.js"]
