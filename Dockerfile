FROM oven/bun:1.4.3 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN bun run lint && bun run typecheck && bun test && bun run build

FROM build AS tools
USER bun
ENTRYPOINT ["bun", "run"]

FROM dependencies AS browser-tests
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN bun --bun playwright install --with-deps chromium
COPY --from=build /app /app
RUN mkdir -p /app/test-results && chown bun:bun /app/test-results
USER bun
CMD ["bun", "run", "test:e2e"]

FROM base AS production-dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS runner
ENV NODE_ENV=production
COPY --from=production-dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/.next ./.next
COPY --from=build --chown=bun:bun /app/public ./public
COPY --from=build --chown=bun:bun /app/package.json ./package.json
COPY --from=build --chown=bun:bun /app/THIRD_PARTY_NOTICES.md ./THIRD_PARTY_NOTICES.md
COPY --from=build --chown=bun:bun /app/next.config.ts ./next.config.ts
COPY --from=build --chown=bun:bun /app/tsconfig.json ./tsconfig.json
COPY --from=build --chown=bun:bun /app/scripts/validate-environment.ts ./scripts/validate-environment.ts
COPY --from=build --chown=bun:bun /app/src/shared/lib/env.ts ./src/shared/lib/env.ts
COPY --from=build --chown=bun:bun /app/src/modules/auth/services/keycloak-config.ts ./src/modules/auth/services/keycloak-config.ts
COPY --from=build --chown=bun:bun /app/src/modules/auth/services/test-access-service.ts ./src/modules/auth/services/test-access-service.ts
USER bun
EXPOSE 3000
CMD ["bun", "run", "start"]


