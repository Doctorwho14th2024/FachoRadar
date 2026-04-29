# ─────────────────────────────────────────
# Stage 1 : build du frontend
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Outils de compilation pour les modules natifs (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# --ignore-scripts évite que postinstall déclenche vite build avant que les sources soient copiées
RUN npm ci --prefer-offline --ignore-scripts

COPY . .

# Recompiler les modules natifs pour Alpine Linux, puis builder le frontend
RUN npm rebuild better-sqlite3 && npm run build

# Supprimer les devDependencies après le build
RUN npm prune --omit=dev

# ─────────────────────────────────────────
# Stage 2 : image de production légère
# ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copier uniquement ce qui est nécessaire depuis le builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/public      ./public

# Copier les fichiers serveur
COPY server.js health.js init-db.js security-check.js ./
COPY package.json ./

# Créer le dossier data avec les bons droits
RUN mkdir -p /app/data && \
    chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]

