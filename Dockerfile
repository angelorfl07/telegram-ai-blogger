FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV TZ=America/Sao_Paulo

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 make g++ ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./

# IMPORTANTE:
# não usar NODE_ENV=production aqui
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Agora remove devDependencies
RUN npm prune --omit=dev

# =========================
# FINAL STAGE
# =========================
FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

RUN mkdir -p /app/storage/images /app/logs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]