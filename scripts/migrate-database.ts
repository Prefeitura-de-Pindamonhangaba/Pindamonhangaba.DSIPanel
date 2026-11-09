import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { assertAutomaticMigrationsAreSafe } from "../src/shared/lib/db/migration-safety";

const databaseURL = process.env.DATABASE_URL;
if (!databaseURL) throw new Error("DATABASE_URL obrigatória para migrar.");
const client = postgres(databaseURL, { max: 1, connect_timeout: 15 });
try {
  const folder = "/app/drizzle";
  const [table] = await client<{ present: string | null }[]>`
    select to_regclass('drizzle.__drizzle_migrations')::text as present
  `;
  const last = table?.present
    ? Number(
        (
          await client<{ last: string | null }[]>`
          select max(created_at)::text as last from drizzle.__drizzle_migrations
        `
        )[0]?.last ?? 0,
      )
    : 0;
  assertAutomaticMigrationsAreSafe(
    readMigrationFiles({ migrationsFolder: folder }),
    last,
  );
  if (!Bun.argv.includes("--check")) {
    await migrate(drizzle(client), { migrationsFolder: folder });
    console.log("Migrações versionadas aplicadas.");
  }
} finally {
  await client.end({ timeout: 5 });
}
