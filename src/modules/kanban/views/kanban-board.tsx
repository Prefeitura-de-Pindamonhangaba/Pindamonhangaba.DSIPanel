"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  KANBAN_COLUMNS,
  PRIORITY_LABELS,
  type CardFields,
  type KanbanCard,
  type KanbanColumn,
  type KanbanMutation,
} from "../models/kanban-types";
const emptyFields: CardFields = {
  title: "",
  description: "",
  priority: "normal",
  dueOn: null,
};
export function KanbanBoard({
  initialCards,
  canWrite,
}: {
  initialCards: KanbanCard[];
  canWrite: boolean;
}) {
  const [cards, setCards] = useState(initialCards);
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<KanbanCard | null>(null);
  const [fields, setFields] = useState<CardFields>(emptyFields);
  const [target, setTarget] = useState<KanbanColumn>("todo");
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<KanbanColumn | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  async function mutate(input: KanbanMutation) {
    if (pending) return false;
    setPending(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch("/api/kanban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = (await response.json()) as {
        message?: string;
        card?: KanbanCard;
      };
      if (!response.ok || !body.card)
        throw new Error(body.message ?? "Não foi possível salvar o cartão.");
      const saved = body.card;
      setCards((current) =>
        current.some((card) => card.id === saved.id)
          ? current.map((card) => (card.id === saved.id ? saved : card))
          : [...current, saved],
      );
      setFeedback(
        input.action === "archive"
          ? input.archived
            ? "Cartão arquivado."
            : "Cartão restaurado."
          : input.action === "move"
            ? "Cartão movido."
            : "Cartão salvo.",
      );
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível salvar o cartão.",
      );
      return false;
    } finally {
      setPending(false);
      setDragging(null);
      setOver(null);
    }
  }
  function openCard(card: KanbanCard | null, column: KanbanColumn = "todo") {
    setEditing(card);
    setFields(
      card
        ? {
            title: card.title,
            description: card.description,
            priority: card.priority,
            dueOn: card.dueOn,
          }
        : emptyFields,
    );
    setTarget(column);
    setError("");
    dialog.current?.showModal();
    setIsOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const ok = await mutate(
      editing
        ? {
            action: "edit",
            id: editing.id,
            version: editing.version,
            ...fields,
          }
        : { action: "create", column: target, ...fields },
    );
    if (ok) dialog.current?.close();
  }
  const visible = cards.filter(
    (card) =>
      card.archived === archived &&
      `${card.title} ${card.description}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
  function cardView(card: KanbanCard) {
    return (
      <article
        key={card.id}
        className={`kanban-card priority-${card.priority}`}
        draggable={canWrite && !archived && !pending}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", card.id);
          event.dataTransfer.effectAllowed = "move";
          setDragging(card.id);
        }}
        onDragEnd={() => {
          setDragging(null);
          setOver(null);
        }}
      >
        <div className="kanban-card-meta">
          <span className={`kanban-priority priority-${card.priority}`}>
            {PRIORITY_LABELS[card.priority]}
          </span>
          {card.description && (
            <span title="Com descrição" aria-label="Com descrição">
              ☰
            </span>
          )}
        </div>
        <button
          type="button"
          className="kanban-card-title"
          disabled={pending}
          onClick={() => openCard(card)}
        >
          {card.title}
        </button>
        {card.description && (
          <p className="kanban-excerpt">{card.description}</p>
        )}
        {card.dueOn && (
          <time className="kanban-due" dateTime={card.dueOn}>
            Prazo · {card.dueOn.split("-").reverse().join("/")}
          </time>
        )}
        {canWrite && (
          <div className="kanban-card-actions">
            {!archived && (
              <label>
                <span className="sr-only">Mover {card.title} para</span>
                <select
                  aria-label={`Mover ${card.title} para`}
                  value={card.column}
                  disabled={pending}
                  onChange={(event) =>
                    void mutate({
                      action: "move",
                      id: card.id,
                      version: card.version,
                      column: event.target.value as KanbanColumn,
                    })
                  }
                >
                  {KANBAN_COLUMNS.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                void mutate({
                  action: "archive",
                  id: card.id,
                  version: card.version,
                  archived: !card.archived,
                })
              }
            >
              {archived ? "Restaurar" : "Arquivar"}
            </button>
          </div>
        )}
      </article>
    );
  }
  return (
    <section
      className="kanban-workspace"
      aria-label="Quadro de tarefas"
      aria-busy={pending}
    >
      <div className="kanban-toolbar">
        <label className="kanban-search">
          <span>Buscar no quadro</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Título ou descrição"
            maxLength={160}
          />
        </label>
        <div className="kanban-toolbar-actions">
          <button
            type="button"
            className="kanban-secondary"
            aria-pressed={archived}
            onClick={() => setArchived(!archived)}
          >
            {archived
              ? "Voltar ao quadro"
              : `Arquivados (${cards.filter((card) => card.archived).length})`}
          </button>
          {canWrite && !archived && (
            <button
              type="button"
              className="kanban-primary"
              onClick={() => openCard(null)}
            >
              + Novo cartão
            </button>
          )}
        </div>
      </div>
      {!canWrite && (
        <p className="kanban-readonly">
          Você está visualizando o quadro. Operadores e administradores podem
          criar e movimentar cartões.
        </p>
      )}
      <p role="status" className="kanban-feedback">
        {feedback}
      </p>
      {error && !isOpen && (
        <p role="alert" className="kanban-error">
          {error}{" "}
          <button type="button" onClick={() => window.location.reload()}>
            Atualizar quadro
          </button>
        </p>
      )}
      {archived ? (
        <div className="kanban-archive">
          <h2>Cartões arquivados</h2>
          {visible.length ? (
            <div className="kanban-archive-grid">{visible.map(cardView)}</div>
          ) : (
            <p>Nenhum cartão arquivado encontrado.</p>
          )}
        </div>
      ) : (
        <div
          className="kanban-scroll"
          role="region"
          aria-label="Etapas do quadro"
          tabIndex={0}
        >
          <div className="kanban-columns">
            {KANBAN_COLUMNS.map((column) => {
              const items = visible.filter((card) => card.column === column.id);
              return (
                <section
                  key={column.id}
                  className={`kanban-column column-${column.color}${over === column.id ? " drag-over" : ""}`}
                  aria-label={column.name}
                  onDragOver={(event) => {
                    if (canWrite && dragging && !pending) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setOver(column.id);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const card = cards.find(
                      (item) =>
                        item.id === event.dataTransfer.getData("text/plain"),
                    );
                    setOver(null);
                    if (
                      canWrite &&
                      card &&
                      !card.archived &&
                      card.column !== column.id
                    )
                      void mutate({
                        action: "move",
                        id: card.id,
                        version: card.version,
                        column: column.id,
                      });
                  }}
                >
                  <header className="kanban-column-heading">
                    <h2>{column.name}</h2>
                    <span>{items.length}</span>
                  </header>
                  <div className="kanban-column-cards">
                    {items.map(cardView)}
                    {items.length === 0 && (
                      <p className="kanban-empty">
                        {query
                          ? "Nenhum resultado nesta etapa."
                          : "Nenhum cartão nesta etapa."}
                      </p>
                    )}
                  </div>
                  {canWrite && (
                    <button
                      type="button"
                      className="kanban-add"
                      disabled={pending}
                      onClick={() => openCard(null, column.id)}
                    >
                      + Adicionar cartão
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
      {!archived && canWrite && (
        <p className="kanban-hint">
          Arraste os cartões para outra etapa ou use o menu de movimentação em
          cada cartão.
        </p>
      )}
      <dialog
        onClose={() => setIsOpen(false)}
        ref={dialog}
        className="kanban-dialog"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        aria-labelledby="kanban-dialog-title"
      >
        <form onSubmit={(event) => void save(event)}>
          <div className="kanban-dialog-heading">
            <h2 id="kanban-dialog-title">
              {editing
                ? canWrite
                  ? "Editar cartão"
                  : "Detalhes do cartão"
                : "Novo cartão"}
            </h2>
            <button
              type="button"
              className="kanban-close"
              aria-label="Fechar"
              disabled={pending}
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          </div>
          <fieldset
            disabled={pending || !canWrite || Boolean(editing?.archived)}
          >
            <label htmlFor="card-title">
              Título <span aria-hidden="true">*</span>
            </label>
            <input
              id="card-title"
              required
              maxLength={160}
              value={fields.title}
              onChange={(event) =>
                setFields({ ...fields, title: event.target.value })
              }
            />
            <label htmlFor="card-description">Descrição</label>
            <textarea
              id="card-description"
              rows={5}
              maxLength={4000}
              value={fields.description}
              onChange={(event) =>
                setFields({ ...fields, description: event.target.value })
              }
            />
            <div className="kanban-field-grid">
              <div>
                <label htmlFor="card-priority">Prioridade</label>
                <select
                  id="card-priority"
                  value={fields.priority}
                  onChange={(event) =>
                    setFields({
                      ...fields,
                      priority: event.target.value as CardFields["priority"],
                    })
                  }
                >
                  {Object.entries(PRIORITY_LABELS).map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="card-due">Prazo</label>
                <input
                  id="card-due"
                  type="date"
                  value={fields.dueOn ?? ""}
                  onChange={(event) =>
                    setFields({ ...fields, dueOn: event.target.value || null })
                  }
                />
              </div>
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="kanban-error">
              {error}
            </p>
          )}
          <div className="kanban-dialog-actions">
            <button
              type="button"
              className="kanban-secondary"
              disabled={pending}
              onClick={() => dialog.current?.close()}
            >
              {canWrite ? "Cancelar" : "Fechar"}
            </button>
            {canWrite && !editing?.archived && (
              <button
                type="submit"
                className="kanban-primary"
                disabled={pending}
              >
                {pending ? "Salvando…" : "Salvar cartão"}
              </button>
            )}
          </div>
        </form>
      </dialog>
    </section>
  );
}
