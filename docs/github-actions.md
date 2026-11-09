# Deploy automático

Push em `master` publica em produção (`10.0.0.193`); push em `develop` publica no desenvolvimento (`10.0.0.16`). Pull requests executam somente a validação em runner hospedado do GitHub. Não há deploy de PRs ou de outras branches.

O workflow compila com Bun dentro do Docker e exige lint, TypeScript e testes. Envia um artifact com as duas imagens identificadas pelo SHA do commit, os arquivos Compose e os arquivos públicos do proxy. Não envia `.env`, certificados privados, dumps ou fontes de credenciais. Os artifacts expiram em sete dias.

Cada servidor tem um runner dedicado, registrado apenas neste repositório, com usuário `dsi-actions`, em `/opt/dsi-panel-actions`. O runner existente do Antonieta não é usado. Os labels são `dsi-panel-development` e `dsi-panel-production`. Os ambientes GitHub permitem somente `develop` e `master`, respectivamente. Não adicione jobs de PR que utilizem esses runners.

## Operação no servidor

O runner não participa do grupo Docker e tem permissão sudo apenas para `/usr/local/sbin/dsi-panel-deploy`. Esse arquivo é uma cópia root-owned de `scripts/deploy-server.sh`. A configuração root-only fica em `/etc/dsi-panel-deploy.conf`, com ambiente, projeto Compose, pasta instalada e caminho do arquivo privado de ambiente. Alterações no helper exigem instalação administrativa; o workflow não o substitui.

O deploy recebe o artifact em `/var/lib/dsi-panel-delivery`, carrega as imagens e confere seus labels de revisão. Configurações de cada revisão ficam em `/var/lib/dsi-panel-deploy/releases`. O `.env` e os certificados permanecem nos caminhos privados de cada instalação.

Antes da migração, o helper salva backup PostgreSQL, configuração e imagem anterior em `/var/lib/dsi-panel-deploy/backups`. O migrador usa os SQLs versionados do Drizzle e recusa operações destrutivas ou incompatíveis pendentes; esses casos exigem revisão e execução administrativa específica. Não use `drizzle-kit push`.

Somente depois das migrações a aplicação é recriada, sem build no servidor. O Compose aguarda saúde por até 240 segundos. Se a nova aplicação falhar, o helper restaura imagem e Compose anteriores e marca o job como falho. O banco não é restaurado automaticamente: migrações precisam preservar compatibilidade com a aplicação anterior. Logs detalhados das migrações e os backups ficam acessíveis apenas ao administrador, fora dos logs públicos do Actions.

O histórico e os backups não são apagados automaticamente. Monitore espaço e aplique a política de retenção da equipe. O workflow não executa prune global nem reinicia outros projetos.

## Recuperação e reexecução

Em caso de falha, confira o job no Actions e o diretório de backup informado. Reexecute o workflow na branch correta após resolver a causa. O helper mantém um lock por servidor para impedir deploys simultâneos. A revisão ativa está em `/var/lib/dsi-panel-deploy/current-revision`. Os serviços podem ser verificados com `docker ps` e o runner com a unidade `actions.runner` correspondente.

Os dados e credenciais de produção nunca são usados pelos testes de CI. A checagem de saúde confirma o servidor interno; DNS, certificados e login SSO devem ser verificados separadamente após mudanças nessa infraestrutura.
