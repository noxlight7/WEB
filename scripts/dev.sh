#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -x .venv/bin/python || ! -d frontend/node_modules || ! -f .env ]]; then
  echo 'Сначала выполните подготовку локального запуска из README.md.'
  exit 1
fi

.venv/bin/python scripts/local_db.py start
.venv/bin/python scripts/backend.py migrate --noinput
.venv/bin/python scripts/backend.py seed_demo
.venv/bin/python scripts/backend.py collectstatic --noinput

.venv/bin/python scripts/backend.py runserver 127.0.0.1:8000 --noreload &
backend_pid=$!
(
  cd frontend
  exec node node_modules/vite/bin/vite.js --host 127.0.0.1
) &
frontend_pid=$!

cleanup() {
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
echo 'Переплёт: http://127.0.0.1:5173 — Ctrl+C завершает серверы приложения.'
wait
