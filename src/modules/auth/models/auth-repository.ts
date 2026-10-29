import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  authAuditEvent,
  permission,
  rolePermission,
  user,
  userRole,
} from "./auth-schema";

export function createAuthRepository(database: PostgresJsDatabase) {
  return {
    async getPrincipal(userId: string) {
      const [identity] = await database
        .select({ id: user.id, name: user.name, enabled: user.enabled })
        .from(user)
        .where(eq(user.id, userId));
      if (!identity) return null;
      const grants = await database
        .select({ name: permission.name })
        .from(userRole)
        .innerJoin(rolePermission, eq(userRole.roleId, rolePermission.roleId))
        .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
        .where(eq(userRole.userId, userId));
      return { ...identity, permissions: grants.map((grant) => grant.name) };
    },
    async record(userId: string, operation: string, result = "success") {
      await database
        .insert(authAuditEvent)
        .values({ actorId: userId, userId, operation, result });
    },
  };
}
