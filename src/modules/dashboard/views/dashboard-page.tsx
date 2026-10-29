import type { DashboardData } from "../models/dashboard-types";
import { Icon } from "@/shared/components/icon";
import { PanelShell } from "@/shared/components/panel-shell";
import Link from "next/link";
export function DashboardPage({ data }: { data: DashboardData }) {
  return (
    <PanelShell
      title="Início"
      active="home"
      userName={data.currentUser?.name ?? ""}
    >
      <div className="page-heading">
        <div>
          <p className="eyebrow">NOSSO ESPAÇO DIGITAL</p>
          <h1>Início</h1>
        </div>
        <span className="phase-tag">Versão inicial · 0.1</span>
      </div>
      {data.overview && (
        <div className="metric-grid dashboard-overview">
          <Link className="metric-card" href="/contracts">
            <span>Contratos vigentes</span>
            <strong>{data.overview.contracts ?? "—"}</strong>
            <small>Secretaria de Tecnologia e unidade relacionada</small>
          </Link>
          <Link className="metric-card" href="/tickets">
            <span>Chamados abertos</span>
            <strong>{data.overview.openTickets ?? "—"}</strong>
            <small>Grupo DSI atribuído ou observador</small>
          </Link>
          <Link className="metric-card" href="/tickets?status=overdue">
            <span>SLA estourado</span>
            <strong>{data.overview.overdueTickets ?? "—"}</strong>
            <small>Posição da última captura do GLPI</small>
          </Link>
        </div>
      )}
      <section className="hero" aria-labelledby="welcome">
        <div className="hero-content">
          <span className="hero-label">
            <span /> CONECTAR. SIMPLIFICAR. EVOLUIR.
          </span>
          <h2 id="welcome">
            Nosso trabalho,
            <br />
            mais conectado.
          </h2>
          <p>
            Bem-vindo ao DSI Panel. O ponto de partida para reunir as
            ferramentas, o conhecimento e as pessoas do nosso departamento.
          </p>
          <a className="primary-button" href="#recursos">
            Explorar o ambiente
            <Icon name="arrow" />
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-grid" />
          <div className="art-tile tile-book">
            <Icon name="book" />
          </div>
          <div className="art-core">
            DSI<span>PANEL</span>
          </div>
          <div className="art-tile tile-tools">
            <Icon name="tools" />
          </div>
          <div className="art-tile tile-users">
            <Icon name="users" />
          </div>
          <span className="art-point point-one" />
          <span className="art-point point-two" />
        </div>
      </section>
      <section id="recursos" className="resources">
        <div className="section-heading">
          <div>
            <h2>Um lugar para facilitar a rotina</h2>
            <p>O ambiente está começando. Veja o que vem por aqui.</p>
          </div>
          <span className="section-caption">RECURSOS DO DSI</span>
        </div>
        <div className="resource-grid">
          {data.resources.map((resource, index) => (
            <article className="resource-card" key={resource.title}>
              <div className={`resource-icon icon-${index}`}>
                <Icon name={resource.icon} />
              </div>
              <h3>{resource.title}</h3>
              <p>{resource.description}</p>
              <div className="resource-status">
                <span />
                {resource.href ? (
                  <Link href={resource.href}>{resource.status} →</Link>
                ) : (
                  resource.status
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section id="projeto" className="project-section">
        <div className="project-intro">
          <span className="eyebrow">PASSO A PASSO</span>
          <h2>Um ambiente em evolução</h2>
          <p>
            Começamos pelo essencial, com espaço para crescer junto com as
            necessidades da equipe.
          </p>
          <span className="project-note">
            <Icon name="shield" /> Organização e segurança desde o início
          </span>
        </div>
        <ol className="milestones">
          {data.milestones.map((milestone, index) => (
            <li
              key={milestone.title}
              className={milestone.current ? "current" : ""}
            >
              <span className="step-number">0{index + 1}</span>
              <div>
                <h3>
                  {milestone.title}
                  {milestone.current && <span>EM ANDAMENTO</span>}
                </h3>
                <p>{milestone.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </PanelShell>
  );
}
