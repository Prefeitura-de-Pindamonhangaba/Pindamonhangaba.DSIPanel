import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icon";
import { LogoutButton } from "@/modules/auth/views/logout-button";
import { isTestAccessEnabled } from "@/modules/auth/services/test-access-service";
import {
  InstitutionalHeader,
  InstitutionalFooter,
} from "./institutional-shell";
export function PanelShell({
  title,
  active,
  userName,
  children,
}: {
  title: string;
  active: "home" | "contracts" | "tickets";
  userName: string;
  children: ReactNode;
}) {
  return (
    <div className="panel-shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <InstitutionalHeader />
      <div className="panel-bar institutional-container">
        <Link href="/" className="product-brand">
          DSI Panel<span aria-hidden="true">.</span>
        </Link>
        <div className="user-menu">
          <span>{userName}</span>
          {isTestAccessEnabled(process.env) ? (
            <span className="status-badge">
              Modo de teste · somente leitura
            </span>
          ) : (
            <LogoutButton />
          )}
        </div>
      </div>
      <div className="panel-nav-band">
        <nav
          className="panel-nav institutional-container"
          aria-label="Navegação principal"
        >
          {(
            [
              { key: "home", href: "/", icon: "home", label: "Início" },
              {
                key: "contracts",
                href: "/contracts",
                icon: "book",
                label: "Contratos e editais",
              },
              {
                key: "tickets",
                href: "/tickets",
                icon: "tools",
                label: "Chamados do DSI",
              },
            ] as const
          ).map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={active === item.key ? "nav-active" : undefined}
              aria-current={active === item.key ? "page" : undefined}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <main id="conteudo" className="panel-main" aria-label={title}>
        {isTestAccessEnabled(process.env) && (
          <p role="status" className="data-notices">
            Login ignorado para testes locais. Para voltar ao acesso
            institucional, defina AUTH_BYPASS_ENABLED=false no .env e recrie o
            container.
          </p>
        )}
        {children}
      </main>
      <InstitutionalFooter />
    </div>
  );
}
