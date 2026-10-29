import "server-only";
import { getDatabase } from "@/shared/lib/db/client";
import { createContractRepository } from "@/modules/contracts/models/contract-repository";
import { createContractService } from "@/modules/contracts/services/contract-service";
import { createTicketRepository } from "@/modules/tickets/models/ticket-repository";
import { createTicketService } from "@/modules/tickets/services/ticket-service";
export function getContractService() {
  return createContractService(createContractRepository(getDatabase()));
}
export function getTicketService() {
  return createTicketService(
    createTicketRepository(getDatabase()),
    getContractService(),
  );
}
