# Fundação do DSI Panel

## Decisão e escopo

Adotamos Next.js App Router, TypeScript strict e Bun em um monólito MVC modular. A rota inicial chama o controller do dashboard, que utiliza o service e entrega um DTO à view. Os conteúdos iniciais são estáticos, sem tabelas ou migrações artificiais. Não há indicadores de operação simulados. Autenticação, RBAC, auditoria e ferramentas de negócio pertencem às próximas fases.

Drizzle ORM e o driver PostgreSQL estão preparados para uso pelos futuros repositories. A conexão é criada sob demanda; o ambiente é validado com Zod antes do acesso. Nenhuma credencial deve ser enviada às views.

CSS local, ícones SVG e fontes do sistema evitam dependências visuais e requisições externas. A página contém navegação por âncoras, indicação dos recursos planejados e layout responsivo.

## Migrações

Ao criar o primeiro model persistido, adicione seu schema em `src/modules/<module>/models/*-schema.ts`, execute `bun run db:generate`, revise e versione todo o SQL e metadados gerados em `drizzle/`. Aplique com `bun run db:migrate` usando o ambiente correto e acesso de rede ao banco. Não use push em produção. Não há migração inicial porque ainda não existem entidades persistidas.

## Operação

O Docker utiliza estágios separados de dependências, build e execução; o runtime final utiliza Bun e usuário sem privilégios. O Next.js é executado sem standalone até sua compatibilidade ser validada no container.

Antes de disponibilizar fora da máquina local, configure controle de acesso de rede, HTTPS em proxy reverso e segredos próprios. Login e permissões devem ser implementados na fase de identidade antes da introdução de informações restritas.

Para atualizar: valide qualidade, faça backup do PostgreSQL, gere a imagem com `docker compose build`, execute migrações revisadas em etapa explícita quando existirem e atualize com `docker compose up -d`. Não execute migrações automaticamente na inicialização. Verifique `docker compose ps` e os logs com `docker compose logs --tail=100 app`. Não registre tokens ou dados pessoais nos logs.

Realize backups periódicos com `pg_dump` em formato custom, mantendo cópias protegidas fora do host. Teste a restauração com `pg_restore` em banco isolado antes de qualquer recuperação real. Preserve o volume em atualizações e mantenha a imagem anterior para rollback; migrações exigem análise própria de compatibilidade.

O build utiliza Webpack, opção estável do Next.js, para evitar o erro observado entre Turbopack e Bun 1.3.1 no Windows. O container utiliza Bun 1.4.3 e executa lint, tipagem e testes unitários antes do build.
