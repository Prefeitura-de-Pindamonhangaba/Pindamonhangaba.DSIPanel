# syntax=docker/dockerfile:1
FROM oven/bun:1.4.4 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json bun.lock ./
RUN --mount=type=cache,id=dsi-bun,target=/root/.bun/install/cache,sharing=locked bun install --frozen-lockfile

# Só arquivos usados pela aplicação invalidam a compilação.
FROM dependencies AS source
COPY tsconfig.json next-env.d.ts next.config.ts ./
COPY src ./src
COPY public ./public

# Ferramentas e testes não dependem da compilação de produção.
FROM source AS tools
COPY scripts ./scripts
COPY --chown=bun:bun drizzle ./drizzle
COPY tests ./tests
COPY drizzle.config.ts bunfig.toml eslint.config.mjs playwright.config.ts ./
RUN chown bun:bun /app
USER bun
ENTRYPOINT ["bun", "run"]

FROM tools AS checks
RUN bun run lint && bun run typecheck && bun test

# O navegador só é instalado quando as dependências mudam.
FROM dependencies AS browser-dependencies
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN --mount=type=cache,id=dsi-apt,target=/var/cache/apt,sharing=locked bun --bun playwright install --with-deps chromium

FROM browser-dependencies AS browser-tests
COPY --from=tools /app /app
RUN mkdir -p /app/test-results && chown bun:bun /app/test-results
USER bun
CMD ["bun", "run", "test:e2e"]

FROM source AS build
ENV NODE_ENV=production
RUN --mount=type=cache,id=dsi-next,target=/app/.next/cache bun run build

FROM source AS validation
COPY scripts/validate-environment.ts ./scripts/validate-environment.ts
RUN bun build --target=bun --minify --outfile=/app/validate-environment.js ./scripts/validate-environment.ts

FROM base AS runner
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=bun:bun /app/.next/standalone ./
COPY --from=build --chown=bun:bun /app/.next/static ./.next/static
COPY --from=source --chown=bun:bun /app/public ./public
COPY --chown=bun:bun THIRD_PARTY_NOTICES.md ./
COPY --from=validation --chown=bun:bun /app/validate-environment.js ./validate-environment.js
USER bun
EXPOSE 3000
CMD ["sh", "-c", "bun validate-environment.js && exec bun server.js"]
