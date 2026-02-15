#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
PIDFILE=".uvicorn.pid"

if [ ! -f "$PIDFILE" ]; then
  echo "Not running (no PID file)."
  exit 0
fi

PID=$(cat "$PIDFILE")
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "Stopped (PID $PID)."
else
  echo "Process not found (PID $PID)."
fi

rm -f "$PIDFILE"
