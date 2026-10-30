# Login institucional

## Fluxo e autoridade

O DSI Panel replica a autenticação do [Pinda Dados](https://github.com/Prefeitura-de-Pindamonhangaba/Pindamonhangaba.DadosPinda), com Better Auth, PostgreSQL e Drizzle. O Keycloak é a única origem de identidade e dos papéis. O SDK valida assinatura, issuer, audience, state, nonce e PKCE S256; tokens OAuth são criptografados com BETTER_AUTH_SECRET.

No primeiro login com um papel autorizado do próprio cliente, o painel cria automaticamente o usuário e o vínculo por issuer + sub. O UUID local é estável. Contas existentes com esse vínculo são preservadas. Não há associação por e-mail, senha local, cadastro público ou confiança em papéis de outros clientes ou do realm. O SDK recebe um e-mail técnico determinístico no domínio identity.invalid; e-mail pessoal e e-mail verificado não são requisitos de acesso.

Papéis em resource_access[KEYCLOAK_CLIENT_ID].roles, em ordem de precedência:

| Papel    | Permissões no DSI Panel                                    |
| -------- | ---------------------------------------------------------- |
| viewer   | Visualizar início, contratos e chamados                    |
| operator | Visualizar e gerenciar integrações e vínculos de contratos |
| admin    | Permissões de operator e users:manage                      |

O banco mantém um espelho dos papéis nas tabelas RBAC existentes. A autorização durante a sessão usa os papéis verificados pelo Keycloak, nunca uma promoção feita apenas no banco. Papéis e nome são atualizados no login e na revalidação. Não é necessária migração estrutural.

## Configuração

```env
BETTER_AUTH_SECRET=
KEYCLOAK_ENABLED=false
KEYCLOAK_ISSUER=
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=
AUTH_BYPASS_ENABLED=false
```

Configure um cliente confidencial exclusivo para o DSI Panel com standard flow, client authentication, PKCE S256 e scopes openid profile. Crie viewer, operator e admin como papéis desse cliente, atribua apenas os necessários e inclua o mapper de client roles no ID token. Não reutilize o client ID do Pinda Dados. Realm roles e papéis de outro cliente não dão acesso.

BETTER_AUTH_SECRET exige pelo menos 32 caracteres aleatórios e deve ser preservado entre atualizações. KEYCLOAK_ISSUER deve ser a URL HTTPS completa do realm, com certificado confiável no container. A configuração habilitada incompleta impede a inicialização sem revelar segredos.

Registre origens exatas, sem curingas:

- Callback local: http://localhost:3000/api/auth/callback/keycloak.
- Web origin local: http://localhost:3000.
- Produção: a mesma rota sob a origem HTTPS definida em APP_URL.

Após preencher as configurações, habilite KEYCLOAK_ENABLED=true, desative AUTH_BYPASS_ENABLED e execute docker compose up -d --build app. Se o Keycloak estiver desabilitado, o botão de login fica indisponível. Não copie credenciais de outros sistemas.

## Sessões e revogação

A sessão local dura oito horas, sem renovação de sua validade. Cookies são HttpOnly, SameSite=Lax e Secure em HTTPS, com prefixo próprio dsi-panel. A primeira requisição autenticada revalida os tokens no Keycloak; verificações subsequentes são reaproveitadas por até 60 segundos por sessão. Verificações concorrentes do mesmo usuário compartilham a renovação. O SDK valida o novo ID token antes de sincronizar os papéis.

Remoção de papéis, identidade divergente, ausência de ID token, falha na renovação ou indisponibilidade do provedor negam o acesso e revogam as sessões locais daquele usuário. Uma alteração no Keycloak é percebida na próxima requisição após a janela de até 60 segundos. Isso exige acesso do container ao Keycloak e emissão de refresh tokens.

Sair revoga a sessão do painel e preserva o SSO global do Keycloak, como no Pinda Dados. Backchannel logout não foi implementado.

O provisionamento manual legado auth:provision permanece disponível para compatibilidade operacional, mas seus papéis e desativações locais não são a autoridade do login institucional. O próximo login autorizado pode reativar a conta e substituir seus papéis. Para conceder, remover ou desativar acesso, utilize o Keycloak. Contas manuais sem papel autorizado no cliente não entram.

## Segurança e auditoria

Somente entrada Keycloak, callback e saída são expostos pela API. POST exige origem exata, JSON de até 4 KiB e destinos de retorno fixos. Login por senha, cadastro, vinculação e renovação direta de tokens pelo navegador são bloqueados. A revalidação usa somente chamadas internas ao SDK.

O login aceita cinco tentativas por minuto e o callback dez, com limite no PostgreSQL compartilhado pela instalação, sem confiar em IP fornecido pelo cliente. Eventos de provisionamento, mudança de nome/papel, criação, recusa e revogação de sessão são auditados. Tokens e respostas do provedor não são registrados.

## Banco e testes

As migrações não são executadas automaticamente na inicialização. Para uma instalação nova:

```sh
docker compose --profile tools build tools
docker compose run --rm -T tools db:migrate
```

Verificações:

```sh
bun run lint
bun run typecheck
bun test
bun run build
docker compose -f compose.test.yml up --build --abort-on-container-exit --exit-code-from auth-tests
docker compose -f compose.test.yml down
```

Os testes de integração usam PostgreSQL isolado e um provedor OIDC simulado com tokens assinados, sem utilizar credenciais reais.

## Acesso para testes locais

AUTH_BYPASS_ENABLED=true mantém o acesso sem login em localhost, 127.0.0.1 ou ::1, somente para leitura e com aviso visível. Não cria usuário nem sessão e não permite sincronização, vínculos ou administração. O exemplo versionado mantém a flag desativada. Não exponha este modo por proxy ou túnel. Para restaurar o login, defina false e execute docker compose up -d app.
