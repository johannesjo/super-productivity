# Hardening earns its place

Narrative behind the **Hardening needs an observed instance** rule in
[`AGENTS.md`](../AGENTS.md). The invariant lives there; the evidence lives here.

## What happened

A privacy branch (#7870, #5314) removed user content — task titles, notes,
calendar event titles — from the app's exportable log history, and disabled
Chromium's spellchecker so the app stops contacting Google for dictionaries.

The privacy fixes themselves were about 40 lines across five files. They were
correct in the first commit and survived nine rounds of adversarial review
untouched.

Around them grew roughly 700 lines of enforcement machinery: a custom ESLint
rule, a grandfathered exception list, a fail-closed Electron `webPreferences`
assertion, and a source-scanning test. Every round of review found a way past
the rule; every finding was closed by adding another branch; each addition was
individually cheap and jointly unjustifiable.

## What the measurements showed

Attributing every report the rule produced to the code path that produced it
(measured 2026-09, over all 1,681 `*Log.*()` call sites in `src/app`):

| Added in                                                       | Reports produced                   |
| -------------------------------------------------------------- | ---------------------------------- |
| The rule's first version (bare identifier, shorthand property) | 110 of 121 (91%)                   |
| Everything added across two subsequent review rounds           | 5, of which 4 were false positives |

Seven of the additions had **zero instances** anywhere in the codebase. One
(`ChainExpression` unwrapping) was provably dead code: its child node type can
never be reportable, so unwrapping it could not change any verdict.

## What review found afterwards

The measurement above attributes each report to the rule branch that produced
it. It says nothing about whether a report is a *leak*, and that turned out to
be the number that mattered: sampling the 121 showed roughly two thirds are
scalars the naming heuristics could not classify (`dateStr`, `evName`,
`handlerMap`, `initialSyncDone`, `date1`, `providerRaw`, `zoomFactor`). Framing
that list as "debt to pay down" would have sent contributors renaming benign
variables.

Two corrections followed. Widening the heuristics for the largest benign
cluster — timestamps, durations and `err*` strings, each with an observed
instance — removed 27 reports. Fixing the sites that were *actually* leaking
(three `TaskCopy[]` arrays in `data-repair.ts`, a `Project` in
`undo-task-delete.meta-reducer.ts`, a notification event, an issue search
result, and the `task-context-menu-inner` copy of the very block this branch
had already fixed in `task.component.ts`) removed 13 more hits and 9 files. The
baseline settled at 81 hits across 41 files.

The general lesson: **a precision number is the only one that justifies an
allowlist.** Coverage attribution measures the rule against itself.

The rule would not have caught the branch's own most severe leak. The iCal
`SUMMARY` calls that exported private calendar event titles are
`CallExpression`s — a shape the rule documents as a known gap.

## The three failure modes worth remembering

**Findings are hypotheses, not work orders.** "You missed X" was treated as an
instruction to close X, without asking whether X occurs in this repo. Three
regressions came from acting on a reviewer's aside: dropping `use` from a
boolean-name allowlist (immediate false positive on `useAlarmStyle`, the only
logged `use*` in `src/app` and a genuine boolean); narrowing a key allowlist to
quantities only (turned `{ error: scrubbedMessage }`, the canonical safe idiom,
into a CI-failing error); and removing `??`/`||`/`?:` traversal (opened a
cheaper bypass than the `!` it had just closed).

**Automation can launder a defect into recorded debt.** The grandfathered
offender list was regenerated from lint output, so a false positive introduced
by a change was silently _added_ to a list whose stated invariant is that it may
only shrink. A generated allowlist needs a gate: if it grows, stop and justify
each new entry.

**Verify that a check can fail before trusting that it passed.** Two
verification steps were theatre: `npx tsc -p tsconfig.json --noEmit` is a no-op
here (the root config is solution-style, `"files": []` — use
`src/tsconfig.app.json`, `src/tsconfig.spec.json`,
`electron/tsconfig.electron.json`), and a stale `.eslintcache` returned
identical counts either side of a real change. Negative controls — break the
thing, confirm the test goes red, restore it — caught what assertions did not.

## The cheaper alternative that existed the whole time

Three mechanisms policed one boolean: a per-window `spellcheck: false` flag, a
fail-closed assertion in the `webPreferences` guard, and a test scanning source
for the flag. The assertion could `process.exit(333)` mid-session, because two
of the three windows are built lazily inside an IPC handler and an async
function.

Two of the three collapsed into one call at app-ready (`main-window.ts` keeps
its per-window `spellcheck: false`; the session call makes it redundant rather
than wrong, and removing a shipped flag buys nothing):

```ts
session.defaultSession.setSpellCheckerEnabled?.(false);
```

No window in `electron/` uses a custom session `partition`, so this covers every
renderer including any added later. The optional call and its `catch` are not
decoration: Electron builds the session spellchecker behind
`ENABLE_BUILTIN_SPELLCHECKER`, so a distro-packaged rebuild can omit the method,
and an unguarded `TypeError` there would skip every window-creating listener
registered after it — reproducing, at startup, the very crash the revert was
meant to remove. A test asserts no renderer opts into a custom `partition`, so
the "covers any window added later" claim is checkable rather than aspirational.

## Related

- [`feature-review-guide.md`](feature-review-guide.md) — does it earn its place
- [`sync-and-op-log/contributor-sync-model.md`](sync-and-op-log/contributor-sync-model.md)
  — the sync section's "start from a reproducible problem" rule, which this
  generalises
