# ledger-ci-lab

A small Python ledger service (fee calculation, balances, a CSV export and a database wait) with a pytest suite and a Dockerfile. The suite is green by default. Five environment settings turn it red in five different ways, so you can see what a CI platform reports for each.

| Stage | Setting | What goes wrong |
| --- | --- | --- |
| Unit Tests | `FEE_MODE=legacy` | A real assertion failure: the old float math rounds 102.5 down to 102. This is the code-failure control |
| Load Tests | `FIXTURE_ROWS=150000000` | The fixture loader keeps every row in memory until the machine runs out |
| Export Tests | `EXPORT_ROWS=20000000000` | The export reserves far more disk than the machine has |
| Integration Tests | `DB_HOST=db.internal` | The database never answers, and the wait outlasts the 60s step timeout |
| Install Dependencies | `PIP_INDEX_URL` points at an index that does not resolve | The package install cannot reach an index |

## Run it locally

```
pip install -r requirements.txt
pytest
```

Everything passes in about a second. To reproduce one failure, set its variable, for example `FEE_MODE=legacy pytest tests/test_fees.py`.

Do not run the Load Tests or Export Tests settings on a machine you care about. The first can use all of its memory and the second asks the filesystem to reserve about 2 TB.

## Build and push the image

Harness Cloud runs linux/amd64. Build for that platform even on an Apple Silicon Mac, or the pipeline fails at the image pull:

```
docker buildx build --platform linux/amd64 -t YOUR_DOCKERHUB_USER/ledger-ci-lab:1.0 --push .
```

## Run it in Harness

1. Replace `YOUR_DOCKERHUB_USER` in `.harness/ledger_ci.yaml` with your Docker Hub user
2. Replace `devrel_harness_docker` with the ID of a Docker connector in your project that can pull the image
3. Create a pipeline from the YAML and run it on Harness Cloud
4. Optional: enable Harness AI under Account Settings, Default Settings, Harness AI, then Save

All five stages fail on purpose. A green run means a setting did not take effect.
