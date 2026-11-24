# Four-way mutation comparison — Hono `src/utils/buffer.ts`

Commit: `cd50668335738d170ecd03e783f2f2d5317b95d6` (Hono 4.13.20).
Stryker: 10.1.1 + `@stryker-mutator/vitest-runner` 10.1.1.
Scope: 113 mutants on `src/utils/buffer.ts`, `coverageAnalysis: perTest`.

## Scores

| Run | Killed | Survived | NoCov | Timeout | Score (total) | Score (covered) | Δ vs human-only |
|---|---|---|---|---|---|---|---|
| human-only                      | 72 | 35 | 4 | 2 | **65.49 %** | 67.89 % | — |
| ai-only (54 AI tests)           | 82 | 27 | 2 | 2 | **74.34 %** | 75.68 % | +8.85 pp |
| combined (human + AI)           | 83 | 28 | 0 | 2 | **75.22 %** | 75.22 % | +9.73 pp |
| **human-reviewed combined**     | **87** | **24** | **0** | **2** | **78.76 %** | **78.76 %** | **+13.27 pp** |

Human-reviewed combined adds `buffer.human.test.ts` (3 `it`) on top of the
combined file set; all 3 pass (`experiments/buffer/human-review/vitest.txt`).

## Targeted vs incidental kills

Three human-review tests targeted a total of 7 mutants (1 hashFunction +
3 L55:7 guard precedence + 3 L113 Content-Type). The fourth Stryker run
transitions from combined:

| combined → human-reviewed | count |
|---|---|
| Killed → Killed     | 83 |
| Timeout → Timeout   |  2 |
| Survived → Survived | 24 |
| Survived → Killed   |  **4** |
| Killed → Survived   |  0 |

Mutants killed by the human tests (all 4 were explicitly targeted):

| id | Line:Col | Mutator | Replacement |
|---|---|---|---|
| 42  | L49:7   | ConditionalExpression | `true`                 |
| 108 | L113:43 | Regex                 | `/^[^;]/`              |
| 109 | L113:43 | Regex                 | `/^[;]+/`              |
| 111 | L113:68 | MethodExpression      | `mediaType.toUpperCase()` |

Zero unintended regressions — no previously-killed mutant became a survivor
and no NoCoverage transitions appeared.

## Mutants still surviving (24)

| Cluster | Count | Verdict |
|---|---|---|
| `equal` short-circuit (L9)                      | 2 | Equivalent — fall-through also returns true for identical buffers. |
| `constantTimeEqualString` loop bounds (L32–L36) | 6 | Equivalent — `out = aLen^bLen` traps length mismatch; bitwise NaN→0 preserves semantics. |
| `timingSafeEqualString` guard precedence (L55:7 sub-expressions) | 7 | Equivalent — trailing `|| typeof ... !== 'string'` disjuncts catch null because `typeof null === 'object'`. See rationale.md Test 2. |
| string-path dispatch at L81:7                   | 1 | Meaningful-ish — mutant forces string-path; current tests happen to not route through a case where the non-string path produces a different observable than the string-coerced one. Requires a `.length` side-effect assertion. |
| deprecated non-string guard precedence (L91:7 sub-expressions) | 7 | Equivalent — same reasoning as L55:7 mirror. |
| L113:43 `Regex /[^;]+/` (strip `^` anchor)      | 1 | Equivalent — first non-`;` run is always at index 0 in realistic input. |

**Genuinely meaningful gaps remaining: 1** — the L81:7 string-path
dispatch mutant. Killing it requires a test that asserts the deprecated
non-string path is taken for `(string, non-string)` inputs (e.g. by spying
on sha256 or asserting a type-specific side-effect). We judged this
non-essential for the Phase 5 story since the deprecated API is slated for
removal.

## "Where human judgment adds value" — the Phase 5 thesis

| Dimension | AI tests alone | Human review added |
|---|---|---|
| Mutation score (total)                           | 74.34 % | **78.76 %** (+4.42 pp over ai-only) |
| Content-Type normalisation contract              | not asserted — relies on parsing success | asserted via Response-spy, lowercase media type + preserved boundary |
| Hash-function dispatch contract                  | not asserted — relies on output equality | asserted via `vi.fn()` call-count spy |
| Equivalent mutants correctly identified as such  | 0 (treated all as noise)              | 21 (explicitly classified & defended) |

AI + human-existing gets to 75.22 %. The three human-review tests close
the gap to 78.76 % — within 0.6 pp of the practical ceiling (the single
remaining L81:7 meaningful gap), and crucially distinguish 21 equivalent
mutants from 4 real contract gaps. That classification — "which survivors
are equivalent, which are real" — is the work the AI didn't do on its own.

## Files

- `human-only/`, `ai-only/`, `combined/`, `human-reviewed-combined/` —
  each with `stryker.config.json` and `reports/mutation/{mutation.html,
  mutation.json}`.
- `reconciliation.md` — Phase 4 "7 rescued" figure verified; 11-vs-7
  killed-delta explained (7 Survived→Killed + 4 NoCov→Killed).
- `survivor-classification.md` — all 28 combined survivors labelled.
- `../human-review/buffer.human.test.ts` — the three human tests.
- `../human-review/rationale.md` — per-test contract basis and kill/survive
  outcome.
- `../human-review/vitest.txt` — vitest run showing 3/3 pass.
