FROM node:24.14.0-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24.14.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=10000 AGENTVAULT_DATA_DIR=/home/node/agentvault-data
COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node . .
RUN mkdir -p /home/node/agentvault-data && chown node:node /home/node/agentvault-data
USER node
EXPOSE 10000
CMD ["node", "scripts/hosted.js"]
