# Hardening earns its place

Narrative behind the **Hardening needs an observed instance** rule in
[`AGENTS.md`](../AGENTS.md). The invariant lives there; the evidence lives here.

## What happened

A privacy branch (#7870, #5314) removed user content — task titles, notes,
calendar event titles — from the app's exportable log history, and disabled
Chromium's spellchecker so the app stops contacting Google for dictionaries.

The privacy fixes themselves were about 40 lines across five files. They were
correct in the first commit and survived nine independent reviews, across four
rounds, untouched.

Around them grew roughly 700 lines of enforcement machinery: a custom ESLint
rule, a grandfathered exception list, a fail-closed Electron `webPreferences`
assertion, and a source-scanning test. Every round of review found a way past
the rule; every finding was closed by adding another branch; each addition was
individually cheap and jointly unjustifiable.

## What the measurements showed

Attributing every report the rule produced to the code path that produced it
(measured 2026-09, over the 1,714 `*Log.<method>()` call sites in `src/app`
outside specs):

| Code path                                                      | Reports produced |
| -------------------------------------------------------------- | ---------------- |
| The rule's first version (bare identifier, shorthand property) | 110 of 121 (91%) |
| Everything added afterwards, in review                         | 11               |

Four of those 11 were false positives. Two independent measurements disagreed
on how to attribute the rest — the disagreement was over whether one shape
counted as an "addition" — which is itself the point: a number nobody can
reproduce is not evidence. The 110/121 split and the zero-instance count below
were both reproduced independently.

Seven of the additions had **zero instances** anywhere in the codebase. One
(`ChainExpression` unwrapping) was provably dead code: its child node type can
never be reportable, so unwrapping it could not change any verdict.

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

All of it collapsed into one call at app-ready:

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
