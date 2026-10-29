import { getDashboard } from "../services/dashboard-service";
import { requirePageAccess } from "@/modules/auth/controllers/access-controller";
import {
  getContractService,
  getTicketService,
} from "@/shared/lib/integrations/server";
export async function getDashboardPageController() {
  const principal = await requirePageAccess("dashboard:read");
  const [contracts, tickets] = await Promise.all([
    getContractService().listCurrent(),
    getTicketService().dashboard({ q: "", status: "open", group: "", page: 1 }),
  ]);
  return {
    ...getDashboard(),
    currentUser: { name: principal.name },
    overview: {
      contracts: contracts.sync?.succeededAt ? contracts.summary.total : null,
      openTickets: tickets.sync?.succeededAt ? tickets.summary.open : null,
      overdueTickets: tickets.sync?.succeededAt
        ? tickets.summary.overdue
        : null,
    },
  };
}
