import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  user,
  account,
  session,
  authAuditEvent,
  role,
  permission,
  rolePermission,
  userRole,
} from "./auth-schema";
import type { KeycloakIdentity } from "./keycloak-identity";
import { keycloakRolePermissions } from "../services/keycloak-permissions";
export function createKeycloakIdentityRepository(database: PostgresJsDatabase) {
  return {
    async synchronize(identity: KeycloakIdentity) {
      return database.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${identity.accountId}, 19))`,
        );
        const [existing] = await tx
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
          })
          .from(account)
          .innerJoin(user, eq(account.userId, user.id))
          .where(
            and(
              eq(account.providerId, "keycloak"),
              eq(account.accountId, identity.accountId),
            ),
          );
        const [local] = existing
          ? await tx
              .update(user)
              .set({
                name: identity.name,
                enabled: true,
                updatedAt: new Date(),
              })
              .where(eq(user.id, existing.id))
              .returning()
          : await tx
              .insert(user)
              .values({
                name: identity.name,
                email: identity.technicalEmail,
                enabled: true,
              })
              .returning();
        if (!existing)
          await tx.insert(account).values({
            providerId: "keycloak",
            accountId: identity.accountId,
            userId: local.id,
          });
        const [assigned] = await tx
          .insert(role)
          .values({ name: identity.role })
          .onConflictDoUpdate({
            target: role.name,
            set: { name: identity.role },
          })
          .returning();
        for (const name of keycloakRolePermissions[identity.role]) {
          const [grant] = await tx
            .insert(permission)
            .values({ name })
            .onConflictDoUpdate({ target: permission.name, set: { name } })
            .returning();
          await tx
            .insert(rolePermission)
            .values({ roleId: assigned.id, permissionId: grant.id })
            .onConflictDoNothing();
        }
        const previous = await tx
          .select({ roleId: userRole.roleId })
          .from(userRole)
          .where(eq(userRole.userId, local.id));
        await tx.delete(userRole).where(eq(userRole.userId, local.id));
        await tx
          .insert(userRole)
          .values({ userId: local.id, roleId: assigned.id });
        if (
          !existing ||
          existing.name !== identity.name ||
          previous.length !== 1 ||
          previous[0].roleId !== assigned.id
        )
          await tx.insert(authAuditEvent).values({
            actorId: local.id,
            userId: local.id,
            operation: existing
              ? "user.keycloak_access_synced"
              : "user.keycloak_provisioned",
            result: "success",
          });
        return local;
      });
    },
    async principal(userId: string) {
      const [result] = await database
        .select({
          id: user.id,
          accountId: account.id,
          identityKey: account.accountId,
        })
        .from(user)
        .innerJoin(account, eq(account.userId, user.id))
        .where(and(eq(user.id, userId), eq(account.providerId, "keycloak")));
      return result ?? null;
    },
    async revoke(userId: string) {
      await database.transaction(async (tx) => {
        await tx.delete(session).where(eq(session.userId, userId));
        await tx.insert(authAuditEvent).values({
          actorId: userId,
          userId,
          operation: "session.keycloak_revoked",
          result: "success",
        });
      });
    },
  };
}
