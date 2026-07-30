# Conflict-review cohort and persisted-data audit (plan Task 1)

**Date:** 2026-07-16
**Status:** Superseded in part — corrected 2026-07-30, see the correction notice below. Task 6 has not shipped.
**Owner:** Unassigned. **Tracking:** none; Task 6 of the parent plan is the only tracker.
**Scope:** Task 1 of [`2026-07-13-sync-simplification-plan.md`](2026-07-13-sync-simplification-plan.md). Blocks the conflict-review rollback (Task 6) and authorizes the producer freeze.
**Baseline:** master `6f88775ea2`. Feature under audit: conflict review / conflict journal, merged `962c5bbeb1` (PR #8874, 2026-07-11).
**Removal condition:** Delete once Task 6 lands and the `SUP_CONFLICT_JOURNAL_CLEARED_BEFORE` fail-safe in §4 has moved into the parent plan or the code that implements the deletion.

> ## ⚠️ Correction notice (2026-07-30)
>
> **The release premise this audit was built on has expired, and two of its conclusions
> depended on it.** Verified at master `a224d29762`:
>
> - `git tag --contains 962c5bbeb1` → **v18.15.0, v18.15.1, v18.16.0**. The feature is in
>   three stable releases. §1's "matches no release tag" was true on 2026-07-16 and is now
>   false — v18.15.0 was cut 2026-07-17, the day after this audit.
> - Schema **v4 shipped** in v18.15.0 and later, so §2's "both barriers are unreleased" is
>   also false. v18.14.0 (schema v2) is no longer the deployed stable baseline.
> - `disableDisjointMerge: true` from §6 was **reverted by PR #9101** ("unfreeze the
>   disjoint-field merge to stop data loss (#9095)", merged 2026-07-17), which also shipped
>   in v18.15.0. Only `disableConflictJournal: true` remains wired
>   (`remote-ops-processing.service.ts:486`; the file now lives under `src/app/op-log/sync/`,
>   not `apply/`).
>
> **What this changes:** the "no export obligation" decision in §4 and the second row of the
> decision summary rested on both carrying cohorts being pre-release. They are not. That
> question is **re-opened**, not re-decided here — see §4.
>
> **What still stands:** §3 (the journal never leaves the device), §4's
> `SUP_CONFLICT_JOURNAL_CLEARED_BEFORE` fail-safe requirement, and §5's stop condition. The
> lesson is the general one: never infer shipped-ness from a remembered tag — re-run
> `git tag --contains`.

## Decision summary

| Question                                             | Decision                                                                                                                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Producer freeze before the next release cut?         | **Partly reverted.** Journal producer still frozen; the disjoint-merge freeze was undone by #9101.                                                                         |
| Are Snap `edge` / Play `internal` supported cohorts? | ⚠️ **Moot — superseded.** The feature shipped to the stable fleet in v18.15.0. See the notice above.                                                                       |
| Journal retention / export / deletion policy         | ⚠️ **Re-opened.** The "no export" call assumed pre-release cohorts only. Retention mechanics (14-day / 200-row expiry) and the delete-together requirement are unaffected. |

These are product decisions, recorded explicitly rather than inferred from release tags, per the
Task 1 acceptance criteria. The cohort row above is the exception: it _was_ inferred from release
state, which is exactly why it expired.

## 1. Distribution channels carrying `962c5bbeb1`

> ⚠️ **Corrected 2026-07-30.** As of that date `git tag --contains 962c5bbeb1` returns
> **v18.15.0, v18.15.1, v18.16.0** plus the `issue-8983-verbose` working tag. The original
> finding below was accurate on 2026-07-16 and is preserved for the reasoning it supports; the
> cohort table still correctly describes which channels publish from `master`, but master is no
> longer the _only_ carrier. Re-run the command rather than trusting either version.

**As originally recorded (2026-07-16, now expired):** `git tag --contains 962c5bbeb1` matches no
release tag (only the `issue-8983-verbose` working tag). It is on `master`. v18.14.0 was cut
2026-07-10 and does not contain it.

| Channel                        | Trigger                              | From master? | Public?                           | Evidence                                         |
| ------------------------------ | ------------------------------------ | ------------ | --------------------------------- | ------------------------------------------------ |
| **Snap Store `edge`**          | every push to `master`               | **Yes**      | **Yes — unauthenticated**         | `.github/workflows/build.yml:2-6`, `:174-191`    |
| **Google Play `internal`**     | every push to `master`               | **Yes**      | Opt-in testers (Play caps at 100) | `.github/workflows/build-android.yml:135-150`    |
| GHCR `supersync:latest`        | push to `master`                     | Yes          | Server image only — no review UI  | `.github/workflows/supersync-docker.yml:3-14`    |
| GitHub Release (desktop)       | tag `v*`                             | No           | Yes                               | `build.yml:136-141`, `:515-524`                  |
| Web app                        | `release: published`, non-prerelease | No           | Yes                               | `build-update-web-app-on-release.yml:3-4`, `:11` |
| Play production / iOS / stores | tag `v*`                             | No           | Yes                               | `build-android.yml:190-198`, `build-ios.yml:2-7` |
| Cloudflare Pages preview       | `pull_request`                       | No           | Yes (URL in PR)                   | `pr-preview-build.yml:3-6`                       |

**Two cohorts already run the feature today.** Snap `edge` is the material one: it is public, requires no invitation, and snapd auto-refreshes subscribers. The Play `internal` track auto-updates its testers on-device by design (`build-android.yml:129-134`). Subscriber counts for both live in Snap Store / Play Console telemetry and are not knowable from the repo.

**Not exposed:** Electron desktop ships **no auto-updater** (`electron-builder.yaml:65-70`; the `autoUpdater` block in `electron/start-app.ts:474-486` is commented out) and master builds use `--publish never`; the web app deploys only on published non-prerelease releases; there is no nightly/canary release channel.

**Consequence:** the persisted-data obligation began at the first master push after `962c5bbeb1`, not at a future tag. The next release cut does not _create_ the obligation — it expands it from these two pre-release cohorts to the entire stable fleet, which is what the freeze prevents.

> ⚠️ **Corrected 2026-07-30.** That expansion **has since happened**: v18.15.0 (2026-07-17)
> carried the feature to the stable fleet. The freeze did not prevent it — #9101 deliberately
> reverted half of it the same day, to stop the data loss the freeze had re-armed (#9095).

## 2. Stable baseline vs master

> ⚠️ **Corrected 2026-07-30.** Every number in this section has moved. Schema **v4 is released**
> — v18.15.0, v18.15.1 and v18.16.0 all ship `CURRENT_SCHEMA_VERSION = 4`
> (`PROJECT_DELETE_WINS_SCHEMA_VERSION`, `packages/shared-schema/src/schema-version.ts:30-31`).
> Both barriers below are therefore shipped, not unreleased, and v18.14.0 is no longer the
> deployed stable baseline. Re-derive from `git show <tag>:packages/shared-schema/src/schema-version.ts`.

**As originally recorded (2026-07-16, now expired):**

- v18.14.0 (deployed stable): schema **v2**, op-log DB **v7**.
- master: schema **v4**, op-log DB **v10**.
- Both the v2→v3 replace/patch barrier and the v3→v4 marked-project-delete barrier are unreleased.

Unless reverted before the next tag, schema v3 compatibility, schema v4 delete-wins behaviour, and conflict review reach stable **together**. The deployed stable fleet stays v2/DB 7 until that cut.

## 3. What the journal persists

`ConflictJournalEntry` (`src/app/op-log/sync/conflict-journal.model.ts:98-112`) stores `entityTitle` plus `fieldDiffs` (`:66-93`), whose `localVal`/`remoteVal` hold **arbitrary entity field values copied verbatim** from op payloads — by design: "capture the discarded (losing) side of a conflict verbatim" (`:8-10`). There is no field allowlist; `NOISE_FIELDS` affects classification only, not storage. `kind: 'action'` diffs persist raw action payloads (`:85-92`) and are the widest content surface.

So rows contain **real user content** (task/note/project titles and discarded field values, including note bodies).

The blast radius is nonetheless small:

- **Device-local only.** Standalone IndexedDB `SUP_CONFLICT_JOURNAL` v1, store `conflicts` (`model.ts:181-185`), deliberately separate from the op-log `SUP_OPS` DB.
- **Never uploaded.** No sync/upload path reads the journal; sync code only calls `record()` and `clearAll()`. The only readers are UI.
- **Not in backups or exports.** `BackupService.loadCompleteBackup` builds solely from NgRx `AppDataComplete`, and the journal is not in NgRx; the DB constants appear nowhere outside the journal's own files.
- **Self-expiring.** `JOURNAL_RETENTION_DAYS = 14`, `JOURNAL_MAX_ENTRIES = 200`, pruned by `pruneOnStart()` (APP_INITIALIZER, `main.ts:313-321`) and opportunistically in `record()` above 220 rows.

**Known gap (accepted):** the 14-day age bound is enforced only on app start or when the row count crosses 220, so an always-on desktop can hold rows past 14 days, bounded at ~220 rows. With the writer frozen no new rows accrue, and the next app start prunes the rest.

**Known gap (accepted):** there is no user-facing way to clear the journal — the review page offers only keep/flip. `clearAll()` is reachable only via dataset replacement (`backup.service.ts:183`) or raw op-log rebuild (`operation-log-sync.service.ts:2174`). Adding a clear button was rejected: it grows UI surface on a feature slated for deletion, and with the writer frozen the content expires on its own.

## 4. Retention decision

> ⚠️ **Re-opened 2026-07-30.** The premise below is falsified: the carrying cohorts are no longer
> pre-release (§1). Whoever executes Task 6 must decide the export question afresh against the
> then-current fleet, rather than inheriting this "no export owed" conclusion. The §3 half of the
> premise — the journal never leaves the device — still holds and still argues against an export
> path; the cohort half no longer supports it on its own.

**As originally decided (2026-07-16, premise now expired):** No export path is owed, because both
carrying cohorts are pre-release (§1) and the data never left the device (§3).

Task 6 must delete the writer, store, reader, UI, route, banner, badge **and** the `SUP_CONFLICT_JOURNAL_CLEARED_BEFORE` localStorage marker together. The marker is a cross-profile privacy fail-safe (#9045): `clearAll()` swallows IndexedDB errors, so if `db.clear()` fails the rows physically survive, and the marker is what hides them from every read path until `pruneOnStart()` reclaims them. **It must not be stranded** — a marker left behind with the store deleted protects nothing, and a store left behind with the marker deleted exposes profile A's titles to profile B.

Deleting the journal's IndexedDB is itself part of Task 6: dropping the store code without deleting `SUP_CONFLICT_JOURNAL` would leave user content on disk with no code path to reach or prune it. A live constraint already recorded in-code (`conflict-journal.service.ts:68-70`) is that any future "reset app data" flow clearing localStorage must also clear the journal DB.

## 5. What this audit does not authorize

Per the Task 1 stop condition, this audit authorizes **removal of producers only**. It does not authorize schema downgrade, nor reader removal, while supported stored data remains possible. Task 6 remains gated on the preserve list in the plan (schema v3/v4 barriers, delete-wins, #9048 cascade recovery, #9035 clientId tiebreak, #9025 LWW projectId sanitization, #9045 decrypt-path footprint auth).

## 6. Action taken

> ⚠️ **Half reverted 2026-07-30.** Current state at `remote-ops-processing.service.ts:486` (the
> file moved to `src/app/op-log/sync/`):
>
> - `disableDisjointMerge: true` — **gone.** Reverted by PR #9101 ("unfreeze the disjoint-field
>   merge to stop data loss (#9095)", merged 2026-07-17, shipped in v18.15.0). It now appears only
>   as a test parameter in `conflict-resolution.service.spec.ts`.
> - `disableConflictJournal: true` — **still wired**, as described below.
>
> The rationale in the first bullet ("the behaviour of every released version to date") is the
> exact reasoning #9101 had to undo: the released behaviour _was_ the data-loss bug, so freezing
> to match it withheld a fix. Do not restore that bullet's logic. → `CLAUDE.md` §"Judging sync
> severity" #3.

The producer freeze landed with this document — see `remote-ops-processing.service.ts`, the single production entry point into `autoResolveConflictsLWW`:

- ~~`disableDisjointMerge: true` — conflicts resolve by whole-entity LWW, the behaviour of every released version to date, so the stable fleet gains no merge behaviour it would later be migrated off.~~ (Reverted by #9101; see above.)
- `disableConflictJournal: true` — no new rows are persisted.

Both are caller-wired rather than global, so `ConflictResolutionService` keeps the capability intact for its own tests and the freeze reverts by deleting two lines. Rows already written on edge/internal builds stay readable and expire on their own; the full rollback proceeds on its own schedule in Task 6.
