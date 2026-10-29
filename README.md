# DSI Panel

Ambiente interno do Departamento de Sistemas da Prefeitura de Pindamonhangaba.

## Desenvolvimento

Requisitos: Bun 1.4.3 ou superior e Docker com Compose.

1. Copie `.env.example` para `.env` e ajuste as configurações locais.
2. Execute `bun install --frozen-lockfile`.
3. Execute `bun run dev` e acesse http://localhost:3000.

O painel exige login institucional via Keycloak e conta local autorizada. Configure as variáveis privadas, aplique as migrações e provisione a primeira conta conforme [autenticação](docs/autenticacao.md). Enquanto o Keycloak estiver desabilitado, a página de login permanece acessível e o painel fica protegido.

## Qualidade

```sh
bun run lint
bun run typecheck
bun test
bun run build
bun run format:check
bun run test:e2e
```

Para os testes de navegador, instale o Chromium com `bunx --bun playwright install chromium`. Os testes E2E ficam em arquivos `.spec.ts`; o Bun Test executa os testes unitários `.test.ts`.

## Docker

Com `.env` configurado, execute `docker compose up --build -d`. A aplicação fica disponível apenas em `127.0.0.1:3000`. PostgreSQL possui volume persistente e rede interna, sem porta publicada. Não utilize as credenciais de exemplo em produção. Senhas com caracteres especiais precisam ser codificadas para uso na URL de conexão do Compose.

Para desenvolvimento de repositories no host, é necessário disponibilizar uma instância PostgreSQL de desenvolvimento e ajustar `DATABASE_URL`; o banco do Compose permanece sem porta publicada por padrão.

Veja [a fundação](docs/fundacao.md) para arquitetura, migrações e operação.

## Contratos e GLPI

O painel possui módulos protegidos em `/contracts` e `/tickets`. Consulte [as integrações](docs/integracoes.md) para aplicar migrações, capturar os contratos da secretaria e configurar a conta de leitura do GLPI. Indicadores exibem a última captura disponível; vínculos manuais permanecem no DSI Panel.
