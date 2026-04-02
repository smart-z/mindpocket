#!/bin/sh
set -eu

export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-mindpocket-local-dev-secret}"

run_with_retry() {
  max_attempts="$1"
  delay_seconds="$2"
  shift 2

  attempt=1
  while true; do
    if "$@"; then
      return 0
    fi

    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "[entrypoint] Command failed after ${attempt} attempts: $*" >&2
      return 1
    fi

    echo "[entrypoint] Command failed, retrying in ${delay_seconds}s (${attempt}/${max_attempts}): $*" >&2
    attempt=$((attempt + 1))
    sleep "$delay_seconds"
  done
}

if [ -z "${DATABASE_URL:-}" ]; then
  export DB_HOST="${DB_HOST:-postgres}"
  export DB_PORT="${DB_PORT:-5432}"
  export DB_USER="${DB_USER:-mindpocket}"
  export DB_PASSWORD="${DB_PASSWORD:-mindpocket}"
  export DB_NAME="${DB_NAME:-mindpocket}"

  export DATABASE_URL="$(
    node -e "const { URL } = require('node:url');
const url = new URL('postgresql://localhost');
url.username = process.env.DB_USER;
url.password = process.env.DB_PASSWORD;
url.hostname = process.env.DB_HOST;
url.port = process.env.DB_PORT;
url.pathname = '/' + process.env.DB_NAME;
if (process.env.DB_SSLMODE) url.searchParams.set('sslmode', process.env.DB_SSLMODE);
process.stdout.write(url.toString())"
  )"
fi

if [ -z "${BETTER_AUTH_URL:-}" ]; then
  export BETTER_AUTH_URL="$NEXT_PUBLIC_APP_URL"
fi

cd /workspace/apps/web

run_with_retry 30 2 npx tsx scripts/ensure-extensions.ts
run_with_retry 30 2 npx drizzle-kit push --force

cd /app
exec node apps/web/server.js
