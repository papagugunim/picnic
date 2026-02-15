#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
LOGFILE="server.log"

if [ ! -f "$LOGFILE" ]; then
  echo "No log file."
  exit 0
fi

tail -n 200 "$LOGFILE"
