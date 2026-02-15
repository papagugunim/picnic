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

DEPS_MARKER=".venv/.deps_installed"
if [ ! -f "$DEPS_MARKER" ]; then
  pip install -r requirements.txt > /dev/null
  touch "$DEPS_MARKER"
fi

PORT="${PORT:-8012}"
PIDFILE=".uvicorn.pid"
LOGFILE="server.log"

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Already running (PID $(cat "$PIDFILE"))."
  exit 0
fi

nohup /Users/seongmincho/Documents/New\ project/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$PORT" > "$LOGFILE" 2>&1 &

echo $! > "$PIDFILE"

echo "Started on http://127.0.0.1:$PORT (PID $(cat "$PIDFILE"))"

# Trigger a refresh + retranslate once the server is ready.
for i in {1..20}; do
  if curl -s "http://127.0.0.1:$PORT/api/health" >/dev/null; then
    break
  fi
  sleep 1
done

curl -s -X POST "http://127.0.0.1:$PORT/api/refresh" >/dev/null || true
curl -s -X POST "http://127.0.0.1:$PORT/api/retranslate?limit=100" >/dev/null || true
