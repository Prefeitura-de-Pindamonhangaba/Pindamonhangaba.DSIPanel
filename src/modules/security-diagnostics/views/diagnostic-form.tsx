"use client";

import { useActionState } from "react";
import { runDiagnostic } from "../controllers/diagnostic-controller";

export function DiagnosticForm() {
  const [report, submit, pending] = useActionState(
    (
      _previous: Awaited<ReturnType<typeof runDiagnostic>> | null,
      form: FormData,
    ) => runDiagnostic(form),
    null,
  );
  return (
    <section className="kanban-workspace">
      <h1>Diagnóstico de segurança</h1>
      <p>
        Consulta os cabeçalhos e cookies da resposta HTTPS inicial e compara a
        versão informada com avisos selecionados.
      </p>
      <form action={submit} className="kanban-toolbar">
        <label>
          Endereço autorizado
          <select name="url">
            <option value="https://pat.pindamonhangaba.sp.gov.br/">
              PAT · PHP
            </option>
            <option value="https://identifica.pindamonhangaba.sp.gov.br/">
              Identifica · Next.js
            </option>
          </select>
        </label>
        <label>
          Versão instalada (opcional)
          <input name="version" placeholder="X.Y.Z" maxLength={14} />
        </label>
        <button className="kanban-primary" disabled={pending}>
          {pending ? "Consultando…" : "Executar diagnóstico"}
        </button>
      </form>
      {report?.error && <p role="alert">{report.error}</p>}
      {report?.reviews && (
        <div aria-live="polite">
          <h2>{report.url}</h2>
          {report.observation ? (
            <>
              <p>
                HTTPS validado · HTTP {report.observation.status}.
                Redirecionamentos ficam fora da análise.
              </p>
              <ul>
                {report.observation.checks.map((check) => (
                  <li key={check.name}>
                    <strong>{check.name}</strong> —{" "}
                    {check.present ? "Presente" : `Ausente. ${check.advice}`}
                  </li>
                ))}
              </ul>
              <h3>Cookies emitidos nesta resposta</h3>
              {report.observation.cookies.length === 0 ? (
                <p>Nenhum recebido.</p>
              ) : (
                <ul>
                  {report.observation.cookies.map((cookie) => (
                    <li key={cookie.index}>
                      Cookie {cookie.index} · Secure:{" "}
                      {cookie.secure ? "sim" : "não"} · HttpOnly:{" "}
                      {cookie.httpOnly ? "sim" : "não"} · SameSite explícito:{" "}
                      {cookie.sameSite ? "sim" : "não"}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p>
              Não foi possível obter a resposta HTTPS. A avaliação do inventário
              continua disponível.
            </p>
          )}
          <h3>Avisos para {report.technology}</h3>
          <p>
            {report.version
              ? `Versão informada: ${report.version}.`
              : "Versão não informada."}{" "}
            A comparação depende do inventário e das condições do aviso.
          </p>
          <ul>
            {report.reviews.map((review) => (
              <li key={review.name}>
                <a href={review.url}>{review.name}</a>
                <p>
                  {review.result} {review.advice}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
