# AI Test Trust: Mutation Quality Gate

A reproducible Harness CI lab that runs mutation testing over
`Hono`'s `src/utils/buffer.ts` with three stacked test suites:

1. The original Hono unit tests (`buffer.test.ts`), unchanged
2. 54 AI-generated tests from an OpenCode run (`buffer.ai.eval.test.ts`)
3. 3 human-authored edge-case tests (`buffer.human.test.ts`)

The pipeline clones Hono at a pinned commit, stages the AI and human test
files into `src/utils/`, runs Vitest, runs Stryker, then enforces a mutation
score gate.

## What you need

- A Harness account on free Software Delivery Agent (Harness Cloud runtime is
  enough; no delegate required)
- A fork of this repo connected to Harness via a GitHub connector
- Nothing else. No OpenCode install, no LLM key, no paid infra

## Quick start

1. Fork `harness-community/harness-sample-apps`
2. In Harness, go to any project and create a new pipeline, "Import from Git",
   pointing at your fork's branch and the file
   `ai-test-trust-stryker/.harness/mutation-quality-gate.yaml`
3. Connect your fork via a GitHub connector
4. Run the pipeline
5. Open the execution, view the Vitest JUnit report on the Tests tab, then
   open the Stryker HTML report from the step logs of `run_stryker`

The pipeline passes when the live mutation score is at or above the value in
`QUALITY_GATE.txt` (currently `75`). Lower the number in that file to see
failures turn green, raise it to see the gate bite.

## Repo layout

```
ai-test-trust-stryker/
  .harness/mutation-quality-gate.yaml   pipeline definition (v1 YAML)
  tests/                                AI + human test files (copied verbatim)
  configs/                              Stryker + Vitest configs
  scripts/setup-hono.sh                 clone Hono, stage tests, install deps
  scripts/check-quality-gate.sh         compare live score vs gate
  evidence/                             four historical HTML reports
  HONO_COMMIT.txt                       pinned Hono SHA
  QUALITY_GATE.txt                      the number the gate enforces
```

## Historical context

Four local Stryker runs produced these scores on the same Buffer module:

| Suite                   | Mutation score |
|-------------------------|----------------|
| human only              | 65.49%         |
| AI only                 | 74.34%         |
| combined (raw)          | 75.22%         |
| human-reviewed combined | 78.76%         |

That is the full receipt behind the 75 gate: AI tests alone beat human-only;
a human review pass on the combined set lifts another 3.5 points.

Your live pipeline run will not hit exactly 78.76% every time: Stryker schedules
mutants nondeterministically, so expect a small band. If the live number drifts
noticeably from the historical baseline, open the HTML report and compare
survivors.

## Running the pieces locally

```bash
cd ai-test-trust-stryker
bash scripts/setup-hono.sh
cd .hono
npx vitest run src/utils/buffer*.test.ts --config vitest.buffer.config.ts
npx stryker run
cd ..
bash scripts/check-quality-gate.sh
```

## Why this exists

The lab answers one question: when AI writes most of your tests, does the test
suite still catch real bugs? Mutation testing turns that from vibes into a
number. The pipeline packages the whole experiment so any developer can rerun
it against their own fork.
