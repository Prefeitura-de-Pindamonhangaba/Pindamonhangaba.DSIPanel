# Login institucional

## Decisão

O DSI Panel segue o fluxo do [DadosPinda](https://github.com/Prefeitura-de-Pindamonhangaba/Pindamonhangaba.DadosPinda): Keycloak é a única forma de login, com Better Auth e adapter Drizzle. A dependência evita implementar sessões, OIDC e criptografia do zero. O SDK valida os tokens por discovery/JWKS e gerencia Authorization Code, state, nonce e PKCE S256. Tokens OAuth persistidos são criptografados com `BETTER_AUTH_SECRET`.

A conta local usa UUID estável, com vínculo explícito por par `issuer` + `sub`. Não há associação automática por e-mail, cadastro público, importação de papéis do realm nem login por senha local. A tabela de credenciais mantém os campos exigidos pelo SDK; nenhum fluxo de senha local está habilitado.

## Configurar

Os campos de autenticação do `.env` foram deixados vazios para configuração da instalação. O `.env.example` documenta:

```env
BETTER_AUTH_SECRET=
KEYCLOAK_ENABLED=false
KEYCLOAK_ISSUER=
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=
```

Gere um segredo aleatório de pelo menos 32 caracteres para `BETTER_AUTH_SECRET` e preserve-o nas atualizações. Use `KEYCLOAK_ISSUER` com a URL HTTPS completa do realm, sem query string ou credenciais. Configure um cliente confidencial exclusivo do painel: client authentication e standard flow habilitados, PKCE S256, scopes `openid profile email`, usuários com e-mail verificado. Não habilite implicit flow ou direct access grants.

Registre callback e origem exatos, correspondentes a `APP_URL`:

- Callback local: `http://localhost:3000/api/auth/callback/keycloak`.
- Web origin local: `http://localhost:3000`.
- Em produção: a mesma rota na origem HTTPS do painel, sem curingas.

`APP_URL` permite HTTP somente em loopback local. O issuer do Keycloak exige HTTPS confiável também no container. Para acesso pela rede, configure origem HTTPS e proxy reverso. Cabeçalhos de autenticação e parâmetros do callback (code/state) não devem ser registrados por proxies externos.

Com `KEYCLOAK_ENABLED=false`, `/login` mostra o botão indisponível e `/` redireciona para login. Depois de preencher credenciais, aplicar migrações e provisionar a primeira conta, altere para `true` e execute `docker compose up --build -d`. Configuração habilitada incompleta impede a inicialização, sem imprimir os valores dos segredos.

## Migração explícita

O Compose não executa migrações na inicialização. Com PostgreSQL disponível e após realizar backup:

```sh
docker compose --profile tools build tools
docker compose run --rm -T tools db:migrate
```

A migração inicial cria contas, sessões, verificação OIDC, limitação de requisições, papéis, permissões, suas associações e auditoria. O banco continua em rede interna, sem porta publicada.

## Provisionar acesso

A ferramenta abaixo é administrativa e deve ser executada somente por operadores com acesso autorizado ao host/Docker. Lê JSON por stdin e não imprime dados pessoais ou credenciais. `KEYCLOAK_ISSUER` precisa estar preenchido; o login pode continuar desabilitado durante o provisionamento.

Primeira conta, em PowerShell (substitua pelos valores reais; `subject` é o `sub` imutável recebido pelo cliente OIDC, não o e-mail):

```powershell
@{
  action = 'provision'
  name = 'Nome do administrador'
  email = 'administrador@seu-orgao.example'
  subject = 'SUB_NO_KEYCLOAK'
  role = 'admin'
} | ConvertTo-Json -Compress | docker compose run --rm -T tools auth:provision
```

A ferramenta retorna somente o UUID interno e a confirmação. Para contas seguintes, adicione `actorId` com o UUID de um administrador local ativo e escolha `role = 'member'` ou `'admin'`. `member` recebe `dashboard:read`; `admin` recebe também `users:manage` e `integrations:manage`. Não há tela de administração nesta entrega.

Não reutilize um vínculo para outra conta: identidades e e-mails duplicados são recusados com rollback. Bootstrap e provisionamento são transacionais e serializados para impedir duas primeiras contas concorrentes. Não é possível obter acesso somente por possuir e-mail no mesmo domínio.

Desativação local revoga as sessões em uma transação e gera auditoria:

```powershell
@{
  action = 'deactivate'
  actorId = 'UUID_DO_ADMINISTRADOR'
  userId = 'UUID_DO_USUARIO'
} | ConvertTo-Json -Compress | docker compose run --rm -T tools auth:provision
```

O último administrador ativo não pode ser desativado. O acesso aos comandos equivale a acesso administrativo ao banco e precisa ser restrito pela infraestrutura.

## Sessões, autorização e limites

Sessões locais duram oito horas, sem renovação automática. Cookies são HttpOnly e SameSite=Lax; Secure é aplicado em origens HTTPS. O prefixo próprio evita compartilhar cookies de sessão com DadosPinda. O controller do dashboard verifica autenticação e `dashboard:read` no servidor. Usuários desativados ou sem permissão são negados em cada requisição, sem cache de permissões no navegador.

Somente entrada Keycloak, callback e saída são expostos pela API. POST exige origem exata, JSON limitado a 4 KiB e campos permitidos; URLs de retorno são fixas. O SDK limita entradas a cinco tentativas por minuto e callbacks a dez. O limite usa armazenamento no banco e um grupo compartilhado da instalação, sem confiar em cabeçalhos de IP fornecidos pelo cliente. Se o departamento necessitar maior volume, configure limitação por IP em proxy confiável e revise essa política.

A auditoria registra provisionamento, desativação, criação/recusa de sessão de contas conhecidas e saída. Não armazena tokens nem corpos de requisição. Falhas internas usam eventos técnicos sanitizados, separados da auditoria.

Sair revoga somente a sessão do DSI Panel. A sessão SSO global no Keycloak é preservada. Desabilitar alguém apenas no Keycloak não encerra sessões locais existentes; use a desativação local para efeito imediato. Backchannel logout e sincronização de grupos não fazem parte desta etapa.

## Verificação

```sh
bun run lint
bun run typecheck
bun test
bun run build
```

Fluxo OIDC com RSA/JWKS fictícios e PostgreSQL efêmero isolado, sem Keycloak real:

```sh
docker compose -p dsi-panel-auth-test -f compose.test.yml up --build --abort-on-container-exit --exit-code-from auth-tests
docker compose -p dsi-panel-auth-test -f compose.test.yml down
```

O banco de teste usa tmpfs e nome com sufixo `_test`; não recebe dados ou credenciais do banco da instalação. O teste cobre PKCE, cookies, vínculo explícito, tokens criptografados, replay, claims inválidas, saída e conta desativada.

Testes de navegador cobrem a tela pública sem Keycloak configurado, redirecionamento de visitante e endpoints bloqueados. Para executar em container com Bun e Chromium, mantendo o navegador fora da imagem final da aplicação:

```sh
docker compose -f compose.yml -f compose.browser-test.yml run --build --rm -T browser-tests
```

As capturas são gravadas em `test-results/` (ignorado pelo Git). A instalação local também é possível, mas o Bun no Windows pode apresentar incompatibilidade na inicialização dos workers do Playwright. Com a aplicação Docker local nesse estado, em PowerShell:

```powershell
$env:E2E_BASE_URL = 'http://localhost:3000'
$env:PLAYWRIGHT_CHANNEL = 'msedge' # opcional, se o Edge estiver instalado
bun run test:e2e
```

Sem browser instalado, use `bunx --bun playwright install chromium`. A homologação de login real depende de configurar o realm, o cliente e a conta autorizada.

## Acesso para testes locais

Defina AUTH_BYPASS_ENABLED=true no .env e execute docker compose up -d --build app. O painel abre sem login com a identidade temporária Teste local, somente para leitura. Não cria usuário nem sessão e não libera sincronização, vínculos ou administração. A aplicação recusa a flag em endereços APP_URL fora de localhost, 127.0.0.1 e ::1. O container continua limitado a 127.0.0.1 por padrão; não exponha este modo por proxy ou túnel. Para restaurar o login, defina AUTH_BYPASS_ENABLED=false e execute docker compose up -d app. O exemplo versionado mantém a flag desativada.
