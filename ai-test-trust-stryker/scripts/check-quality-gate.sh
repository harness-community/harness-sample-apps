#!/usr/bin/env bash
# Compares the live Stryker mutation score (from mutation.json) against the
# gate value in QUALITY_GATE.txt. Exits 1 if the score is below the gate.
set -euo pipefail

cd "$(dirname "$0")/.."
GATE=$(cat QUALITY_GATE.txt)
REPORT=".hono/reports/mutation/mutation.json"

if [ ! -f "$REPORT" ]; then
  echo "ERROR: mutation report not found at $REPORT"
  exit 1
fi

SCORE=$(node -e "
const r = require('./$REPORT');
const files = r.files || {};
let killed = 0, survived = 0, timeout = 0;
for (const f of Object.values(files)) {
  for (const m of (f.mutants || [])) {
    if (m.status === 'Killed') killed++;
    else if (m.status === 'Survived') survived++;
    else if (m.status === 'Timeout') timeout++;
  }
}
const total = killed + survived + timeout;
const score = total === 0 ? 0 : (killed / total) * 100;
console.log(score.toFixed(2));
")

echo "Mutation score: ${SCORE}%"
echo "Quality gate:   ${GATE}%"

if awk "BEGIN { exit !($SCORE < $GATE) }"; then
  echo "FAIL: score below gate"
  exit 1
fi
echo "PASS: score meets or exceeds gate"
