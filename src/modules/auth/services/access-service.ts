import type { Permission, Principal } from "../models/access-types";
export function canAccess(
  principal: Principal | null,
  permission: Permission,
): principal is Principal {
  return Boolean(
    principal?.enabled && principal.permissions.includes(permission),
  );
}
