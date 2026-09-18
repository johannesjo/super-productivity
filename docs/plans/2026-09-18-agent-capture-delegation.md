# Agent-capture delegation briefs

These are four bounded handoffs for continuing the Stage A experiment with less
expensive models. Run one worker at a time. Suggested order: task 1, task 2,
task 4 only if a concrete defect is found, then task 3. After a fix, repeat only
the affected checks from task 2.

Model choices below are recommendations, not guarantees about account usage.
Give the worker the shared instructions plus its individual task. Do not give it
the whole conversation unless necessary.

## Shared instructions for every worker

You are working in the Super Productivity repository. Follow its `AGENTS.md`.
You are not alone in this codebase: inspect current changes, preserve others'
work, and adapt to it. Do not revert unrelated edits. Do not commit, push, merge,
deploy, modify agent-control files, or install new dependencies for these tasks.

Read the relevant sections of
`docs/plans/2026-09-17-agent-capture-stage-a.md`. That document records experiments;
passing harness tests do not establish a production endpoint or connector.
Use existing helpers and patterns. Keep changes confined to your assigned files.
If a requirement needs a new product or protocol decision, report the exact
decision and continue any independent work; do not invent its answer.

Use an isolated test database, never a user's database. Treat commands below as
templates: verify the checkout, configuration, and database before running them.
Use ordinary tool escalation when the sandbox blocks a necessary command.
Avoid repeated polling, unnecessary full-suite runs, and unrelated cleanup.

Run `npm run checkFile <path>` for every changed TypeScript or SCSS file. Inspect
the final diff and run `git diff --check`. Report the files changed, concrete
results, commands actually run, and remaining decisions or failures concisely.

### Starting evidence, recorded 2026-09-18

- The current checkout includes four submission-focused PostgreSQL cases and
  records 23 passing publication SQL cases. Confirm what is present before
  adding tests; do not recreate those cases.
- The original encrypted edit/delete browser scenario and its 21-identity clock
  pressure variant passed. Actual publisher pruning and ordinary conflict
  recovery were observed. No pruning implementation change was needed.
- Normal browser startup blocks another active tab. Simultaneous active-tab
  support is outside this capture scope. Two single-tab interruption cases pass.
- The E2E TypeScript project previously reported 42 existing errors, none in the
  publication spec. This is historical evidence, not a waiver for new errors.
- Production capture publication, stable submission-identity ownership, and the
  real OAuth/phone connector remain unfinished. Database restore and power-loss
  recovery also remain open.

## Task 1: Submission retry tests — Terra, medium reasoning

**Goal:** establish precisely what the existing queue submission contract covers
and identify any missing tests for requirements that are already decided.

**Ownership:**
`packages/super-sync-server/tests/integration/agent-capture-publication.integration.spec.ts`.
Read the adjacent `agent-capture-publication.harness.ts`; do not change it in this
task. Read the plan's submission-identity section and validation record.

1. Inspect the existing cases for repeated and concurrent identical submissions,
   account-scoped identities, conflicting content, and submission after
   publication. Distinguish `enqueueCapture` retries from `publishCapture`
   receipt recovery.
2. Check whether each case demonstrates the stated behavior using actual
   PostgreSQL rows and transactions. Inspect title and notes handling where
   relevant. Do not add redundant cases merely to increase the count.
3. Add tests only for an uncovered, established requirement. A test of current
   refusal is characterization; do not describe it as successful end-to-end
   submission deduplication.
4. If the existing coverage is sufficient, return that finding without edits.
   If you find a defect, preserve the failing reproduction and describe expected
   versus actual behavior. Leave implementation to task 4.

Do not decide who generates a stable request identity, how an assistant retains
it across retries, which HTTP response conflicting content receives, or how
restored database receipts behave. Those are protocol decisions if the plan has
not resolved them. Do not deduplicate by task title or other content heuristics.

**Validation:** run the focused PostgreSQL suite from task 2 and `checkFile` on
the spec if changed. Confirm a new test can detect its intended failure; use a
small reversible negative control where appropriate, restore it, then rerun.

**Deliverable:** a short coverage/gap report, any minimal test diff, and exact
validation evidence. Clearly separate harness behavior from endpoint guarantees.

## Task 2: Focused validation — Luna

**Goal:** run the checks justified by the current diff and summarize their actual
results. This is validation work, not permission to repair product code.

**Ownership:** temporary logs/configuration in an ignored local directory only.
Do not change production code or test expectations. Required `checkFile` may
format an affected file; report any resulting diff.

