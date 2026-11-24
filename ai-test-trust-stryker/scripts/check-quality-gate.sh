#!/usr/bin/env bash
# Compares the live Stryker mutation score (from mutation.json) against the
# gate value in QUALITY_GATE.txt. Uses the OFFICIAL Stryker formulas:
#   total   = (Killed + Timeout) / (Killed + Survived + Timeout + NoCoverage)
#   covered = (Killed + Timeout) / (Killed + Survived + Timeout)
# Gates on TOTAL (the headline score in Stryker's own HTML report).
# Reference: https://stryker-mutator.io/docs/mutation-testing-elements/mutation-score/
set -euo pipefail

cd "$(dirname "$0")/.."
GATE=$(cat QUALITY_GATE.txt)
REPORT="${MUTATION_REPORT:-.hono/reports/mutation/mutation.json}"

if [ ! -f "$REPORT" ]; then
  echo "ERROR: mutation report not found at $REPORT"
  exit 1
fi

REPORT_ABS=$(node -e "console.log(require('path').resolve(process.argv[1]))" "$REPORT")
SCORE_JSON=$(node -e "
const r = require('$REPORT_ABS');
const files = r.files || {};
let killed=0, survived=0, timeout=0, noCov=0;
for (const f of Object.values(files)) {
  for (const m of (f.mutants || [])) {
    if (m.status === 'Killed') killed++;
    else if (m.status === 'Survived') survived++;
    else if (m.status === 'Timeout') timeout++;
    else if (m.status === 'NoCoverage') noCov++;
  }
}
const detected = killed + timeout;
const covered  = detected + survived;
const valid    = covered + noCov;
const total    = valid   ? (detected / valid)   * 100 : 0;
const cov      = covered ? (detected / covered) * 100 : 0;
console.log(JSON.stringify({ killed, survived, timeout, noCov, total: total.toFixed(2), covered: cov.toFixed(2) }));
")

echo "Mutation results: $SCORE_JSON"
TOTAL=$(node -e "const s=process.argv[1];console.log(JSON.parse(s).total)" "$SCORE_JSON")
COVERED=$(node -e "const s=process.argv[1];console.log(JSON.parse(s).covered)" "$SCORE_JSON")

echo "Mutation score (total):   ${TOTAL}%  [official formula: (killed+timeout)/(killed+survived+timeout+noCoverage)]"
echo "Mutation score (covered): ${COVERED}%"
echo "Quality gate:             ${GATE}%  (gating on TOTAL)"

if node -e "process.exit((parseFloat(process.argv[1]) < parseFloat(process.argv[2])) ? 0 : 1)" "$TOTAL" "$GATE"; then
  echo "FAIL: total score ${TOTAL}% is below gate ${GATE}% (covered score was ${COVERED}%)"
  exit 1
fi
echo "PASS: total score ${TOTAL}% meets or exceeds gate ${GATE}% (covered score ${COVERED}%)"
