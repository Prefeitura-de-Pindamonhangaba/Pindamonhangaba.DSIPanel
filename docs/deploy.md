# Build e deploy com Docker

## Decisão

A imagem final utiliza o output standalone do Next.js, executado por Bun como usuário não privilegiado. Apenas arquivos rastreados do servidor, assets e um validador de configuração empacotado entram no runtime. O validador é empacotado com Bun para não depender dos módulos de desenvolvimento ou de fontes TypeScript na imagem final. Cookies, autorização, headers de segurança e configuração por ambiente continuam ativos.

O BuildKit conserva os downloads do Bun e o cache de compilação do Next.js. Alterações em documentação, testes e migrações não invalidam a compilação da aplicação. Ferramentas de migração e navegador são targets separados e não são construídos no deploy da aplicação. Não há instalação de Node.js.

O target checks executa lint, tipagem e testes unitários separadamente. A compilação de produção mantém a verificação TypeScript do Next.js. A separação evita repetir a suíte em cada deploy da mesma revisão; o pipeline de entrega deve exigir os checks antes de publicar a imagem.

## Validar uma revisão

```sh
docker build --target checks -t dsi-panel-checks .
docker compose -f compose.test.yml up --build --abort-on-container-exit --exit-code-from auth-tests
docker compose -f compose.test.yml down
```

Os testes de banco usam uma instância isolada e descartável. Para navegador, utilize compose.browser-test.yml; o Chromium só é instalado no target browser-tests. Não construa esse target no servidor de produção.

## Implantar

Com .env configurado e após backup do banco:

```sh
docker compose build app
# Somente quando houver migrações novas:
docker compose --profile tools build tools
docker compose run --rm -T tools db:migrate
# Inicialização não executa migrações:
docker compose up -d --no-build app proxy
docker compose ps
```

Para medir somente o build, use docker compose build app. Evite --no-cache nas atualizações normais. Preserve o cache do builder entre deploys; em CI descartável, configure cache externo do BuildKit no pipeline. O primeiro build ainda depende do download da imagem base e das dependências, da rede e dos recursos do servidor.

Para consultar o tamanho lógico em bytes:

```sh
docker image inspect pindamonhangabadsipanel-app --format '{{.Size}}'
```

Não inclua .env, backups ou tokens na imagem. São excluídos pelo .dockerignore. Segredos são recebidos apenas na execução. Mantenha a imagem anterior para rollback e avalie separadamente a compatibilidade das migrações.

## Medições locais em 03/11/2026

Nesta máquina, o primeiro build com o novo cache levou 88,1 segundos, incluindo instalação de dependências; uma recompilação após alteração em fonte levou 39,2 segundos. Reutilizando as camadas da aplicação, uma execução levou 4,4 segundos, incluindo a criação da nova camada do validador. A imagem final passou de 272.816.681 para aproximadamente 119 milhões de bytes. Esses números são medições locais, não garantia de tempo em outro servidor.

A execução final foi validada com Bun no container, páginas protegidas, assets e navegação em computador e celular. O teste do modo sem login é feito em container temporário separado, sem alterar o .env da instalação.

## Endereço e porta definidos pelo .env

APP_URL é a URL usada no navegador, nos retornos do login e na verificação de origem. APP_BIND_ADDRESS é o IP local onde o Docker publica o serviço; 0.0.0.0 permite acesso pelas interfaces de rede do host. APP_PORT é a porta do host. A porta interna permanece 3000, com HOSTNAME=0.0.0.0; esse endereço interno não deve ser substituído pelo IP público.

Acesso direto pela rede interna:

```env
APP_URL=http://10.0.0.16:3002
APP_BIND_ADDRESS=0.0.0.0
APP_PORT=3002
```

Acesse a URL acima. Se alterar a porta, ajuste APP_URL e APP_PORT juntos. O endereço precisa pertencer ao servidor ou resolver para ele; definir APP_URL não configura DNS, firewall nem certificados.

Com HTTPS, o Caddy incluído no Compose recebe a conexão e encaminha para app:3000. Para um IP interno, é necessário confiar na CA local emitida pelo servidor. Veja [HTTPS e configuração do Keycloak](https.md). Para um domínio público sem porta explícita, configure APP_PORT=443.

Após mudar apenas endereços ou credenciais:

```sh
docker compose up -d --no-build --force-recreate app proxy
```

Não é necessário recompilar. Use up, e não apenas restart, para atualizar as variáveis e o mapeamento de portas. No Keycloak, os endereços de callback e a web origin devem corresponder à nova APP_URL. O log de inicialização informa a URL pública; o endereço localhost:3000 exibido pelo Next.js refere-se ao processo dentro do container.

Para testes sem login, configure APP_URL com localhost e APP_BIND_ADDRESS=127.0.0.1. A inicialização recusa esse modo em interfaces abertas.

## Recursos e logs

O .env permite ajustar APP_CPUS, APP_MEMORY_LIMIT, POSTGRES_CPUS e POSTGRES_MEMORY_LIMIT. Os padrões são 1 CPU/768 MB para a aplicação e 1 CPU/512 MB para PostgreSQL. São limites de execução, não uma reserva fixa nem limites do builder. Ajuste-os conforme o volume e monitore docker stats. Os logs de cada serviço são limitados a três arquivos de 10 MB; o PostgreSQL continua em rede interna e sem porta publicada. O proxy tem limites próprios via PROXY_CPUS e PROXY_MEMORY_LIMIT. O processo da aplicação usa init para encaminhar sinais e encerrar filhos corretamente, com 30 segundos para desligamento.

O target tools tem diretório de trabalho e migrações graváveis pelo usuário bun. O target checks também executa sem root. As três configurações de Compose são validadas separadamente: compose.yml para deploy, compose.browser-test.yml para navegador e compose.test.yml para banco isolado. O teste de saúde consulta o processo interno, independentemente do IP público, porta externa ou proxy TLS.

## Revisão de publicação em 04/11/2026

A publicação passou a ler APP_BIND_ADDRESS e APP_PORT do .env, preservando APP_URL para a origem pública. O Compose foi validado com endereço de rede/porta 3002 e com domínio HTTPS atrás de proxy. Nesta revisão, o build com alterações levou 41,2 segundos e a repetição com cache levou 2,1 segundos. Passaram 35 testes unitários, três de integração com PostgreSQL isolado e seis cenários de navegador; quatro cenários exclusivos do modo sem login foram omitidos na configuração institucional atual.
