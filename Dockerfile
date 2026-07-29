# =============================================================================
# ZirveTarım Front — Next.js çok aşamalı Docker imajı (standalone çıktı)
#
# Build bağlamı DEPO KÖKÜDÜR:  docker build .
#
# Monorepo'dan gelen fark: workspace yoktu artık, dolayısıyla tek bir
# package.json kopyalanır ve standalone çıktısı `apps/web` ara dizini olmadan
# doğrudan `.next/standalone` altına düşer.
# =============================================================================

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app

# -----------------------------------------------------------------------------
# deps
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# builder
# -----------------------------------------------------------------------------
FROM base AS builder

# NEXT_PUBLIC_* değişkenleri derleme anında gömülür; build-arg olarak alınır.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ARG NEXT_PUBLIC_SITE_NAME="Zirve Tarım"
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# `/uploads` yönlendirmesinin hedefi DERLEME ANINDA gömülür (next.config.ts).
# Konteyner ağındaki servis adı verilmezse hedef `localhost:4000` olur ve web
# konteynerinin İÇİNDE kendisine işaret eder — ürün görselleri 500 döner.
ARG INTERNAL_API_URL=http://api:4000/api/v1
ENV INTERNAL_API_URL=$INTERNAL_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# -----------------------------------------------------------------------------
# runner
# -----------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# Next.js standalone çıktısı kendi minimal node_modules'ünü içerir.
# `pnpm build` sonunda scripts/sync-standalone.mjs `.next/static`i çıktının
# içine kopyalar; o adım olmadan tüm JS/CSS 404 döner.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
