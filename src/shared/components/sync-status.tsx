export function SyncStatus({
  sync,
  source,
}: {
  sync: { status: string; succeededAt: string | null } | null;
  source: string;
}) {
  return (
    <p
      className={`sync-status ${sync?.status === "failed" ? "sync-failed" : ""}`}
      role="status"
    >
      {!sync?.succeededAt
        ? `${source}: ainda não há captura disponível.`
        : `${source} · Atualizado em ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(sync.succeededAt))}.`}
      {sync?.status === "failed" &&
        " A última atualização falhou; os dados anteriores foram preservados."}
    </p>
  );
}
