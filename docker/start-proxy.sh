#!/bin/sh
set -eu
: "${APP_URL:?Defina APP_URL}"
authority="${APP_URL#*://}"
authority="${authority%%/*}"
case "$authority" in
  \[*\]*) TLS_SERVER_NAME="${authority#\[}"; TLS_SERVER_NAME="${TLS_SERVER_NAME%%\]*}" ;;
  *) TLS_SERVER_NAME="${authority%%:*}" ;;
esac
export TLS_SERVER_NAME
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
