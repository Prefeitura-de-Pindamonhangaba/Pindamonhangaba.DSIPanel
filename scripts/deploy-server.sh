#!/bin/bash
# Instalar como root em /usr/local/sbin/dsi-panel-deploy (0755).
set -euo pipefail
umask 077
[[ $# == 1 && $1 =~ ^[a-f0-9]{40}$ ]] || { echo 'Revisao invalida.'; exit 2; }
revision=$1
# Arquivo root-only, instalado uma vez; não vem do artifact.
source /etc/dsi-panel-deploy.conf
exec 9>/var/lock/dsi-panel-deploy.lock
flock -n 9 || { echo 'Outro deploy esta em andamento.'; exit 1; }
incoming=/var/lib/dsi-panel-delivery
state=/var/lib/dsi-panel-deploy
release="$state/releases/$revision"
stamp=$(date -u +%Y%m%d-%H%M%S)
backup="$state/backups/$stamp-$revision"
mkdir -p "$release/docker" "$backup"
for file in images.tar.gz compose.yml compose.production.yml docker/Caddyfile docker/start-proxy.sh; do
  [[ -f "$incoming/$file" && ! -L "$incoming/$file" ]] || { echo 'Entrega incompleta.'; exit 1; }
done
docker load -i "$incoming/images.tar.gz" > "$backup/image-load.log" 2>&1
for image in "dsi-panel:git-$revision" "dsi-panel-migrate:git-$revision"; do
  actual=$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image")
  [[ "$actual" == "$revision" ]] || { echo 'Imagem de outra revisao.'; exit 1; }
done
install -m 600 "$incoming/compose.yml" "$release/compose.yml"
install -m 600 "$incoming/compose.production.yml" "$release/compose.production.yml"
install -m 644 "$incoming/docker/Caddyfile" "$release/docker/Caddyfile"
install -m 644 "$incoming/docker/start-proxy.sh" "$release/docker/start-proxy.sh"
[[ -e "$release/certificates" ]] || ln -s "$INSTALL_PATH/certificates" "$release/certificates"
cp "$ENV_FILE" "$backup/environment.backup"
cp -a "$state/current" "$backup/previous-release" 2>/dev/null || true
previous_release=$(readlink -f "$state/current")
container=$(docker ps -q --filter "label=com.docker.compose.project=$PROJECT" --filter label=com.docker.compose.service=app)
previous_image=$(docker inspect --format '{{.Image}}' "$container")
printf '%s\n' "$previous_image" > "$backup/previous-image"
export APP_IMAGE="dsi-panel:git-$revision"
compose=(docker compose --project-name "$PROJECT" --env-file "$ENV_FILE" -f "$release/$COMPOSE_FILE")
"${compose[@]}" config --quiet

# O backup deve terminar antes de qualquer migração.
if [[ "$DEPLOY_ENVIRONMENT" == development ]]; then
  "${compose[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup/database.dump"
else
  PGDATABASE=$("${compose[@]}" config --format json | python3 -c 'import sys,json;print(json.load(sys.stdin)["services"]["app"]["environment"]["DATABASE_URL"])')
  export PGDATABASE
  docker run --rm --network host -e PGDATABASE -e PGSSLROOTCERT=/certificates/postgres-root.crt \
    -v "$INSTALL_PATH/certificates:/certificates:ro,z" postgres:17.11-alpine \
    pg_dump -Fc > "$backup/database.dump"
  unset PGDATABASE
fi
[[ -s "$backup/database.dump" ]] || { echo 'Backup vazio; deploy interrompido.'; exit 1; }
if ! APP_IMAGE="dsi-panel-migrate:git-$revision" "${compose[@]}" run --rm --no-deps --entrypoint bun app /app/migrate-database.js > "$backup/migrations.log" 2>&1; then
  echo "Migracao recusada ou falhou. Aplicacao anterior preservada. Diagnostico: $backup/migrations.log"
  exit 1
fi
services=(app)
[[ "$DEPLOY_ENVIRONMENT" != development ]] || services+=(proxy)
if ! "${compose[@]}" up -d --no-build --wait --wait-timeout 240 "${services[@]}"; then
  echo 'Aplicacao sem saude; restaurando imagem e configuracao anteriores.'
  APP_IMAGE="$previous_image" docker compose --project-name "$PROJECT" --env-file "$ENV_FILE" \
    -f "$previous_release/$COMPOSE_FILE" up -d --no-build --wait --wait-timeout 240 "${services[@]}"
  echo 'Deploy falhou. Banco nao foi revertido; backup preservado para revisao.'
  exit 1
fi
ln -sfn "$release" "$state/current"
printf '%s\n' "$revision" > "$state/current-revision"
echo "Deploy $DEPLOY_ENVIRONMENT concluido: $revision"
