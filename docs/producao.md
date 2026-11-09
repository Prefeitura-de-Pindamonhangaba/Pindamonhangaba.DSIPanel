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

O arquivo `docker/compose.keycloak-production.yml` pode ser instalado como `compose.yml` no diretório próprio do Keycloak. O Nginx Proxy Manager encaminha por HTTPS para `10.0.0.193:8082`, publicado com `KC_BIND_ADDRESS=10.0.0.193` e `KC_HTTP_PORT=8082`, mapeando a porta interna 8443. Configure `KC_PROXY_TRUSTED_ADDRESSES` para o IP do proxy e encaminhe `X-Forwarded-Proto`, host e porta corretamente. A porta de gerenciamento não é publicada.

Para administração interna sem depender do DNS público, configure `KC_HOSTNAME_ADMIN=https://10.0.0.193:8082` e a URL de frontend apenas do realm `master` para esse mesmo endereço. O hostname global e o realm institucional continuam usando o domínio SSO. O certificado interno precisa conter o IP no SAN; mantenha certificado e chave em `tls/server.crt` e `tls/server.key`, com chave legível apenas pelo usuário do Keycloak. A CA fica no servidor; somente sua parte pública é fornecida aos clientes para confiança manual. No proxy, valide o certificado do upstream com essa CA. Essa configuração é separada do certificado público do domínio, que permanece necessário para o acesso externo.

Configure `KC_DB_URL` com JDBC PostgreSQL, `sslmode=verify-full` e `sslrootcert=/certificates/postgres-root.crt`, além de `KC_DB_USERNAME`, `KC_DB_PASSWORD` e as credenciais de bootstrap administrativo em arquivo privado. `KC_HOSTNAME` fixa `https://sso.pindamonhangaba.sp.gov.br`.

A migração de um realm usa exportação consistente com a origem parada, backup anterior e importação com `--override false`. Proteja os arquivos exportados: podem conter credenciais de usuários e clientes. Preserve os identificadores dos usuários, revise papéis e redirecionamentos e gere segredo próprio para o cliente do painel em produção. Sessões existentes exigirão novo login. Temas personalizados precisam ser transferidos separadamente.

No cliente do painel, use somente o callback `https://dsi.pindamonhangaba.sp.gov.br/api/auth/callback/keycloak` e a origem `https://dsi.pindamonhangaba.sp.gov.br`. O domínio SSO e o domínio do painel devem ter DNS e certificados válidos antes da validação final do login.
