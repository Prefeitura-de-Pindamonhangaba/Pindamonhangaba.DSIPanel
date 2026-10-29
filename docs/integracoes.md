# Integrações: contratos e chamados do DSI

## Arquitetura e operação

Os módulos `contracts` e `tickets` seguem Controller → Service → Repository/Adapter. As páginas não consultam diretamente os sistemas externos: usam capturas PostgreSQL completas e transacionais. Uma falha de rede, paginação ou validação preserva a captura anterior e sinaliza indisponibilidade com a data da última atualização.

A captura é explícita, pelo botão **Atualizar dados** (administradores) ou pelos comandos abaixo. Não há atualização periódica automática nesta etapa. Para uma primeira carga grande do GLPI, prefira a ferramenta de linha de comando, sem o limite de espera de um proxy HTTP. A interface indica a posição da última captura; não apresenta os números como tempo real.

A permissão `dashboard:read` permite consultar os módulos. `integrations:manage` permite sincronizar e ajustar vínculos locais. O papel `admin` recebe essa permissão no provisionamento; a migração também a concede ao papel `admin` já existente. As verificações são realizadas no servidor, com validação Zod, origem exata nos POSTs, limite de corpo e auditoria. Credenciais nunca são enviadas às views.

## Preparar o banco e capturar contratos

Faça backup do banco antes de migrar. As migrações são explícitas, sem execução automática no início da aplicação:

```sh
docker compose --profile tools build tools app
docker compose run --rm -T tools db:migrate
docker compose run --rm -T tools sync:contracts
docker compose up -d app
```

