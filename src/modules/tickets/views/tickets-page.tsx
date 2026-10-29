import Link from "next/link";
import type { getTicketsPageController } from "../controllers/tickets-page-controller";
import { PanelShell } from "@/shared/components/panel-shell";
import { SyncStatus } from "@/shared/components/sync-status";
import { IntegrationSyncButton } from "@/shared/components/integration-sync-button";
import { TicketContractForm } from "./ticket-contract-form";
const STATUS: Record<number, string> = {
  1: "Novo",
  2: "Em atendimento",
  3: "Planejado",
  4: "Pendente",
  5: "Solucionado",
  6: "Fechado",
};
const PRIORITY: Record<number, string> = {
  1: "Muito baixa",
  2: "Baixa",
  3: "Média",
  4: "Alta",
  5: "Muito alta",
  6: "Crítica",
};
const SLA = {
  overdue: "SLA estourado",
  on_time: "Dentro do prazo",
  pending: "Pendente / suspenso",
  not_configured: "Sem SLA",
  unknown: "Cálculo indisponível",
};
const MATCH = {
  manual: "Vínculo manual",
  glpi: "Contrato no GLPI",
  supplier: "Fornecedor com contrato único",
  ambiguous: "Contrato ambíguo",
  unassigned: "Sem vínculo",
};
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
export function TicketsPage({
  data,
}: {
  data: Awaited<ReturnType<typeof getTicketsPageController>>;
}) {
  const captured = Boolean(data.sync?.succeededAt);
  const value = (number: number | null) => (captured ? (number ?? "—") : "—");
  function pageUrl(page: number) {
    const query = new URLSearchParams({
      q: data.filters.q,
      status: data.filters.status,
      group: data.filters.group,
      page: String(page),
    });
    return `/tickets?${query}`;
  }
  return (
    <PanelShell
      title="Chamados do DSI"
      active="tickets"
      userName={data.userName}
    >
      <div className="page-heading">
        <div>
          <p className="eyebrow">OPERAÇÃO E NÍVEIS DE SERVIÇO</p>
          <h1>Chamados do DSI</h1>
        </div>
        {data.canManage && data.configured && (
          <IntegrationSyncButton source="glpi" />
        )}
      </div>
      <p className="page-introduction">
        Grupo {data.groupName}
        {data.groupId ? ` (#${data.groupId})` : ""} como atribuído ou
        observador. Cada chamado é contado uma única vez. A captura respeita as
        permissões da conta de integração.
      </p>
      <SyncStatus sync={data.sync} source="GLPI" />
      {(!data.configured || data.configurationError) && (
        <div className="integration-notice" role="status">
          <strong>Integração GLPI aguardando configuração</strong>
          <p>
            Solicite ao DSI a configuração das credenciais da API e das
            permissões da conta de integração. Os indicadores aparecerão após a
            primeira captura válida.
          </p>
        </div>
      )}
      <div className="metric-grid ticket-metrics">
        {[
          [
            "Chamados abertos",
            data.summary.open,
            "Novos, em atendimento, planejados e pendentes",
          ],
          [
            "SLA estourado",
            data.summary.overdue,
            "Abertos com atraso de atendimento ou solução",
          ],
          ["Pendentes", data.summary.pending, "Aguardando uma ação ou retorno"],
          [
            "Prioridade alta ou maior",
            data.summary.highPriority,
            "Chamados abertos que exigem atenção",
          ],
          [
            "Abertos sem contrato",
            data.summary.unlinked,
            "Inclui associações ausentes ou ambíguas",
          ],
          [
            "Solucionados em 30 dias",
            data.summary.solved30Days,
            "Solucionados ou fechados no período",
          ],
        ].map(([label, count, help]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value(count as number)}</strong>
            <small>{help}</small>
          </article>
        ))}
      </div>
      {captured && (
        <p className="metric-footnote">
          Idade média dos abertos: {data.summary.averageAgeDays ?? "—"} dias ·
          Sem SLA configurado: {data.summary.withoutSla} · Cálculo de SLA
          indisponível: {data.summary.slaUnknown}. Os prazos e atrasos refletem
          o cálculo do GLPI na última captura, incluindo suas regras de
          suspensão.
        </p>
      )}
      <section className="ticket-groups">
        <div className="section-heading">
          <div>
            <h2>Por contrato e fornecedor</h2>
            <p>
              Associações ambíguas permanecem no fornecedor até conferência.
            </p>
          </div>
        </div>
        {data.groups.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Contrato / fornecedor</th>
                  <th>Abertos</th>
                  <th>SLA estourado</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.groups.map((group) => (
                  <tr key={group.key}>
                    <td>
                      <Link
                        href={`/tickets?group=${encodeURIComponent(group.key)}&status=open`}
                      >
                        {group.title}
                      </Link>
                      {group.supplier && group.supplier !== group.title && (
                        <small>{group.supplier}</small>
                      )}
                    </td>
                    <td>{group.open}</td>
                    <td>
                      <span
                        className={group.overdue ? "overdue-count" : undefined}
                      >
                        {group.overdue}
                      </span>
                    </td>
                    <td>{group.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>
              {captured
                ? "Nenhum chamado do grupo na captura atual."
                : "Nenhuma captura de chamados disponível."}
            </p>
          </div>
        )}
      </section>
      <section className="tickets-section">
        <div className="section-heading">
          <div>
            <h2>Fila de chamados</h2>
            <p>Prioridade para atrasos de SLA e chamados mais urgentes.</p>
          </div>
        </div>
        <form action="/tickets" className="ticket-filters">
          <div>
            <label htmlFor="ticket-query">
              Buscar chamado, fornecedor ou contrato
            </label>
            <input
              id="ticket-query"
              name="q"
              defaultValue={data.filters.q}
              maxLength={120}
              placeholder="Número ou palavra-chave"
            />
          </div>
          <div>
            <label htmlFor="ticket-status">Situação</label>
            <select
              id="ticket-status"
              name="status"
              defaultValue={data.filters.status}
            >
              <option value="open">Abertos</option>
              <option value="overdue">Abertos com SLA estourado</option>
              <option value="all">Todos os capturados</option>
            </select>
          </div>
          <div>
            <label htmlFor="ticket-group">Contrato / fornecedor</label>
            <select
              id="ticket-group"
              name="group"
              defaultValue={data.filters.group}
            >
              <option value="">Todos</option>
              {data.groups.map((group) => (
                <option key={group.key} value={group.key}>
                  {group.title}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Filtrar</button>
        </form>
        {data.tickets.length ? (
          <div className="table-scroll">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>Chamado</th>
                  <th>Situação / prioridade</th>
                  <th>Contrato / fornecedor</th>
                  <th>SLA / prazo de solução</th>
                </tr>
              </thead>
              <tbody>
                {data.tickets.map((ticket) => (
                  <tr key={ticket.sourceId}>
                    <td>
                      <a
                        href={ticket.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        #{ticket.sourceId} · {ticket.title}
                      </a>
                      <small>Aberto em {formatDate(ticket.openedAt)}</small>
                      <small>
                        DSI:{" "}
                        {ticket.groupRoles
                          .map((role) =>
                            role === "assigned" ? "atribuído" : "observador",
                          )
                          .join(" e ")}
                      </small>
                    </td>
                    <td>
                      <span className="status-badge">
                        {STATUS[ticket.status]}
                      </span>
                      <small>{PRIORITY[ticket.priority]}</small>
                    </td>
                    <td>
                      {ticket.contract ? (
                        <Link
                          href={`/contracts?q=${encodeURIComponent(ticket.contract.number)}`}
                        >
                          Contrato {ticket.contract.number}
                        </Link>
                      ) : (
                        <span>
                          {ticket.suppliers
                            .map((supplier) => supplier.name)
                            .join(" / ") || "Sem fornecedor atribuído"}
                        </span>
                      )}
                      <small>{MATCH[ticket.matchReason]}</small>
                      {data.canManage && (
                        <TicketContractForm
                          ticketId={ticket.sourceId}
                          current={ticket.manualContract}
                          options={data.contractOptions}
                        />
                      )}
                    </td>
                    <td>
                      <span className={`sla-badge sla-${ticket.slaState}`}>
                        {SLA[ticket.slaState]}
                      </span>
                      <small>{formatDate(ticket.resolutionDueAt)}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>
              {captured
                ? "Nenhum chamado corresponde aos filtros."
                : "Aguardando configuração e primeira sincronização do GLPI."}
            </p>
          </div>
        )}
        <div className="pagination">
          <span>
            {data.pagination.total} chamados · Página {data.pagination.page} de{" "}
            {data.pagination.pages}
          </span>
          <div>
            {data.pagination.page > 1 && (
              <Link href={pageUrl(data.pagination.page - 1)}>Anterior</Link>
            )}
            {data.pagination.page < data.pagination.pages && (
              <Link href={pageUrl(data.pagination.page + 1)}>Próxima</Link>
            )}
          </div>
        </div>
      </section>
    </PanelShell>
  );
}
