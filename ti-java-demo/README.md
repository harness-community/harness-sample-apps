# Harness Test Intelligence Demo (Java + JUnit 5)

A small order-processing example for demonstrating Harness Test Intelligence with Java, Maven and JUnit 5.

## Quick start

```bash
cd ti-java-demo
mvn test
```

## Project structure

```
ti-java-demo/
├── pom.xml
├── src/main/java/io/harness/demo/
│   ├── Order.java            # Order POJO with LineItem and Status
│   ├── OrderService.java     # CRUD operations, calls DiscountEngine + TaxCalculator
│   ├── DiscountEngine.java   # Tiered discount: NONE/SMALL/STANDARD/BULK
│   └── TaxCalculator.java    # 8% tax calculation
└── src/test/java/io/harness/demo/
    ├── OrderServiceTest.java     # 12 tests (depends on DiscountEngine + TaxCalculator)
    ├── DiscountEngineTest.java   # 5 tests (isolated discount logic)
    └── TaxCalculatorTest.java    # 4 tests (isolated tax logic)
```

## Call graph dependencies

```
OrderServiceTest --> OrderService --> DiscountEngine
                                 \-> TaxCalculator

DiscountEngineTest --> DiscountEngine

TaxCalculatorTest  --> TaxCalculator
```

This means:
- Changing `DiscountEngine.java` should select `DiscountEngineTest` + `OrderServiceTest` (skip `TaxCalculatorTest`)
- Changing `TaxCalculator.java` should select `TaxCalculatorTest` + `OrderServiceTest` (skip `DiscountEngineTest`)
- Changing `Order.java` should select all three test classes (all depend on it)

## Harness Test Intelligence setup

### Pipeline configuration

Create a pipeline with a single stage using the **Test** step (not Run step):

```yaml
pipeline:
  name: ti-java-demo
  identifier: ti_java_demo
  stages:
    - stage:
        name: Test Intelligence
        identifier: test_intelligence
        type: CI
        spec:
          cloneCodebase: true
          infrastructure:
            type: KubernetesDirect  # or Cloud
            spec:
              connectorRef: <K8S_CONNECTOR>
          execution:
            steps:
              - step:
                  type: Test
                  name: Run Tests with TI
                  identifier: run_tests_ti
                  spec:
                    command: cd ti-java-demo && mvn test
                    shell: sh
                    connectorRef: <DOCKER_CONNECTOR>
                    image: maven:3.8-eclipse-temurin-11
                    intelligenceMode: true
                    reports:
                      - "ti-java-demo/**/surefire-reports/*.xml"
```

Key fields:
- `type: Test` enables the Test Intelligence step (not a plain Run step)
- `intelligenceMode: true` activates change-aware test selection
- `reports` points to Surefire JUnit XML output
- Harness injects `JAVA_TOOL_OPTIONS` for call-graph instrumentation automatically

### Two-execution demonstration plan

**Execution 1 (baseline):**
- Trigger on the current branch with no code changes
- TI runs ALL 21 tests and builds the call graph
- Tests tab shows 21 tests selected, 0 skipped

**Execution 2 (targeted change):**
- Modify `DiscountEngine.java` (e.g., change the BULK threshold from 10 to 12 items)
- Push the change and trigger the pipeline
- TI analyzes the git diff, walks the call graph, and selects only tests that depend on `DiscountEngine`
- Expected: `DiscountEngineTest` (5 tests) + `OrderServiceTest` (12 tests) selected, `TaxCalculatorTest` (4 tests) skipped
- Tests tab shows 17 selected, 4 skipped

### What to verify in Harness UI

1. **Tests tab:** Shows selected vs skipped test counts for each execution
2. **Call graph:** Visual map of which changed classes caused each test to be selected
3. **Comparison:** Execution 1 (all 21) vs Execution 2 (17 selected, 4 skipped)

## Versions

- Java 11 (compile target)
- Maven Surefire 3.2.5
- JUnit Jupiter 5.10.3

## Notes

- JaCoCo is not required. TI uses its own call-graph agent for instrumentation.
- Do not override `JAVA_TOOL_OPTIONS` in the pipeline. Harness sets it for TI instrumentation. Appending is fine.
- Changes to `pom.xml` may trigger a full test run. Use `.ticonfig.yaml` to exclude build files if needed.
- Webhook triggers should include push, pull_request synchronize, and merge/close events so TI can update the call graph on the target branch.

## Reference

- [Test Intelligence overview](https://developer.harness.io/docs/continuous-integration/use-ci/run-tests/test-intelligence/ti-overview)
- [Test step (v2) configuration](https://developer.harness.io/docs/continuous-integration/use-ci/run-tests/tests-v2)
