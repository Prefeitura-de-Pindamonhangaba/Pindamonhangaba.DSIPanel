import { z } from "zod";
import {
  IntegrationError,
  mapLimit,
  requestJsonWithMeta,
} from "@/shared/lib/integrations/http";
import {
  documentDigits,
  normalizeName,
} from "@/shared/lib/integrations/normalization";
import {
  glpiContractSchema,
  glpiFlag,
  glpiId,
  groupRelationSchema,
  groupSchema,
  searchOptionsSchema,
  searchResponseSchema,
  supplierRelationSchema,
  supplierSchema,
  ticketDetailSchema,
} from "../schemas/glpi-schema";
import { parseGlpiDate } from "./glpi-date";
import type { parseGlpiEnvironment } from "./glpi-config";
import type {
  DsiTicket,
  GlpiContract,
  TicketSupplier,
} from "../models/ticket-types";

export function createGlpiAdapter(
  config: Extract<ReturnType<typeof parseGlpiEnvironment>, { enabled: true }>,
  fetcher: typeof fetch = fetch,
) {
  let sessionToken: string | undefined;
  const get = async (
    path: string,
    query: Record<string, string> = {},
    initializing = false,
  ) => {
    const url = new URL(path, config.baseURL);
    for (const [key, value] of Object.entries(query))
      url.searchParams.set(key, value);
    const headers: Record<string, string> = { "App-Token": config.appToken };
    if (initializing) headers.Authorization = `user_token ${config.userToken}`;
    else if (sessionToken) headers["Session-Token"] = sessionToken;
    return requestJsonWithMeta(url, "GLPI", headers, fetcher);
  };
  async function list<T>(
    path: string,
    schema: z.ZodType<T>,
    query: Record<string, string> = {},
  ) {
    const rows: T[] = [];
    let offset = 0;
    for (let page = 0; page < 1000; page++) {
      const response = await get(path, {
        ...query,
        range: `${offset}-${offset + 99}`,
      });
      const batch = z.array(schema).parse(response.data);
      rows.push(...batch);
      const range = response.headers
        .get("Content-Range")
        ?.match(/(\d+)-(\d+)\/(\d+)/);
      if (range) {
        if (Number(range[1]) !== offset) throw new IntegrationError("GLPI");
        offset = Number(range[2]) + 1;
        if (offset >= Number(range[3])) return rows;
        if (batch.length === 0) throw new IntegrationError("GLPI");
      } else {
        if (response.status === 206) throw new IntegrationError("GLPI");
        if (batch.length < 100) return rows;
        offset += batch.length;
      }
    }
    throw new IntegrationError("GLPI");
  }
  return {
    async capture() {
      try {
        sessionToken = z
          .object({ session_token: z.string().min(1) })
          .parse((await get("initSession", {}, true)).data).session_token;
        const groups = config.groupId
          ? [groupSchema.parse((await get(`Group/${config.groupId}`)).data)]
          : (
              await list("Group", groupSchema, { "searchText[name]": "DSI" })
            ).filter((group) => normalizeName(group.name) === "DSI");
        if (groups.length !== 1) throw new IntegrationError("GLPI");
        const group = groups[0];
        if (config.groupId && group.id !== config.groupId)
          throw new IntegrationError("GLPI");
        // A relação autoritativa distingue atribuído (2), observador (3) e solicitante (1).
        const relations = await list(
          `Group/${group.id}/Group_Ticket`,
          groupRelationSchema,
        );
        const roles = new Map<number, Set<"assigned" | "observer">>();
        for (const relation of relations) {
          if (
            relation.groups_id !== group.id ||
            ![2, 3].includes(relation.type)
          )
            continue;
          const current = roles.get(relation.tickets_id) ?? new Set();
          current.add(relation.type === 2 ? "assigned" : "observer");
          roles.set(relation.tickets_id, current);
        }
        const options = searchOptionsSchema.parse(
          (await get("listSearchOptions/Ticket", { raw: "true" })).data,
        );
        const findField = (field: string) =>
          Object.entries(options).find(
            ([, option]) =>
              typeof option === "object" &&
              option !== null &&
              "field" in option &&
              "table" in option &&
              option.field === field &&
              option.table === "glpi_tickets",
          )?.[0];
        const resolveFlag = findField("sla_ttr_is_late"),
          ownFlag = findField("sla_tto_is_late");
        if (!resolveFlag || !ownFlag) throw new IntegrationError("GLPI");
        for (const optionId of ["8", "65"]) {
          const option = options[optionId];
          if (
            !option ||
            typeof option !== "object" ||
            !("table" in option) ||
            option.table !== "glpi_groups"
          )
            throw new IntegrationError("GLPI");
        }
        const rows = new Map<number, Record<string, unknown>>();
        let expected: number | undefined;
        let offset = 0;
        for (let page = 0; page < 1000; page++) {
          const query: Record<string, string> = {
            range: `${offset}-${offset + 99}`,
            is_deleted: "0",
            sort: "2",
            order: "ASC",
            withindexes: "false",
            giveItems: "false",
            rawdata: "false",
            "forcedisplay[0]": "2",
            "forcedisplay[1]": resolveFlag,
            "forcedisplay[2]": ownFlag,
            "criteria[0][field]": "8",
            "criteria[0][searchtype]": "equals",
            "criteria[0][value]": String(group.id),
            "criteria[1][link]": "OR",
            "criteria[1][field]": "65",
            "criteria[1][searchtype]": "equals",
            "criteria[1][value]": String(group.id),
          };
          const result = searchResponseSchema.parse(
            (await get("search/Ticket", query)).data,
          );
          if (expected !== undefined && expected !== result.totalcount)
            throw new IntegrationError("GLPI");
          expected = result.totalcount;
          for (const row of result.data) {
            const id = glpiId.parse(row["2"]);
            if (rows.has(id)) throw new IntegrationError("GLPI");
            rows.set(id, row);
          }
          offset += result.data.length;
          if (offset >= expected) break;
          if (result.data.length === 0 || page === 999)
            throw new IntegrationError("GLPI");
        }
        const ids = [...rows.keys()].filter((id) => roles.has(id));
        const supplierCache = new Map<number, Promise<TicketSupplier>>();
        const contractCache = new Map<number, Promise<GlpiContract>>();
        const tickets = await mapLimit(
          ids,
          4,
          async (id): Promise<DsiTicket> => {
            const raw = ticketDetailSchema.parse(
              (
                await get(`Ticket/${id}`, {
                  with_contracts: "true",
                  get_hateoas: "false",
                })
              ).data,
            );
            if (raw.id !== id || raw.is_deleted !== 0)
              throw new IntegrationError("GLPI");
            const assignments = await list(
              `Ticket/${id}/Supplier_Ticket`,
              supplierRelationSchema,
            );
            const suppliers: TicketSupplier[] = [];
            for (const assignment of assignments) {
              if (assignment.tickets_id !== id)
                throw new IntegrationError("GLPI");
              if (assignment.type !== 2) continue;
              if (!supplierCache.has(assignment.suppliers_id))
                supplierCache.set(
                  assignment.suppliers_id,
                  (async () => {
                    const supplier = supplierSchema.parse(
                      (await get(`Supplier/${assignment.suppliers_id}`)).data,
                    );
                    if (supplier.id !== assignment.suppliers_id)
                      throw new IntegrationError("GLPI");
                    return {
                      id: supplier.id,
                      name: supplier.name,
                      document:
                        documentDigits(supplier.registration_number) ??
                        documentDigits(supplier.otherserial),
                    };
                  })(),
                );
              suppliers.push(await supplierCache.get(assignment.suppliers_id)!);
            }
            const contracts: GlpiContract[] = [];
            for (const relation of raw._contracts) {
              if (!contractCache.has(relation.contracts_id))
                contractCache.set(
                  relation.contracts_id,
                  (async () => {
                    const contract = glpiContractSchema.parse(
                      (await get(`Contract/${relation.contracts_id}`)).data,
                    );
                    if (contract.id !== relation.contracts_id)
                      throw new IntegrationError("GLPI");
                    return {
                      id: contract.id,
                      number: contract.num,
                      name: contract.name,
                    };
                  })(),
                );
              contracts.push(await contractCache.get(relation.contracts_id)!);
            }
            const date = (value: string | null) =>
              parseGlpiDate(value, config.timeZone);
            const url = new URL("../front/ticket.form.php", config.baseURL);
            url.searchParams.set("id", String(id));
            return {
              sourceId: id,
              title: raw.name,
              status: raw.status,
              priority: raw.priority,
              openedAt: date(raw.date)!,
              updatedAt: date(raw.date_mod)!,
              solvedAt: date(raw.solvedate),
              resolutionDueAt: date(raw.time_to_resolve),
              ownershipDueAt: date(raw.time_to_own),
              resolutionSlaId: raw.slas_id_ttr,
              ownershipSlaId: raw.slas_id_tto,
              resolutionOverdue: glpiFlag(rows.get(id)![resolveFlag]),
              ownershipOverdue: glpiFlag(rows.get(id)![ownFlag]),
              groupRoles: [...roles.get(id)!],
              suppliers: [
                ...new Map(
                  suppliers.map((supplier) => [supplier.id, supplier]),
                ).values(),
              ],
              contracts: [
                ...new Map(
                  contracts.map((contract) => [contract.id, contract]),
                ).values(),
              ],
              url: url.href,
            };
          },
        );
        return { tickets, group: { id: group.id, name: group.name } };
      } catch (error) {
        if (error instanceof IntegrationError) throw error;
        throw new IntegrationError("GLPI");
      } finally {
        if (sessionToken) {
          try {
            await get("killSession");
          } catch {
            console.error(
              JSON.stringify({ event: "glpi.session_close_failed" }),
            );
          }
          sessionToken = undefined;
        }
      }
    },
  };
}
