INSERT INTO permissions (name) VALUES ('integrations:manage') ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'admin' AND permissions.name = 'integrations:manage'
ON CONFLICT DO NOTHING;
