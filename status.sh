#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
PIDFILE=".uvicorn.pid"

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Running (PID $(cat "$PIDFILE"))"
  exit 0
fi

echo "Not running"
exit 1
