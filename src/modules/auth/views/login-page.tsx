import { LoginButton } from "./login-button";
import { LogoutButton } from "./logout-button";
import {
  InstitutionalHeader,
  InstitutionalFooter,
} from "@/shared/components/institutional-shell";
export function LoginPage({
  keycloakEnabled,
  failed,
  denied,
}: {
  keycloakEnabled: boolean;
  failed: boolean;
  denied: boolean;
}) {
  return (
    <div className="login-shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <InstitutionalHeader />
      <main className="login-layout" id="conteudo">
        <section className="login-intro">
          <p className="eyebrow">ACESSO INSTITUCIONAL</p>
          <h1>
            DSI Panel<span>.</span>
          </h1>
          <p className="login-lead">
            Informação e ferramentas para o nosso departamento.
          </p>
          <p className="login-description">
            Contratos, editais e chamados reunidos em um ambiente para
            acompanhar os serviços e simplificar a rotina do DSI.
          </p>
          <div className="login-card">
            <h2>Acesse o DSI Panel</h2>
            <p>Entre com sua conta institucional da Prefeitura.</p>
            <LoginButton enabled={keycloakEnabled} />
            {(!keycloakEnabled || failed || denied) && (
              <p className="auth-notice" role="alert">
                {!keycloakEnabled
                  ? "O acesso institucional está indisponível. Entre em contato com o DSI."
                  : denied
                    ? "Sua conta não possui permissão para acessar o painel. Entre em contato com o DSI."
                    : "Acesso institucional não autorizado ou indisponível. Entre em contato com o DSI."}
              </p>
            )}
            {denied && <LogoutButton />}
          </div>
        </section>
        <aside className="login-details" aria-label="Sobre o DSI Panel">
          <div>
            <p className="eyebrow">01 · INTEGRAÇÃO</p>
            <h2>Uma visão do trabalho</h2>
            <p>
              Contratos vigentes, documentos da contratação e acompanhamento dos
              chamados do departamento.
            </p>
          </div>
          <div>
            <p className="eyebrow">02 · SEGURANÇA</p>
            <h2>Acesso responsável</h2>
            <p>
              Contas individuais, permissões por função e operações
              administrativas registradas para auditoria.
            </p>
          </div>
          <p className="login-private">
            Uso exclusivo de pessoas autorizadas, para finalidades
            administrativas. Para solicitar acesso, entre em contato com o DSI.
          </p>
        </aside>
      </main>
      <InstitutionalFooter />
    </div>
  );
}
