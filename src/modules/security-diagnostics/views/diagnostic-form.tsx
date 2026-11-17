"use client";

import { useActionState, useState } from "react";
import { runDiagnostic } from "../controllers/diagnostic-controller";

type Result = Awaited<ReturnType<typeof runDiagnostic>>;
type Check = NonNullable<Result["observation"]>["checks"][number];

export function DiagnosticForm() {
  const [url, setUrl] = useState("");
  const [state, submit, pending] = useActionState<
    { report: Result | null; prior: Check[] },
    FormData
  >(
    async (
      previous: { report: Result | null; prior: Check[] },
      form: FormData,
    ) => {
      const report = await runDiagnostic(form);
      return {
        report,
        prior:
          report.url && previous.report?.url === report.url
            ? (previous.report.observation?.checks ?? [])
            : [],
      };
    },
    { report: null, prior: [] },
  );
  const { report, prior } = state;
  const checks = report?.observation?.checks ?? [];
  const passed = checks.filter((check) => check.ok).length;

  return (
    <section className="diagnostic kanban-workspace">
      <div className="diagnostic-controls">
        <h1>Diagnóstico de segurança</h1>
        <p>
          Verifique cabeçalhos e cookies de um site público que você tem
          autorização para avaliar.
        </p>
        <form action={submit} className="diagnostic-form">
          <label htmlFor="diagnostic-url">URL autorizada</label>
          <div>
            <input
              id="diagnostic-url"
              name="url"
              type="url"
              required
              maxLength={2048}
              placeholder="https://exemplo.gov.br/login"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <button className="kanban-primary" disabled={pending}>
              {pending
                ? "Consultando…"
                : report?.url
                  ? "Testar novamente"
                  : "Executar diagnóstico"}
            </button>
          </div>
        </form>
        {report?.error && <p role="alert">{report.error}</p>}
      </div>
      {report?.observation && (
        <article className="diagnostic-report" aria-live="polite">
          <header>
            <div>
              <h2>Relatório de segurança</h2>
              <p className="diagnostic-url">{report.url}</p>
              <p>
                {report.timestamp &&
                  new Date(report.timestamp).toLocaleString("pt-BR")}{" "}
                · HTTP {report.observation.status}
              </p>
            </div>
            <button
              className="kanban-secondary diagnostic-controls"
              onClick={() => window.print()}
            >
              Salvar em PDF
            </button>
          </header>
          <div className="diagnostic-summary">
            <strong className="diagnostic-ok">{passed} OK</strong>
            <strong className="diagnostic-nok">
              {checks.length - passed} NOK
            </strong>
          </div>
          <h3>Checklist da resposta</h3>
          <ul className="diagnostic-checklist">
            {checks.map((check) => {
              const previous = prior.find((item) => item.name === check.name);
              return (
                <li key={check.name}>
                  <span
                    className={check.ok ? "diagnostic-ok" : "diagnostic-nok"}
                  >
                    {check.ok ? "OK" : "NOK"}
                  </span>
                  <div>
                    <strong>{check.name}</strong>
                    {!check.ok && <p>{check.advice}</p>}
                    {previous &&
                      previous.ok !== check.ok &&
                      check.name.startsWith("Cookie ") === false && (
                        <p>
                          {check.ok
                            ? "Passou na nova consulta."
                            : "Falhou na nova consulta."}
                        </p>
                      )}
                  </div>
                </li>
              );
            })}
          </ul>
          {report.observation.cookieCount === 0 && (
            <p>A resposta não emitiu cookies.</p>
          )}
          <p>
            Consulta HEAD à URL informada. Se houver redirecionamento, teste o
            endereço final separadamente.
          </p>
          <h3>CVEs não avaliados pela resposta HTTP</h3>
          <p>
            Confirme as versões e a configuração pelo inventário do servidor e
            aplique as atualizações indicadas pelo fornecedor.
          </p>
          <ul>
            <li>
              <a href="https://www.php.net/archive/2026.php#2026-10-21-5">
                PHP2Shell · CVE-2026-109618 e CVE-2026-109619
              </a>
            </li>
            <li>
              <a href="https://www.php.net/ChangeLog-8.php#8.3.8">
                PHP CGI · CVE-2024-4577
              </a>
            </li>
            <li>
              <a href="https://github.com/vercel/next.js/security/advisories">
                Next.js · avisos oficiais
              </a>
            </li>
          </ul>
        </article>
      )}
    </section>
  );
}