1. Inspect the current diff and task 1's report. Select the smallest relevant
   checks. If only PostgreSQL tests changed, do not rerun the entire browser suite.
2. Locate the existing isolated PostgreSQL setup. Reuse it only after verifying
   its test-only purpose. Do not assume earlier processes or `.tmp` files exist.
3. Run the focused publication suite from `packages/super-sync-server`:

   ```sh
   DATABASE_URL='<isolated-test-database-url>' ../../node_modules/.bin/vitest run --config vitest.integration.config.ts tests/integration/agent-capture-publication.integration.spec.ts --maxWorkers=1
   ```

4. Run `npm run checkFile <changed-ts-or-scss-path>` from the repository root for
   each applicable file. If TypeScript validation is warranted, record exact
   diagnostics. Do not call it a clean pass because the total error count matches
   an earlier run; compare the affected files and diagnostics.
5. Run browser coverage only if the changed behavior requires it. Read
   `e2e/CLAUDE.md`, use the existing publication spec and a focused `--grep`, set
   `--workers=1 --retries=0`, and use test frontend/backend/database instances.
   Set `E2E_REQUIRE_SUPERSYNC=true`, `E2E_BASE_URL`, `SUPERSYNC_E2E_URL`, and
   `DATABASE_URL` for that setup. Verify any temporary Playwright configuration
   before reusing it. Do not silently bypass setup failures.
6. Stop only the services you started. Preserve failure logs. Distinguish a
   skipped test, environment failure, pre-existing diagnostic, and actual
   assertion failure. Do not retry until green without explaining the cause.

**Deliverable:** concise results with commands, selected cases, pass/fail/skip
counts, relevant diagnostics, and log paths. Do not claim unrun checks passed.

## Task 3: Update the experiment plan — Luna

**Goal:** incorporate verified results without overstating readiness.

**Ownership:** `docs/plans/2026-09-17-agent-capture-stage-a.md` only.

1. Read the current plan and the reports/logs from tasks 1, 2, and 4 if used.
   Source each new validation claim from an actual run or inspected implementation.
2. Update only affected experiment sections, failure-table entries, remaining
   gates, and the validation record. Avoid another full historical rewrite.
3. Record the date, test scope and counts, demonstrated outcome, and material
   limitations. Distinguish seeded history from many running devices, tab closure
   from OS power loss, and test-harness publication from an HTTP/MCP endpoint.
4. Keep unresolved identity ownership, conflicting-content responses, database
   restoration, and connector compatibility explicit unless new evidence or an
   approved decision resolves them. Do not mark a gate closed just because a
   characterization test passes.
5. Preserve relevant historical results, but make the current conclusion clear.
   Do not report past counts as a fresh run or imply all suites ran together.

**Validation:** format the Markdown using the repository's existing Prettier and
run `git diff --check`. No application tests are needed for this documentation task.

**Deliverable:** the scoped documentation diff and a short list of the conclusions
that changed, with links to supporting local logs or reports where available.

## Task 4: Fix one reproduced defect — Terra, medium reasoning

**Start condition:** task 1 or 2 supplies a concrete failing test, established
expected behavior, and a specific defect. If none exists, report “no fix needed”
and make no changes. Do not search for speculative hardening to fill this task.

**Ownership:** the named reproduction spec and the smallest relevant test-harness
or dev-only capture-helper change. Identify exact files before editing. Production
sync, encryption, persisted models, schemas, and public APIs are outside this brief.

1. Reproduce the failure on the current checkout using real data shapes and the
   actual relevant persistence/transaction path. Save the before-fix evidence.
2. Read the applicable sync contributor documentation. Explain the cause and
   choose the smallest change satisfying the established requirement.
3. Implement that change while preserving transaction atomicity, terminal
   receipts, account isolation, and the existing generation/key/import fences.
   Keep the failing test as a regression test; do not weaken its assertion.
4. If fixing the failure requires deciding submission identity ownership, new
   restore semantics, a migration, or production sync/encryption changes, stop
   dependent implementation and report that concrete decision for stronger-model
   review. Include the reproduction and a proposed minimal approach.
5. Run the reproduction after the fix, then the directly affected suite and
   required `checkFile` checks. Inspect the diff for unrelated changes. Broaden
   validation only when the changed behavior or a failure justifies it.

**Deliverable:** before/after evidence, the minimal fix, validation results, and
any remaining risk. Hand the artifact to a stronger model for a focused review
before treating a sync-correctness change as complete. Do not launch a reviewer
or another agent unless separately authorized.
