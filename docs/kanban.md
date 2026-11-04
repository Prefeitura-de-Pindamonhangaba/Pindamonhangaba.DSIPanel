# Quadro Kanban

Quadro compartilhado em /kanban, com quatro etapas fixas: A fazer, Em andamento, Em revisão e Concluído. Cartões incluem título, descrição, prioridade e prazo opcional. Permite criar, editar, mover por arraste ou menu, buscar, arquivar e restaurar. A ordenação dentro da etapa segue a criação; múltiplos quadros, responsáveis e integração automática ao GLPI não fazem parte desta entrega.

Os cartões são persistidos em PostgreSQL pelo módulo MVC kanban. Usuários com dashboard:read visualizam o quadro; kanban:write permite alterações e é concedida aos papéis Keycloak operator/admin. O modo de teste sem login continua somente leitura.

A API valida a origem, o tamanho do JSON e os campos com Zod. Cada gravação exige a versão atual do cartão; uma edição concorrente recebe conflito, sem sobrescrever dados. A movimentação de cartões arquivados é bloqueada. Alterações e auditoria são transacionais. O arquivamento é reversível; não há exclusão definitiva na interface.

Após backup, aplique as migrações 0003 (tabela e constraints) e 0004 (permissão):

```sh
docker compose --profile tools build tools
docker compose run --rm -T tools db:migrate
```

A migração não é executada na inicialização. O quadro começa vazio, sem exemplos persistidos. Para obter alterações de outras pessoas, recarregue a página. Em conflitos, atualize o quadro antes de repetir a alteração.
