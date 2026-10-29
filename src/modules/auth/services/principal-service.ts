import type { Principal } from "../models/access-types";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { createAuthRepository } from "../models/auth-repository";
export function createPrincipalService(database: PostgresJsDatabase) {
  const repository = createAuthRepository(database);
  return {
    resolve: (userId: string | undefined) =>
      resolvePrincipal(userId, repository),
  };
}
export async function resolvePrincipal(
  userId: string | undefined,
  repository: { getPrincipal(id: string): Promise<Principal | null> },
) {
  if (!userId) return null;
  const principal = await repository.getPrincipal(userId);
  return principal?.enabled ? principal : null;
}
