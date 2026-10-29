import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/shared/lib/env";
// A conexão é criada somente quando um repository solicita acesso ao banco.
export function createDatabase() {
  const client = postgres(getEnv().DATABASE_URL, {
    max: 5,
    connect_timeout: 10,
  });
  return { db: drizzle(client), close: () => client.end() };
}

let database: ReturnType<typeof createDatabase> | undefined;
export function getDatabase() {
  database ??= createDatabase();
  return database.db;
}
