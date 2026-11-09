# Produção com PostgreSQL externo

O ambiente de produção usa `compose.production.yml`, separado do Compose de desenvolvimento. A aplicação recebe `DATABASE_URL` diretamente e não inicia PostgreSQL nem Caddy. O Nginx Proxy Manager existente termina HTTPS e encaminha para `10.0.0.193:3004`. A publicação usa `APP_BIND_ADDRESS` e `APP_PORT`; a porta interna permanece 3000. A URL de autenticação continua sendo o domínio HTTPS de `APP_URL`.

Copie `.env.production.example` para `.env.production`, preencha as credenciais próprias e restrinja o arquivo ao responsável pelo deploy. O login institucional é obrigatório nessa configuração. Não copie o `.env` nem o banco do DSI Panel de desenvolvimento para produção.

```sh
docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml build app
# Após backup e revisão das migrações pendentes:
docker compose --env-file .env.production -f compose.production.yml --profile tools build tools
docker compose --env-file .env.production -f compose.production.yml run --rm tools db:migrate
docker compose --env-file .env.production -f compose.production.yml up -d --no-build app
```

Em servidores com pouca memória, compile e valide as imagens em outra máquina, transfira a imagem pronta e utilize `--no-build`. Nunca execute a suíte de testes contra o banco de produção. As migrações são uma etapa explícita, não parte da inicialização. Guarde a revisão, os arquivos de configuração protegidos e a imagem anterior para recuperação.

A conexão PostgreSQL deve validar o servidor com TLS. Na instalação municipal, a CA pública fica em `certificates/postgres-root.crt`, com `NODE_EXTRA_CA_CERTS=/certificates/postgres-root.crt` e `sslmode=verify-full` na URL. A chave privada do banco permanece no servidor PostgreSQL. Bancos e usuários do painel e do Keycloak são distintos; a liberação de rede é específica ao servidor da aplicação.

## Keycloak

A infraestrutura do Keycloak é mantida no repositório [Pindamonhangaba.Containers](https://github.com/Prefeitura-de-Pindamonhangaba/Pindamonhangaba.Containers), diretório `Keycloak`. No servidor, a configuração ativa fica em `/opt/PRD/Pindamonhangaba.Containers/Keycloak`. O Compose principal desse repositório é usado sem alterações, junto da sobreposição `compose.production.yml` para PostgreSQL externo. O workflow do DSI Panel atualiza apenas o painel.

```sh
cd /opt/PRD/Pindamonhangaba.Containers/Keycloak
docker compose -p keycloak-production -f compose.yml -f compose.production.yml config --quiet
docker compose -p keycloak-production -f compose.yml -f compose.production.yml up -d --wait --wait-timeout 600 keycloak
```

A sobreposição desativa o PostgreSQL local no perfil padrão, preserva o banco migrado em `10.0.0.4` e utiliza JDBC com `sslmode=verify-full`. Credenciais ficam no `.env` privado dessa instalação; a CA pública do banco fica em `certificates/postgres-root.crt`.

O acesso administrativo usa `KC_HOSTNAME=https://10.0.0.193:8082`, `KC_BIND_ADDRESS=10.0.0.193` e `KC_HTTP_PORT=8082`, com HTTPS nativo na porta interna 8443. O certificado em `tls/server.crt` contém o IP no SAN; sua chave privada em `tls/server.key` fica legível apenas pelo Keycloak. O Nginx Proxy Manager encaminha por HTTPS para esse IP e verifica o certificado interno usando a CA correspondente. A confiança no certificado interno dos clientes é manual; o certificado público do domínio é uma configuração separada.

O realm `master` utiliza a URL canônica por IP. A URL de frontend do realm `pindamonhangaba` permanece `https://sso.pindamonhangaba.sp.gov.br`, preservando o issuer institucional utilizado pelo painel. Os endereços administrativos não dependem do DNS público. A publicação pública do SSO depende do DNS e do HTTPS no proxy.

A migração de um realm usa exportação consistente com a origem parada, backup anterior e importação com `--override false`. Proteja os arquivos exportados: podem conter credenciais de usuários e clientes. Preserve os identificadores dos usuários, revise papéis e redirecionamentos e gere segredo próprio para o cliente do painel em produção. Sessões existentes exigirão novo login. Temas personalizados precisam ser transferidos separadamente.

No cliente do painel, use somente o callback `https://dsi.pindamonhangaba.sp.gov.br/api/auth/callback/keycloak` e a origem `https://dsi.pindamonhangaba.sp.gov.br`. O domínio SSO e o domínio do painel devem ter DNS e certificados válidos antes da validação final do login.
