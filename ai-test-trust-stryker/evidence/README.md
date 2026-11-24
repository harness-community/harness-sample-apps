# Historical evidence (not CI input)

These HTML mutation reports are the four local Stryker runs that produced the
numbers cited in `comparison-v2.md`:

| Suite                     | Mutation score |
|---------------------------|----------------|
| human-only                | 65.49%         |
| ai-only                   | 74.34%         |
| combined (raw)            | 75.22%         |
| human-reviewed combined   | 78.76%         |

The pipeline never reads this folder. It clones Hono fresh at the pinned SHA
and runs Stryker live. Treat these HTML files as a reference you can open in a
browser to inspect which mutants each suite killed.
