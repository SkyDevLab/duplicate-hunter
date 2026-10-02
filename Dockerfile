FROM node:20-alpine AS base
WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/config/package*.json ./packages/config/
COPY packages/similarity/package*.json ./packages/similarity/
COPY packages/ai/package*.json ./packages/ai/
COPY packages/github/package*.json ./packages/github/
COPY packages/database/package*.json ./packages/database/
COPY apps/web/package*.json ./apps/web/
COPY apps/github-app/package*.json ./apps/github-app/

RUN npm install

COPY . .

# Build all packages
RUN npm run build --workspaces --if-present

# Runner for Next.js Web App
FROM node:20-alpine AS runner-web
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app ./
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=apps/web"]

# Runner for GitHub App Bot
FROM node:20-alpine AS runner-bot
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app ./
EXPOSE 3001
CMD ["npm", "run", "start", "--workspace=apps/github-app"]
