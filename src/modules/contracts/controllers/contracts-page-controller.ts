import { z } from "zod";
import { requirePageAccess } from "@/modules/auth/controllers/access-controller";
import { canAccess } from "@/modules/auth/services/access-service";
import { getContractService } from "@/shared/lib/integrations/server";
export async function getContractsPageController(search: unknown) {
  const principal = await requirePageAccess("dashboard:read");
  const parsed = z
    .object({ q: z.string().trim().max(120).optional() })
    .safeParse(search);
  const query = parsed.success ? (parsed.data.q ?? "") : "";
  return {
    ...(await getContractService().listCurrent(query)),
    query,
    userName: principal.name,
    canSynchronize: canAccess(principal, "integrations:manage"),
  };
}
