import { defineConfig } from "drizzle-kit";
import { getEnv } from "./src/shared/lib/env";
export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./src/modules/**/models/*-schema.ts",
    "./src/shared/lib/integrations/sync-schema.ts",
  ],
  out: "./drizzle",
  dbCredentials: { url: getEnv().DATABASE_URL },
});
