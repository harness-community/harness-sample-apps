# Phase 7a Trigger Smoke Test

This file exists purely to produce a PR-triggered pipeline run against the
`pr_mutation_quality_gate` trigger. It is NOT a mutation-weakening demo — no
production code or tests are modified, so the 75% mutation gate should pass
unchanged.

Purpose: confirm that opening a PR against `feat/ai-test-trust-stryker-lab`
from the same repo causes Harness to fire an execution that checks out the
PR head SHA and runs the Stryker quality gate.
