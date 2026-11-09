import type { MigrationMeta } from "drizzle-orm/migrator";

export function assertAutomaticMigrationsAreSafe(
  migrations: MigrationMeta[],
  lastAppliedAt: number,
) {
  for (const migration of migrations) {
    if (migration.folderMillis <= lastAppliedAt) continue;
    for (const statement of migration.sql) {
      const sql = statement
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/--[^\n]*/g, " ");
      if (
        /\b(drop|truncate)\b|\bdelete\s+from\b|\balter\s+(?:column\s+)?[^;]*\b(?:type|set\s+not\s+null)\b/i.test(
          sql,
        )
      ) {
        throw new Error(
          "Migração exige revisão e execução manual antes do deploy automático.",
        );
      }
    }
  }
}
