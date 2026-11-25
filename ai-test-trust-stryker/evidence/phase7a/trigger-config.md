# Phase 7a Trigger Configuration

## Trigger
- Name/Identifier: `pr_mutation_quality_gate`
- Pipeline: `AI_Test_Trust_Mutation_Quality_Gate` (org `default`, project `devrel_team`)
- Type: GitHub Webhook, event `PullRequest`
- Actions: Open, Reopen, Synchronize
- Target branch: `feat/ai-test-trust-stryker-lab`
- Webhook URL (account-scoped): `https://unifiedpipeline.harness.io/ng/api/webhook?accountIdentifier=MGY3MmJmM2ItNTY5Ny00Yj`
- Trigger UI: https://unifiedpipeline.harness.io/ng/account/MGY3MmJmM2ItNTY5Ny00Yj/all/orgs/default/projects/devrel_team/pipelines/AI_Test_Trust_Mutation_Quality_Gate/triggers

## Same-repo (fork exclusion) enforcement
Two independent guards, AND-ed:

1. Payload condition: `<+trigger.payload.pull_request.head.repo.full_name>` Equals `harness-community/harness-sample-apps`.
2. JEXL condition: `<+trigger.payload.pull_request.head.repo.full_name> == <+trigger.payload.pull_request.base.repo.full_name>`.

`authorAssociation` alone is insufficient because a repo collaborator can still open a PR from a personal fork, and the GitHub webhook payload reports that association against the PR author, not against the head repo. Matching head repo full_name (and head==base) is the only reliable way to exclude forks.

Also: `targetBranch` is pinned to `feat/ai-test-trust-stryker-lab`, so only PRs targeting the lab branch fire the pipeline.

## Input mapping
- `codebase_branch` <- `<+trigger.sourceBranch>` (PR source branch)
- `codebase_sha`   <- `<+trigger.commitSha>` (PR head SHA)

The pipeline YAML uses `codebase_sha` when non-empty (trigger path) and falls back to the `codebase_branch` default on manual runs.

## OAuth connector dependency (follow-up)
The GitHub connector `github_devrel_harness_community` is OAuth-authenticated and bound to a specific human user's GitHub identity. Consequences:
- If that user rotates credentials, revokes the Harness OAuth grant, or leaves the org, **both manual runs and PR-triggered runs break** (checkout fails).
- There is no PAT or GitHub App fallback configured for this pipeline.

Follow-up for the project owner: migrate to a GitHub App connector (or a shared service-account PAT) so pipeline availability is decoupled from one individual's account. Track this before promoting the trigger past the lab branch.
