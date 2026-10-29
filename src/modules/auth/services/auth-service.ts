import { genericOAuth, keycloak } from "better-auth/plugins/generic-oauth";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../models/auth-schema";
import { createAuthRepository } from "../models/auth-repository";
import { keycloakAccountId } from "./keycloak-config";
import { canAccess } from "./access-service";
import type { parseAuthEnvironment } from "@/shared/lib/env";

export function createAuthService(
  database: PostgresJsDatabase,
  env: ReturnType<typeof parseAuthEnvironment>,
) {
  const repository = createAuthRepository(database);
  return betterAuth({
    appName: "DSI Panel",
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_URL],
    onAPIError: { errorURL: `${env.APP_URL}/login?sso=error` },
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
      transaction: true,
    }),
    account: {
      encryptOAuthTokens: true,
      accountLinking: { enabled: false, disableImplicitLinking: true },
    },
    plugins: env.keycloak.enabled
      ? [
          genericOAuth({
            config: [
              {
                ...keycloak({
                  issuer: env.keycloak.issuer,
                  clientId: env.keycloak.clientId,
                  clientSecret: env.keycloak.clientSecret,
                  pkce: true,
                  disableSignUp: true,
                  disableImplicitSignUp: true,
                  overrideUserInfo: false,
                  disableProviderLogout: true,
                }),
                requireIdTokenVerification: true,
                accountSubject: ({ profile }) =>
                  keycloakAccountId(
                    env.keycloak.enabled ? env.keycloak.issuer : "",
                    profile.sub,
                  ),
              },
            ],
          }),
        ]
      : [],
    emailAndPassword: { enabled: false, disableSignUp: true },
    session: {
      expiresIn: 60 * 60 * 8,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    user: {
      validateUserInfo: ({ source }) => {
        if (
          source.oauth?.providerId !== "keycloak" ||
          !env.keycloak.enabled ||
          source.oauth.profile?.iss !== env.keycloak.issuer ||
          source.oauth.profile?.email_verified !== true
        )
          return {
            error: "access_denied",
            errorDescription: "Acesso institucional não autorizado.",
          };
      },
      additionalFields: {
        enabled: {
          type: "boolean",
          required: true,
          defaultValue: false,
          input: false,
        },
      },
    },
    advanced: {
      cookiePrefix: "dsi-panel",
      database: { generateId: "uuid" },
      useSecureCookies: env.APP_URL.startsWith("https://"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      // Não confiar em cabeçalhos de IP enviados diretamente pelo cliente.
      ipAddress: { disableIpTracking: true },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/social": { window: 60, max: 5 },
        "/callback/keycloak": { window: 60, max: 10 },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (data) => {
            if (
              !canAccess(
                await repository.getPrincipal(data.userId),
                "dashboard:read",
              )
            ) {
              await repository.record(data.userId, "session.denied", "denied");
              throw new APIError("UNAUTHORIZED", {
                message: "Acesso não autorizado.",
              });
            }
          },
          after: async (data) => {
            await repository.record(data.userId, "session.created");
          },
        },
        delete: {
          after: async (data) => {
            await repository.record(data.userId, "session.revoked");
          },
        },
      },
    },
    logger: {
      level: "error",
      log: (level) => {
        console.error(JSON.stringify({ event: "auth.internal_error", level }));
      },
    },
  });
}
