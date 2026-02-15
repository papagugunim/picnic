#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate

pip install -r requirements.txt

PORT="${PORT:-8012}"

exec uvicorn app.main:app --host 127.0.0.1 --port "$PORT"
