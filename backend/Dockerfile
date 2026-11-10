FROM node:20-alpine AS builder
# Install build tools and dependencies (including dev) for building
WORKDIR /app

COPY package*.json ./
# Install all dependencies (dev + prod) to build the TypeScript code
RUN npm ci && npm cache clean --force

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune devDependencies to keep only production packages for runtime
RUN npm prune --production

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/src/server.js"]

