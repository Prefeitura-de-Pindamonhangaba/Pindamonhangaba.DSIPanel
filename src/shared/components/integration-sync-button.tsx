"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function IntegrationSyncButton({
  source,
}: {
  source: "transparency" | "glpi";
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function synchronize() {
    setPending(true);
    setMessage("");
    try {
      const result = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (!result.ok) throw new Error("Atualização indisponível.");
      setMessage("Dados atualizados.");
      router.refresh();
    } catch {
      setMessage(
        "Não foi possível atualizar. A última captura foi preservada; consulte o DSI.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="sync-control">
      <button type="button" onClick={synchronize} disabled={pending}>
        {pending ? "Atualizando…" : "Atualizar dados"}
      </button>
      <span role="status">{message}</span>
    </div>
  );
}
