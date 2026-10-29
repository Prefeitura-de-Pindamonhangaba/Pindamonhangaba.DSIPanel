"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export function TicketContractForm({
  ticketId,
  current,
  options,
}: {
  ticketId: number;
  current: string | null;
  options: { id: string; label: string }[];
}) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const sourceId = String(
      new FormData(event.currentTarget).get("contract") ?? "",
    );
    try {
      const response = await fetch("/api/tickets/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, contractSourceId: sourceId || null }),
      });
      if (!response.ok) throw new Error("Vínculo indisponível.");
      setMessage("Vínculo atualizado.");
      router.refresh();
    } catch {
      setMessage(
        "Não foi possível vincular. Confira o contrato e tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="ticket-binding-form" onSubmit={save}>
      <small>Ajuste local do painel</small>
      <label className="sr-only" htmlFor={`contract-${ticketId}`}>
        Contrato do chamado {ticketId}
      </label>
      <select
        id={`contract-${ticketId}`}
        name="contract"
        defaultValue={current ?? ""}
        disabled={pending}
      >
        <option value="">Associação automática</option>
        {current && !options.some((option) => option.id === current) && (
          <option value={current} disabled>
            Vínculo anterior fora de vigência
          </option>
        )}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Vincular"}
      </button>
      <span role="status">{message}</span>
    </form>
  );
}
