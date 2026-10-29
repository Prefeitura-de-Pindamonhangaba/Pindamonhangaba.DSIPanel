import type { getContractsPageController } from "../controllers/contracts-page-controller";
import { PanelShell } from "@/shared/components/panel-shell";
import { SyncStatus } from "@/shared/components/sync-status";
import { IntegrationSyncButton } from "@/shared/components/integration-sync-button";
function dateLabel(value: string | null) {
  return value ? value.split("-").reverse().join("/") : "Não informada";
}
export function ContractsPage({
  data,
}: {
  data: Awaited<ReturnType<typeof getContractsPageController>>;
}) {
  return (
    <PanelShell
      title="Contratos e editais"
      active="contracts"
      userName={data.userName}
    >
      <div className="page-heading">
        <div>
          <p className="eyebrow">ACOMPANHAMENTO DE CONTRATAÇÕES</p>
          <h1>Contratos e editais</h1>
        </div>
        {data.canSynchronize && <IntegrationSyncButton source="transparency" />}
      </div>
      <p className="page-introduction">
        Contratos vigentes da Secretaria Municipal de Tecnologia, Inovação e
        Projetos e da unidade histórica de Tecnologia e Informação.
      </p>
      <SyncStatus sync={data.sync} source="Portal da Transparência" />
      <div className="metric-grid">
        <article className="metric-card">
          <span>Contratos vigentes</span>
          <strong>{data.sync?.succeededAt ? data.summary.total : "—"}</strong>
          <small>Datas e situação conferidas no portal</small>
        </article>
        <article className="metric-card">
          <span>Fornecedores</span>
          <strong>
            {data.sync?.succeededAt ? data.summary.suppliers : "—"}
          </strong>
          <small>Com contratos no período atual</small>
        </article>
        <article className="metric-card">
          <span>Vencem em até 90 dias</span>
          <strong>
            {data.sync?.succeededAt ? data.summary.expiringSoon : "—"}
          </strong>
          <small>Planejamento de renovação ou contratação</small>
        </article>
      </div>
      <form className="filter-form" action="/contracts">
        <label htmlFor="contract-query">
          Buscar contrato, fornecedor ou objeto
        </label>
        <div>
          <input
            id="contract-query"
            name="q"
            defaultValue={data.query}
            maxLength={120}
            placeholder="Número, fornecedor ou palavra-chave"
          />
          <button type="submit">Buscar</button>
        </div>
      </form>
      <div className="contracts-list">
        {data.contracts.map((contract) => (
          <article className="contract-card" key={contract.sourceId}>
            <div className="contract-card-heading">
              <div>
                <span className="eyebrow">CONTRATO {contract.number}</span>
                <h2>{contract.supplierName}</h2>
              </div>
              <span className="status-badge">
                Vigente até {dateLabel(contract.endsOn)}
              </span>
            </div>
            <p className="contract-object">
              {contract.object || "Objeto não informado pelo portal."}
            </p>
            <dl className="contract-facts">
              <div>
                <dt>Vigência</dt>
                <dd>
                  {dateLabel(contract.startsOn)} a {dateLabel(contract.endsOn)}
                </dd>
              </div>
              <div>
                <dt>Valor informado</dt>
                <dd>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(Number(contract.totalValue))}
                </dd>
              </div>
              <div>
                <dt>Processo</dt>
                <dd>{contract.procurement || "Não informado"}</dd>
              </div>
              <div>
                <dt>Contratação</dt>
                <dd>{contract.procurementType}</dd>
              </div>
            </dl>
            <p className="contract-department">
              Unidade no portal: {contract.department}
            </p>
            <div className="document-links">
              {contract.documents
                .filter(
                  (document) =>
                    document.kind === "contract" || document.kind === "notice",
                )
                .map((document) => (
                  <a
                    key={document.id}
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {document.kind === "notice" ? "Edital" : "Contrato"}:{" "}
                    {document.title}
                    {document.publishedAt && (
                      <small>
                        {" "}
                        · Registro no portal: {dateLabel(document.publishedAt)}
                      </small>
                    )}
                  </a>
                ))}
            </div>
            {contract.documents.some(
              (document) =>
                document.kind === "amendment" || document.kind === "other",
            ) && (
              <details className="contract-documents">
                <summary>Aditivos e demais documentos da contratação</summary>
                <ul>
                  {contract.documents
                    .filter(
                      (document) =>
                        document.kind === "amendment" ||
                        document.kind === "other",
                    )
                    .map((document) => (
                      <li key={document.id}>
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {document.title || document.filename}
                        </a>
                        {document.publishedAt && (
                          <small> · {dateLabel(document.publishedAt)}</small>
                        )}
                      </li>
                    ))}
                </ul>
              </details>
            )}
            {contract.issues.length > 0 && (
              <ul className="data-notices">
                {contract.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      {data.contracts.length === 0 && (
        <div className="empty-state">
          <h2>
            {data.sync?.succeededAt
              ? "Nenhum contrato encontrado"
              : "Aguardando captura dos contratos"}
          </h2>
          <p>
            {data.sync?.succeededAt
              ? "Revise os filtros ou atualize os dados do portal."
              : "A captura pode ser executada por um administrador."}
          </p>
        </div>
      )}
    </PanelShell>
  );
}
