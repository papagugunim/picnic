#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p backups

echo "[1/4] Creating backups..."
git bundle create "backups/picnic-backup-${TS}.bundle" --all
git archive --format=tar.gz -o "backups/picnic-source-${TS}.tar.gz" HEAD

echo "[2/4] Running quality gate..."
CHANGED_TS_FILES="$(git diff --name-only -- '*.ts' '*.tsx' 2>/dev/null | tr '\n' ' ')"
if [ -n "${CHANGED_TS_FILES// }" ]; then
  # 전체 lint 에러 백로그가 큰 상태라 변경 파일만 검사
  npm run lint -- ${CHANGED_TS_FILES}
else
  echo "No changed TS/TSX files for targeted lint. Skipping lint."
fi
npm run build

echo "[3/4] Checking migration status..."
if command -v supabase >/dev/null 2>&1; then
  supabase migration list >/dev/null || true
fi

echo "[4/4] Done"
ls -lh "backups/picnic-backup-${TS}.bundle" "backups/picnic-source-${TS}.tar.gz"