A aplicação fica em [http://localhost:3000](http://localhost:3000), protegida pelo login institucional. A captura pelo operador autorizado do host pode ser feita mesmo enquanto o Keycloak está desabilitado. Nesse caso a auditoria registra um evento de sistema sem inventar um usuário responsável.

## Portal da Transparência

Fonte oficial: [Swagger do portal](https://siapegov.pindamonhangaba.sp.gov.br/portal-transparencia/api-docs). A URL efetivamente publicada possui o prefixo `/portal-transparencia/api/`, embora o Swagger informe apenas `/api`.

A entidade é `1`, Município de Pindamonhangaba. A listagem cobre o período desde 1900 até o dia atual em `America/Sao_Paulo`, para incluir instrumentos antigos prorrogados. A API não documenta paginação nessa listagem. O adapter valida a resposta completa e recusa IDs duplicados.

Unidades incluídas por nome normalizado exato:

- `SECRETARIA MUNICIPAL DE TECNOLOGIA, INOVAÇÃO E PROJETOS`;
- `DEPARTAMENTO DE TECNOLOGIA E INFORMAÇÃO`, incluído por solicitação expressa para abranger o contrato VERO 142B/2020. A unidade original permanece visível.

A vigência exige início já alcançado, término não ultrapassado (dia final inclusivo) e situação reconhecida como ativa. Rescindidos, encerrados, suspensos, situações desconhecidas e datas ausentes não são apresentados como vigentes. É considerado o último aditivo com data de assinatura até hoje e término informado; um termo também pode reduzir o prazo. A vigência é reavaliada em cada leitura, mesmo antes de nova captura.

Endpoints utilizados:

- `licitacoes/contratos/contratos`: catálogo;
- `licitacoes/contratos/ajustes`: termos e prorrogações;
- `licitacoes/contratos/anexos`: documentos do contrato;
- `licitacoes/licitacoes/index`: processos, consultados uma vez por ano necessário;
- `licitacoes/licitacoes/anexos`: edital e demais anexos do processo correspondente.

A associação da licitação considera número do processo dentro do seu ano. Se não houver correspondência única, o painel sinaliza a pendência. Os links de download são construídos com IDs validados nas rotas usadas pelo próprio portal: `licitacoes/contratos/anexos.anexo` e `licitacoes/licitacoes/anexos.anexo`. Foram conferidas respostas PDF reais para ambas.

A interface mantém editais de reabertura, instrumentos, aditivos e demais documentos publicados. Não presume que um documento consolide todos os termos. Quando o instrumento original não está nos anexos específicos do contrato, orienta conferir os aditivos e os documentos da licitação. Contratações diretas podem não possuir edital de licitação. Arquivos ausentes ou associações ambíguas são identificados, sem links inventados.

Persistimos somente os dados necessários à consulta: objeto, empresa/CNPJ, número, unidade, datas, valor, processo e documentos. CPF, nomes de fiscais e gestores e respostas brutas não são armazenados nas tabelas de integração. A classificação de vigência representa os dados publicados pelo portal; a conferência documental continua sendo necessária.

## Configurar GLPI

Fonte: [documentação da API da instalação](https://glpi.pindamonhangaba.sp.gov.br/apirest.php/). Crie uma aplicação/API client e uma conta de serviço autorizada com permissões de leitura das entidades que abrangem os chamados do DSI, dos grupos e atores de chamados, fornecedores e contratos. Não use uma conta pessoal nem exponha os tokens no navegador.

Preencha somente o `.env` privado:

```env
GLPI_API_URL=https://glpi.pindamonhangaba.sp.gov.br/apirest.php/
GLPI_APP_TOKEN=
GLPI_USER_TOKEN=
GLPI_DSI_GROUP_ID=
GLPI_TIME_ZONE=America/Sao_Paulo
```

As chaves foram deixadas vazias. `GLPI_APP_TOKEN` é o token da aplicação; `GLPI_USER_TOKEN`, a chave de acesso remoto do usuário de serviço. Mantenha as restrições de IP do cliente API compatíveis com o IP de saída do host/container. Os dois tokens ausentes deixam o módulo em estado de configuração pendente; configuração parcial não é aceita para captura.

O ID do grupo é opcional: vazio permite localizar exatamente um grupo com nome `DSI`. Em caso de nomes duplicados, informe o ID para evitar escolher outro grupo. O fuso deve corresponder ao utilizado pelo GLPI em suas datas sem offset. URLs de API exigem HTTPS e não aceitam credenciais, query string ou fragmento.

Depois:

```sh
docker compose run --rm -T tools sync:glpi
docker compose up -d app
```

O Compose transmite as variáveis somente aos containers de backend. Não é necessário reconstruir a imagem apenas para alterar credenciais, mas é necessário recriar a aplicação para atualizar seu ambiente. A conta de integração precisa ter acesso a todas as entidades e chamados desejados: o dashboard não amplia as permissões concedidas pelo GLPI.

## Escopo de chamados e SLA

A integração abre uma sessão com `initSession`, usa `Session-Token` e encerra com `killSession`, inclusive após falhas. As operações de negócio no GLPI são somente GET; nenhum chamado, fornecedor, contrato ou vínculo é alterado no sistema de origem. Não há acesso direto ao banco do GLPI.

São percorridas todas as páginas das relações `Group/{id}/Group_Ticket` e da busca de tickets. Relações de tipo `2` (atribuído) e `3` (observador) são incluídas; solicitante sozinho não é incluído. Um chamado em ambos os papéis é deduplicado. A busca ainda confere as opções de grupo e de cálculo SLA da própria API. Mudanças no total durante a paginação, páginas incompletas ou falhas de permissão interrompem a captura, preservando a anterior.

Chamados removidos são excluídos. Abertos são os estados `1`, `2`, `3` e `4`; solucionados e fechados são `5` e `6`. O dashboard apresenta totais abertos, atrasos de SLA, pendentes, prioridades altas, abertos sem contrato, solucionados nos últimos 30 dias, idade média e ausência de SLA/cálculo.

O SLA usa os campos calculados pelo próprio GLPI (`sla_ttr_is_late` e `sla_tto_is_late`), localizados por `listSearchOptions`. Só conta atraso de SLA quando existe SLA de solução ou atendimento correspondente. Pendentes respeitam a suspensão definida no GLPI. Um prazo manual vencido sem SLA configurado não é inventado como violação de SLA. Valores desconhecidos são sinalizados como cálculo indisponível. Os indicadores não são extraídos nem inferidos do texto de um edital; os documentos ficam acessíveis para conferência das regras da contratação.

Persistimos ID, título, estado, prioridade, datas, indicadores de SLA, papéis do grupo e referências de fornecedores/contratos. Descrições, conversas, nomes de solicitantes, e-mails e respostas brutas não são persistidos. Os tokens permanecem somente no ambiente e na memória da sessão de integração.

## Associação por contrato e fornecedor

Ordem de resolução:

1. Vínculo manual explícito do chamado no painel.
2. Contrato associado no GLPI (`with_contracts=true`), com número/ano correspondente e único no catálogo da secretaria.
3. Fornecedor com CNPJ correspondente a um único contrato vigente. Se o fornecedor não possui CNPJ no GLPI, é permitido nome normalizado exato e único; não há busca aproximada. CNPJ divergente não é substituído por coincidência de nome.
4. Ambiguidades e ausências permanecem agrupadas no fornecedor ou em “Sem contrato ou fornecedor”.

A API pública da instalação foi analisada, mas contratos em campos de plugins customizados precisam ser identificados na homologação. Até isso ocorrer, um vínculo ausente pode ser resolvido por administrador na fila. Alterações são locais ao DSI Panel, auditadas com usuário, chamado, resultado e horário. Não alteram o GLPI.

Cada chamado pertence a um único agrupamento do dashboard; a soma dos abertos dos grupos corresponde ao total global. Filtros e paginação atuam na fila, sem alterar o significado dos indicadores globais. As tabelas também permitem acessar diretamente o chamado no GLPI.

## Verificação e limites

```sh
bun run lint
bun run typecheck
bun test
bun run build
bun run format:check
docker compose -p dsi-panel-auth-test -f compose.test.yml up --build --abort-on-container-exit --exit-code-from auth-tests
docker compose -p dsi-panel-auth-test -f compose.test.yml down
docker compose -f compose.yml -f compose.browser-test.yml run --build --rm -T browser-tests
```

Há testes com respostas fictícias para paginação, papéis do grupo, deduplicação, SLA, associação ambígua, CNPJ divergente, timeout/falhas e autorização. Os testes de banco usam PostgreSQL isolado em tmpfs e verificam persistência, idempotência, rollback e auditoria. A navegação protegida é verificada em desktop e celular. A homologação com chamados reais depende de fornecer credenciais válidas com as permissões descritas acima.
