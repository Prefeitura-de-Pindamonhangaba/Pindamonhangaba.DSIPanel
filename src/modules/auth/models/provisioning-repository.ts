import { and, count, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  account,
  authAuditEvent,
  permission,
  role,
  rolePermission,
  session,
  user,
  userRole,
} from "./auth-schema";
import type { Role } from "./access-types";

export function createProvisioningRepository(database: PostgresJsDatabase) {
  return {
    async transaction<T>(
      work: (repository: ProvisioningTransaction) => Promise<T>,
    ) {
      return database.transaction(async (tx) => {
        // Serializa o bootstrap e impede duas primeiras contas concorrentes.
        await tx.execute(sql`select pg_advisory_xact_lock(57300421)`);
        const repository: ProvisioningTransaction = {
          async countUsers() {
            const [row] = await tx.select({ value: count() }).from(user);
            return row.value;
          },
          async hasAdmin(userId) {
            const [row] = await tx
              .select({ id: user.id })
              .from(user)
              .innerJoin(userRole, eq(user.id, userRole.userId))
              .innerJoin(role, eq(userRole.roleId, role.id))
              .where(
                and(
                  eq(user.id, userId),
                  eq(user.enabled, true),
                  eq(role.name, "admin"),
                ),
              );
            return Boolean(row);
          },
          async countAdmins() {
            const [row] = await tx
              .select({ value: count() })
              .from(user)
              .innerJoin(userRole, eq(user.id, userRole.userId))
              .innerJoin(role, eq(userRole.roleId, role.id))
              .where(and(eq(user.enabled, true), eq(role.name, "admin")));
            return row.value;
          },
          async provision(input) {
            const [created] = await tx
              .insert(user)
              .values({
                name: input.name,
                email: input.email,
                emailVerified: true,
                enabled: true,
              })
              .returning({ id: user.id });
            const [assignedRole] = await tx
              .insert(role)
              .values({ name: input.role })
              .onConflictDoUpdate({
                target: role.name,
                set: { name: input.role },
              })
              .returning({ id: role.id });
            const grants =
              input.role === "admin"
                ? ["dashboard:read", "users:manage", "integrations:manage"]
                : ["dashboard:read"];
            for (const name of grants) {
              const [grant] = await tx
                .insert(permission)
                .values({ name })
                .onConflictDoUpdate({ target: permission.name, set: { name } })
                .returning({ id: permission.id });
              await tx
                .insert(rolePermission)
                .values({ roleId: assignedRole.id, permissionId: grant.id })
                .onConflictDoNothing();
            }
            await tx
              .insert(userRole)
              .values({ userId: created.id, roleId: assignedRole.id });
            await tx.insert(account).values({
              userId: created.id,
              accountId: input.accountId,
              providerId: "keycloak",
            });
            return created;
          },
          async deactivate(userId) {
            const changed = await tx
              .update(user)
              .set({ enabled: false, updatedAt: new Date() })
              .where(eq(user.id, userId))
              .returning({ id: user.id });
            await tx.delete(session).where(eq(session.userId, userId));
            return changed.length > 0;
          },
          async record(actorId, userId, operation) {
            await tx
              .insert(authAuditEvent)
              .values({ actorId, userId, operation, result: "success" });
          },
        };
        return work(repository);
      });
    },
  };
}
export interface ProvisioningTransaction {
  countUsers(): Promise<number>;
  hasAdmin(userId: string): Promise<boolean>;
  countAdmins(): Promise<number>;
  provision(input: {
    name: string;
    email: string;
    role: Role;
    accountId: string;
  }): Promise<{ id: string }>;
  deactivate(userId: string): Promise<boolean>;
  record(actorId: string, userId: string, operation: string): Promise<void>;
}
