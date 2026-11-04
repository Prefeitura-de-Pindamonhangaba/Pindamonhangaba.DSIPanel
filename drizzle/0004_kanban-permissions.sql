INSERT INTO "permissions" ("name") VALUES ('kanban:write') ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" IN ('operator', 'admin') AND p."name" = 'kanban:write'
ON CONFLICT DO NOTHING;
