#!/usr/bin/env bash
set -euo pipefail

# Deploy production and force-alias both domains to the same deployment URL.
# Usage: ./scripts/deploy-prod-alias.sh

DEPLOY_URL=$(vercel --prod --yes | tail -n 1)

echo "Production deployed: ${DEPLOY_URL}"

echo "Aliasing picnic-wheat.vercel.app ..."
vercel alias set "${DEPLOY_URL}" picnic-wheat.vercel.app || echo "[warn] failed to alias picnic-wheat.vercel.app"

echo "Aliasing mypicnic.vercel.app ..."
vercel alias set "${DEPLOY_URL}" mypicnic.vercel.app || echo "[warn] failed to alias mypicnic.vercel.app"

echo "Done."
