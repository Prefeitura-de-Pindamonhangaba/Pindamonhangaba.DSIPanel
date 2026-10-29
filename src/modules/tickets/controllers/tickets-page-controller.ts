import { z } from "zod";
import { requirePageAccess } from "@/modules/auth/controllers/access-controller";
import { canAccess } from "@/modules/auth/services/access-service";
import { getTicketService } from "@/shared/lib/integrations/server";
const filtersSchema = z.object({
  q: z.string().trim().max(120).default(""),
  status: z.enum(["open", "all", "overdue"]).default("open"),
  group: z.string().max(100).default(""),
  page: z.coerce.number().int().positive().max(100000).default(1),
});
export async function getTicketsPageController(search: unknown) {
  const principal = await requirePageAccess("dashboard:read");
  const parsed = filtersSchema.safeParse(search);
  const filters = parsed.success ? parsed.data : filtersSchema.parse({});
  return {
    ...(await getTicketService().dashboard(filters)),
    filters,
    userName: principal.name,
    canManage: canAccess(principal, "integrations:manage"),
  };
}
