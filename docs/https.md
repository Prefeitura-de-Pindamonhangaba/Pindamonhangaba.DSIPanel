# HTTPS na rede interna

O Compose inclui Caddy como proxy de entrada. Ele recebe HTTPS na porta APP_PORT e encaminha para app:3000 pela rede Docker. Apenas o proxy publica porta no host; a aplicação e o banco ficam sem portas públicas. O Caddy lê APP_URL diretamente do .env e extrai o nome do servidor para atender também clientes que acessam por IP sem enviar SNI.

```env
APP_URL=https://10.0.0.16:3002
APP_BIND_ADDRESS=0.0.0.0
APP_PORT=3002
```

APP_PORT deve corresponder à porta de APP_URL. Para domínio HTTPS sem porta explícita, use APP_PORT=443. Mudar APP_URL não configura DNS nem firewall. A configuração atual usa um IP privado: o Caddy emite e renova o certificado por uma CA local, persistida no volume caddy_data. Não remova esse volume nas atualizações. O acesso HTTP à mesma porta é redirecionado para HTTPS antes de atingir a aplicação.

## Subir no servidor

```sh
docker compose up -d --build app proxy
docker compose ps
```

Quando mudar apenas o .env:

```sh
docker compose up -d --no-build --force-recreate app proxy
```

Copie também a pasta docker/ para o servidor, pois contém a configuração e o inicializador do proxy. O certificado é criado pelo servidor onde esse Compose está rodando; uma instalação em outro host gera outra CA.

## Confiar no certificado do painel

No servidor de deploy, exporte SOMENTE o certificado público da CA:

```sh
mkdir -p certificates
docker compose cp proxy:/data/caddy/pki/authorities/local/root.crt certificates/dsi-panel-root.crt
```

Em PowerShell, use New-Item -ItemType Directory -Force certificates no lugar de mkdir -p. Distribua esse arquivo público aos computadores autorizados. Nunca exporte root.key ou chaves privadas.

No Windows de cada cliente, após confirmar que o arquivo veio do servidor correto:

```powershell
certutil -user -addstore Root .\certificates\dsi-panel-root.crt
```

O comando adiciona a CA ao repositório de confiança do usuário atual. Feche e abra o navegador. Em ambiente corporativo, a equipe de infraestrutura pode distribuir a CA por política. Sem essa confiança, haverá alerta de certificado no navegador. Não desative a validação TLS para resolver isso.

## Keycloak

Use os seguintes valores no cliente do DSI Panel:

- URL raiz e inicial: https://10.0.0.16:3002.
- URI de redirecionamento válida: https://10.0.0.16:3002/api/auth/callback/keycloak.
- Origens Web: https://10.0.0.16:3002.

O login continuará recusando uma origem HTTP diferente da APP_URL. Essa proteção é necessária para as operações autenticadas.

O certificado do Keycloak é independente do certificado do painel. Se o container indicar UNABLE_TO_VERIFY_LEAF_SIGNATURE ao consultar o discovery, corrija a cadeia de certificados no servidor Keycloak ou disponibilize a CA pública que o assina. Depois de obter esse certificado por uma origem confiável, coloque-o em certificates/keycloak-ca.pem e configure:

```env
NODE_EXTRA_CA_CERTS=/certificates/keycloak-ca.pem
```

O diretório certificates/ é montado somente para leitura na aplicação e nas ferramentas, e fica fora do Git e da imagem. Recrie app e proxy após configurar. Use apenas certificados públicos nesse diretório. Não use NODE_TLS_REJECT_UNAUTHORIZED=0 nem flags de ignorar certificados. Para uma CA privada, confirme a origem e a impressão digital com a equipe responsável pelo Keycloak.

## Validar

O proxy tem verificação de saúde em sua API administrativa local, que não é publicada. A aplicação mantém seu próprio healthcheck interno. A validação da conexão externa deve usar a CA confiável e o nome/IP de APP_URL. Confira o redirecionamento HTTP, a página de login HTTPS, o cookie Secure e o callback HTTPS no início do login. O login completo exige que o Keycloak esteja acessível com uma cadeia confiável e que a conta tenha um papel autorizado no cliente.

Referências: [HTTPS automático do Caddy](https://caddyserver.com/docs/automatic-https), [TLS e CA interna](https://caddyserver.com/docs/caddyfile/directives/tls), [certificados adicionais no Bun](https://bun.sh/reference/node/tls/getCACertificates).

## Erro “Origem não autorizada” no login

O payload com provider=keycloak, callbackURL=/ e errorCallbackURL=/login?sso=error está correto. O servidor compara o cabeçalho Origin do navegador com a origem de APP_URL. Protocolo, nome/IP e porta devem coincidir. A configuração do cliente Keycloak não substitui essa validação no painel.

Em 09/11/2026, a verificação do servidor 10.0.0.16:3002 mostrou HTTP ativo, HTTPS indisponível e APP_URL esperado em HTTPS. Por isso, autenticar pela página HTTP recebia 403. A solução é aplicar o Compose com o serviço proxy no servidor, e não liberar origens arbitrárias.

No servidor, depois de atualizar os arquivos deste projeto e manter APP_URL=https://10.0.0.16:3002 no .env:

```sh
docker compose config --services
docker compose up -d --build app proxy
docker compose ps
```

A lista de serviços precisa incluir proxy. Se não incluir, o servidor ainda está com o Compose anterior. Confira que só proxy publica a porta 3002, e então abra https://10.0.0.16:3002/login. Se necessário, exporte e confie na CA desse servidor conforme as instruções acima. Não use um certificado de outra instalação.

A tela de login agora identifica o acesso por outra origem e oferece o endereço configurado antes de enviar a autenticação. A API mantém 403 para origens divergentes e retorna o código AUTH_ORIGIN_MISMATCH, com a URL pública permitida. Não são registrados cookies, tokens ou credenciais.

Se surgir outro erro depois de corrigir a origem, verifique separadamente o certificado do Keycloak e os papéis do cliente. O erro de CA UNABLE_TO_VERIFY_LEAF_SIGNATURE não deve ser contornado desabilitando TLS.
