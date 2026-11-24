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

## Before you run: fork, connector, and two YAML edits

This branch (`feat/ai-test-trust-stryker-lab`) is not merged to `main`, so a
plain clone of `main` will not show the `ai-test-trust-stryker/` directory.
You need to fork, check out the branch, create a Harness GitHub connector,
and point two lines in the pipeline YAML at your own fork before the first
run.

**1. Fork and checkout the feature branch.** On GitHub, fork
`harness-community/harness-sample-apps` into your own account, then locally:

```bash
git clone https://github.com/<your-github-user>/harness-sample-apps.git
cd harness-sample-apps
git checkout feat/ai-test-trust-stryker-lab
```

**2. Create a GitHub connector in Harness.** In the Harness UI, go to
Account Settings, open Connectors, click New Connector, pick Code
Repositories, then GitHub. Authenticate with OAuth, or with a Personal
Access Token that has the `repo` scope. Give the connector a short identifier
you can remember, for example `my_github_fork`. Test the connection and save.

**3. Edit two lines in the pipeline YAML.** Open
`ai-test-trust-stryker/.harness/mutation-quality-gate.yaml` and change these
exact lines:

- Line 11: `connector: github_devrel_harness_community` becomes
  `connector: <your-connector-id>` (the identifier from step 2)
- Line 12: `repo_name: harness-community/harness-sample-apps` becomes
  `repo_name: <your-github-user>/harness-sample-apps`

Commit and push that edit on your fork's `feat/ai-test-trust-stryker-lab`
branch so Harness can import the updated YAML.

**4. Beginner path, start to finish.** If you have never used Harness before,
work through these in order:

1. Fork `harness-community/harness-sample-apps` on GitHub
2. Check out the `feat/ai-test-trust-stryker-lab` branch locally
3. Sign up for a free Harness account at app.harness.io
4. Create a new project in your Harness account
5. Create a GitHub connector as described above
6. Edit the two YAML lines on your fork, push the change
7. In Harness, create a new pipeline using Import From Git, pointing at
   `ai-test-trust-stryker/.harness/mutation-quality-gate.yaml` on your
   fork's `feat/ai-test-trust-stryker-lab` branch
8. Run the pipeline

## Quick start

1. Fork `harness-community/harness-sample-apps` and check out the
   `feat/ai-test-trust-stryker-lab` branch (see Before you run)
2. Edit the two YAML lines so the pipeline clones your fork, not the upstream
3. In Harness, create a new pipeline, "Import from Git", pointing at your
   fork's `feat/ai-test-trust-stryker-lab` branch and the file
   `ai-test-trust-stryker/.harness/mutation-quality-gate.yaml`
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
