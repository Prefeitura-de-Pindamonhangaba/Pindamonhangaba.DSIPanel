import { expect, test } from "bun:test";
import { assertAutomaticMigrationsAreSafe } from "../../src/shared/lib/db/migration-safety";

function migration(sql: string, folderMillis = 2) {
  return { sql: [sql], folderMillis, hash: "fixture", bps: false };
}
test("deploy permite migrações aditivas e ignora as já aplicadas", () => {
  expect(() =>
    assertAutomaticMigrationsAreSafe(
      [
        migration("DROP TABLE old", 1),
        migration("ALTER TABLE users ADD COLUMN tag text"),
      ],
      1,
    ),
  ).not.toThrow();
});
test("deploy interrompe alterações destrutivas ou incompatíveis pendentes", () => {
  for (const sql of [
    "DROP TABLE users",
    "TRUNCATE users",
    "DELETE FROM users",
    "ALTER TABLE users ALTER COLUMN name TYPE integer",
    "ALTER TABLE users ALTER COLUMN name SET NOT NULL",
  ]) {
    expect(() =>
      assertAutomaticMigrationsAreSafe([migration(sql)], 0),
    ).toThrow();
  }
});
