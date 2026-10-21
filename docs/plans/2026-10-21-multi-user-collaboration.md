# Multi-user collaboration: close the Plainspace seam

Oct 21, 2026 · status: direction proposed; implementation contracts in
review · rev. 3: the scheduled time syncs directly (no separate shared time)
and deletion has one path · rev. 2 after a review by Astra (schedule
contract, write protocol, deletion contract, token scoping, smaller first
release)

Super Productivity stays a single-user deep-work tool; Plainspace stays the
place where tasks go when they need other people. What fails users today is
the seam between the two, not the absence of a native multi-user mode. This
plan makes a Plainspace-linked project behave the way users already assume it
does: what I change in SP reaches the Space, what others change reaches me, and
how I work on a task (time, notes, subtasks) is not sent to Plainspace.

Builds on: [#8648](https://github.com/super-productivity/super-productivity/issues/8648)
(task-level delegation exploration), Plainspace's
[`docs/plans/2026-06-02-super-productivity-integration.md`](https://github.com/super-productivity/plainspace/blob/main/docs/plans/2026-06-02-super-productivity-integration.md)
(product vision) and
[`2026-06-30-connect-from-super-productivity.md`](https://github.com/super-productivity/plainspace/blob/main/docs/plans/2026-06-30-connect-from-super-productivity.md)
(connect flow, Phase 2 device code). Resolves #8790, #9833, #8616; informs #8476.

## Decision

1. **Fix the seam, don't build native multi-user.** No shared scopes in the
   SuperSync op-log, no accounts or roles in SP (§ Options considered).
2. **Shared task, private work.** Title, done, the scheduled time and (later)
   the assignee are shared with the Space. Time tracked, estimates, notes,
   subtasks, tags and Today order are never sent to Plainspace. SP's own sync
   still carries them between my devices.
3. **The assignee owns the schedule.** While a task is assigned to me, its
   timed schedule syncs both ways; a plan without a time shows as no time in
   Plainspace (§ Scheduled time).
4. **Contracts before features.** Every release below ships with its write,
   recovery and deletion rules defined (§ Sync protocol, § Deletion and lost
   access), not just its happy path.
5. **Small releases, each shippable alone.** The first behavioural release is
   safe pulls, title round-trips, recoverable move-in creation, visible sync
   state and focused E2Es. Scheduled time, bulk sharing, device-code connect
   and faster refresh ship separately.
6. **Plainspace stays minimal.** No notes, subtasks or comments on Plainspace
   items; its own non-goals already say so. Server work is a handful of
   additive integration changes.

## Evidence

### Demand

Small but real, and concentrated on the integration's behaviour rather than on
whether collaboration should exist.

- 8 user-filed SP issues over ~4 years ask for multi-user, ~17 👍 total:
  [#3969](https://github.com/super-productivity/super-productivity/issues/3969)
  (8, assign to family and co-workers, TickTick switcher),
  [#5189](https://github.com/super-productivity/super-productivity/issues/5189)
  (5, family: separate profiles _and_ shared tasks),
  [#5835](https://github.com/super-productivity/super-productivity/issues/5835)
  (4, people on tasks); the rest have 0. For scale: task dependencies #2173 has 43.
- Use cases: small work team 4, household/family 2 (+ super-productivity/plainspace#17, #10),
  same-device profiles 3 (mostly one person's work/life split), client
  read-only 1.
- Plainspace users are an active early-adopter group (~6 people). Every one of
  their reports is about the seam:

| Pain                                           | Where                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| Renaming in SP doesn't reach the Space         | #3969 comment, #9833                                                               |
| A due time set in SP never reaches others      | #9833                                                                              |
| A task moved into a shared project stays local | #8790 (maintainer: "next release", 2026-07-06; community PR #9511 closed unmerged) |
| Second Space or reconnect breaks the token     | #8616 ("you can only have one active token")                                       |
| Android can't connect                          | #9988 (logs supplied, unanswered since Sep 28)                                     |
| Wiki said "two-way" when only done synced      | #9833 (wiki corrected)                                                             |
| Closing #3969 read as a dodge                  | #3969: "You can't be serious."                                                     |

Declined before, and still declined here: real-time Trello-style team boards
(#10830), SP-hosted public links (#10351, "doesn't fit offline-first,
privacy-first"), same-device multi-login (#5189 part 1; OS accounts cover it).

### What the code does today

| Area            | Today                                                                                                                                                                  | Source                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Push            | Only `isDone`. `pushChanges` returns early otherwise; `patchTask$` sends `{done}`                                                                                      | `plainspace-sync-adapter.service.ts:61,99-113`                             |
| Push triggers   | `updateTask`, short syntax, schedule/reschedule/**unschedule**, tags, planner **plan-for-day/transfer**; fetch, then patch, no precondition                            | `issue-two-way-sync.effects.ts:153-216`, `compute-push-decisions.ts`       |
| Pull            | Any `updatedAt` change overwrites title, done and `dueWithTime` together; no per-field baseline, so a local edit is lost when anyone touches the item                  | `plainspace-common-interfaces.service.ts:132-151`                          |
| Schedule fields | Setting `dueWithTime` clears `dueDay` and vice versa                                                                                                                   | ARCHITECTURE-DECISIONS.md #1                                               |
| Failed push     | Snack only, no retry, no lasting state                                                                                                                                 | `issue-two-way-sync.effects.ts:198-210`                                    |
| Create          | Only on `addTask` of a root task in the bound project; create, then a second op links                                                                                  | `issue-two-way-sync.effects.ts:326-428`                                    |
| Delete          | `deleteTask`/`deleteTasks` delete the Plainspace item for everyone after the undo window; deleting a project does not; removing the provider unlinks tasks, keeps them | same `:267-325`, `issue-provider-shared.reducer.ts:60-70`                  |
| Missing items   | A task that leaves my `/tasks` list is left untouched; the server answers 404 for deleted, unassigned and no-longer-member alike                                       | `plainspace-common-interfaces.service.ts:94-130`, server `integration.ts`  |
| Move in / out   | Moving in creates nothing; moving out keeps the link and keeps syncing                                                                                                 | `poll-issue-updates.effects.ts:139-146`                                    |
| Share a project | Binds a provider; existing tasks stay local; the returned Space `url` is ignored, no invite link shown                                                                 | `plainspace-share.service.ts:51-110`                                       |
| Connect         | Guided page on plainspace.org, then copy-paste the token; one PAT per email, minting revokes the old one; provider configs may point at different hosts                | `plainspace-connect-dialog.component.ts:66-80`, server `schema.ts:367-369` |
| Latency         | 5-minute poll of the full assigned list                                                                                                                                | `plainspace.const.ts:7`                                                    |
| E2E             | None                                                                                                                                                                   | —                                                                          |

### What the Plainspace server offers

The integration API (`packages/server/src/routes/integration.ts`, PAT auth)
lists my tasks (`?updatedSince=` supported, no tombstones), creates (assigned
to the caller, `:305`), patches **only** `{done}` (`:381-383`), deletes (soft,
restorable in the web app for 30 days: `routes/items.ts:457`,
`services/retention.ts:16`), lists and claims unassigned tasks, and creates
Spaces. Items have `text` varchar(500), single `assignedTo`, `remindAt`
(always an instant), `repeat`, and a row-level `updated_at` only; no notes,
subtasks or comments. Live updates are SSE for member sessions only
(`routes/sse.ts:12`). Spaces default to `sharingMode: 'open'`, so anyone with
the join link can participate without an account. The member web API already
edits text, `remindAt` and assignee; the integration endpoints mostly need auth
and scoping, not new logic.

## Prior art

Checked Oct 2026 from vendor help pages as surfaced by web search (pages not
opened hands-on; treat single cells as approximate). Sources at the end.

| App                 | Shared                         | Per-user layer on shared tasks                                      | Assignment               | Others' tasks in my day view      | Invite                               |
| ------------------- | ------------------------------ | ------------------------------------------------------------------- | ------------------------ | --------------------------------- | ------------------------------------ |
| **Microsoft To Do** | Whole lists only               | My Day, reminders                                                   | One person               | No; "Assigned to me" feeds My Day | Link; same account type only         |
| **Todoist**         | Projects, comments             | View settings, personal labels, reminders aimed at one collaborator | Exactly one, on purpose  | Mine + unassigned                 | Name or email; free tier capped at 5 |
| **TickTick**        | Lists, comments                | Per-list "show in smart list" (4 options)                           | One                      | Configurable per list             | Link or email, owner approves        |
| **Google Tasks**    | Single tasks from Docs/Chat    | Assignee chooses which own list it lands in                         | One                      | Only mine                         | Doc / space membership               |
| **Sunsama, Motion** | In the source tool / workspace | Planner stays personal; Motion's "My Tasks" can't be assigned       | In shared workspace only | Only what I pull in               | Workspace invite                     |
| **Amazing Marvin**  | Opt-in shared lists            | Everything else                                                     | —                        | —                                 | Link; non-users act as "Anonymous"   |

**Take**

- One assignee per task (Todoist's "directly responsible individual").
- A personal layer on shared tasks: Microsoft's My Day and per-user reminders,
  Sunsama's and Motion's personal planner over a shared source.
- Today shows only my tasks; shared tasks enter my plan only when assigned to me.
- No-account link invites (Plainspace already has them; SP just doesn't show the link).
- Visible sync state instead of silent failure (Linear's pending-changes counter).

**Deliberately don't**

- Multiple assignees, roles UI, permissions in SP.
- TickTick's per-list visibility setting: one calm default instead.
- Comments or activity feeds in SP: they stay in Plainspace.
- Sharing time tracked in v1.
- End-to-end-encrypted group sharing: group key management is still
  research-grade (Keyhive) and even Jazz moved permissions to a trusted server.

## Options considered

| Option                                           | Verdict                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Native shared projects in SuperSync**       | Rejected. Every load-bearing sync decision assumes one owner: `MAX_VECTOR_CLOCK_SIZE = 20` (members × devices overflow it), E2EE keyed to one user's password, `SYNC_IMPORT`/`BACKUP_IMPORT` drop concurrent ops (one member's restore would wipe the others), project delete-wins. Also contradicts the #10351 position on SP hosting shared data. |
| **B. Same-device profiles**                      | Out of scope. A different problem (#5189 part 1); OS accounts cover it.                                                                                                                                                                                                                                                                             |
| **C. Grow Plainspace into an SP-shaped tracker** | Rejected. Notes, subtasks and estimates on items are explicit Plainspace non-goals; its users are households and clubs who never install SP.                                                                                                                                                                                                        |
| **D. Close the seam (chosen)**                   | Fixes every reported pain, needs no SP persisted-model change, keeps the server additive.                                                                                                                                                                                                                                                           |

## The contract: shared task, private work

A task in a shared project is **linked** (`issueType === 'PLAINSPACE'`). A
linked task stays shared wherever I file it; the shared project only decides
where new links come from. "Private" means _not sent to Plainspace_.

| SP field                        | Plainspace   | Direction                                           | Notes                                                           |
| ------------------------------- | ------------ | --------------------------------------------------- | --------------------------------------------------------------- |
| `title`                         | `text`       | both                                                | Over 500 characters: not pushed, task shows a sync error        |
| `isDone`                        | `checked`    | both                                                | Exists                                                          |
| `dueWithTime` (scheduled time)  | `remindAt`   | both while assigned to me; pull only when recurring | § Scheduled time. The mapping exists today, pull only           |
| assignee                        | `assignedTo` | Phase 2, explicit action only                       | Not a task field in SP; shown from a live view-model            |
| time, estimate, notes, subtasks | —            | private                                             | Notes and subtasks become my private breakdown of a shared task |
| tags, deadlines, Today order    | —            | private                                             |                                                                 |

### Scheduled time

The reported need: a due time set in SP should reach the people in the Space
(#9833). One field carries it, the task's existing schedule. Three rules:

1. **Plainspace shows my timed schedule.** The value sent is `dueWithTime`, or
   "no time" when the task has none. Rescheduling, dragging in the planner,
   planning a day without a time (which clears `dueWithTime`, ADR #1) and
   unscheduling are all ordinary changes of that one value. No suppression
   rules: Astra's "day-only reads as clearing" case is intended behaviour.
2. **The assignee owns it.** It syncs only while the task is assigned to me.
   The server refuses writes to other people's tasks anyway, and pulling their
   time would put their work into my Today. Today every linked task is
   assigned to me, so a pushed time reminds only me; others see it.
3. **Repeating tasks: Plainspace sets the time.** Pull only; local edits are
   skipped silently, as for other providers' recurring items
   (`isExpectedSyncSkipError`), and the next occurrence overwrites them.

Concurrent changes follow the protocol below: remote wins, mine shows in the
sync error. Cost: my timed plan for a shared task is visible to the Space, and
a day-only plan removes the time others see. Date-only times wait until
Plainspace has them; inventing a clock time is a new setting (declined in
#9833). Dropped in rev. 3: rev. 2's separate shared time on the deadline
fields with "plan follows until I replan" seeding. It kept planning private but needed a
transitions table, a backfill and a second schedule in the UI.

## Sync protocol

**Field edits.** Each linked field has a baseline in `issueLastSyncedValues`.
On every poll and after every local edit, per field:

| Local vs baseline | Remote vs baseline | Action                                                           |
| ----------------- | ------------------ | ---------------------------------------------------------------- |
| same              | same               | nothing                                                          |
| same              | changed            | pull                                                             |
| changed           | same               | push (also covers edits made offline or before a restart)        |
| changed           | changed            | remote wins (existing rule), local value shown in the sync error |

**Conditional writes.** `PATCH` carries `ifUpdatedAt`, the item's row-level
`updated_at` the decision was based on. The server answers 409 with the current
item if the row changed since; SP recomputes the per-field table against it
and retries at most twice. Row level is enough because field decisions happen
on the client. This makes "remote wins" hold between fetch and write, and makes
two SP devices retrying the same edit converge: the second write gets 409, sees
the remote already equals its local value, and only advances its baseline.
Against a server without preconditions SP pushes `done` only, as today.

**Creates are idempotent.** `POST /tasks` carries `clientRef` (the SP task
id); the server keeps it unique per Space and returns the existing item on a
repeat. `SPTask` returns `clientRef`. Recovery:

| Failure                                 | Recovery                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Response lost                           | Retry with the same `clientRef` returns the same item                                          |
| Created, but the link op never happened | The next poll sees an item whose `clientRef` is a local task id and links that task, no import |
| Create failed or never ran (offline)    | Task stays unlinked and shows "Not shared · Share" in its detail panel; retry is safe          |
| Two devices retry                       | Same `clientRef`, one item                                                                     |

Creates are not retried automatically after a restart: without a persisted
"pending" marker SP can't tell a failed share from a task that was never meant
to be shared, and adding one is not worth it while the manual retry is safe.

**Visible state** (a deliverable, not just a principle). In-memory, rebuilt on
each poll: _waiting to sync_, _couldn't sync: reason · Retry_, _not shared ·
Share_, _no longer in your Plainspace list_. Shown in the task detail panel's
issue section and as a count in the provider's issue-panel header. Never in
the task row template (hot path).

## Deletion and lost access

Needs to be fixed before anything creates links automatically, because move-in
and bulk sharing raise the blast radius of today's delete-for-everyone.

| Event                                                | Plainspace                                                                                                      | Local                                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Delete a linked task assigned to me                  | Deleted for everyone after the undo window (exists; confirm text says so; restorable in Plainspace for 30 days) | Deleted; in Recently deleted                                                                           |
| Delete a task no longer assigned to me               | Untouched (server refuses: not assigned to me)                                                                  | Deleted; normal confirm, no "for everyone" warning                                                     |
| Delete the project                                   | Untouched (not a delete trigger, verified)                                                                      | Tasks deleted locally                                                                                  |
| Remove the provider                                  | Untouched                                                                                                       | Tasks unlinked, notes and time kept (exists)                                                           |
| Item deleted, unassigned or membership lost remotely | —                                                                                                               | Never deleted. Task, notes and time kept; state _no longer in your Plainspace list_; no further pushes |
| Move the task out of the shared project              | Untouched, stays linked                                                                                         | —                                                                                                      |

A missing item is never read as a deletion: the server returns the same 404
for deleted, reassigned and lost-membership, by design.

Delete is one action. There is no separate "delete my copy": the warning
appears only when the delete reaches Plainspace, i.e. the task is assigned to
me. A task that is no longer mine (handed off, reassigned, gone from my list)
is deleted locally like any other task.

## Releases

Sizes are relative (S, M) and not commitments; each release has its own PRs.

### Release 0: fix what's broken, say what syncs (S)

1. **Reproduce #9988** (Android connect) from the supplied logs; fix or ask for
   what's missing. Answer the thread either way.
2. **Scoped token replacement.** A reconnect writes the new token only to
   providers whose current token equals the replaced one (same credential,
   so same host and account), one `IssueProviderActions.updateIssueProvider`
   op per provider. A 401 means "Plainspace rejected the token, reconnect",
   not "replaced". Closes #8616.
3. **Show the invite link.** After sharing, and in the project's Plainspace
   menu: "Copy invite link". Server returns `joinUrl` (null when the Space is
   private) from `POST /spaces` and `GET /me`, so SP never builds Plainspace
   URLs itself.
4. **Say where data goes.** The share dialog states that titles, done state
   and scheduled times are stored on the Plainspace host. The wiki's
   "what syncs where" table is updated in the same PR as each release.

### Release 1: safe pulls, title round-trip, move-in (M)

Server: `PATCH` accepts `title` and `ifUpdatedAt`; `POST /tasks` accepts
`clientRef`; `GET /me` returns `capabilities: string[]` for features behind
authentication.

SP:

1. **Per-field pull** per the protocol table; reuse the plugin adapter's
   baseline logic (`plugin-issue-provider-adapter.service.ts:683-740`) rather
   than a second implementation. Fixes local edits being overwritten today.
2. **Title both ways** with conditional writes.
3. **Moving in shares** (#8790): a `LOCAL_ACTIONS` effect on
   `moveToOtherProject` into a bound project reuses create-and-link with
   `clientRef`. Moving out keeps the link.
4. **Visible state** as above.
5. **Plainspace E2E harness** and focused cases (§ Testing).
6. **Older servers** keep done push and today's pulls; no new UI.

### Release 2: scheduled time both ways (S)

Server: `PATCH` accepts `scheduledAt` (or `null`), rejects it on recurring
items (super-productivity/plainspace#40, community, is a starting point). SP:
`dueWithTime` becomes a two-way field under § Scheduled time; no backfill, the
pull mapping already exists. Closes #9833.

### Release 3: share existing tasks (S)

The share dialog offers "Share these N open tasks" as an explicit
confirmation, not a default. A per-task loop of create-and-link with
`clientRef`; subtasks stay local. Blocks above Plainspace's 500 active items
per Space and paces itself under the 100 creates/min limit. Depends on
Release 1's idempotent create and on § Deletion being in place.

### Separately shippable

- **Device-code connect.** Server endpoints as planned in Plainspace's connect
  plan Phase 2. SP calls the start endpoint without auth and falls back to the
  paste flow on 404, so no authenticated discovery is needed. A second device
  finds the synced token and does not mint a new one (minting revokes the
  first).
- **Refresh when I look.** Poll on window focus and app resume with
  `updatedSince`; keep the 5-minute full poll, which catches removals (the
  delta has no tombstones).

### Phase 2: hand a task to someone (M), #8648

Server: `GET /integration/spaces/:id/members`; `PATCH` accepts `assigneeId` (a
member, or `null` to release) for tasks assigned to the caller, matching the
vision doc's "you acting on your own task"; `GET /tasks?ids=` for any task in
a Space the caller belongs to (members already see every item in the web app).

SP:

1. **Task context menu → "Assign to… / Release to Space"** on linked tasks.
   Menu only, never in the task row template.
2. **A delegated task stays.** Its schedule is now the assignee's, so it is
   unscheduled locally and no longer syncs (§ Scheduled time, rule 2). It
   keeps its time, notes and subtasks, and shows the assignee's name from a
   live, non-persisted view-model like the claim pool. Title and done keep
   pulling via `GET /tasks?ids=`. Reassigned back to me, it returns to the
   assigned-to-me path, schedule included.
3. **Not shared yet?** The menu entry offers to share the project first, then
   assign.

### Phase 3: only on evidence

SSE for integration clients; a cross-project "Waiting on" view; plugin
migration (#8476), decided after Phase 2 so synced provider-config key changes
don't land with behaviour changes; day-only schedules once Plainspace has a
date-only time.

## Sync and long-term cost

- **No SP persisted-model change.** Membership derives from
  `issueType`/`issueProviderId`; baselines use `issueLastSyncedValues`; the
  scheduled time uses the existing `dueWithTime` mapping; sync state and
  assignee are in-memory view-models (AGENTS.md sync rule 13).
- **Ops.** Pulls and pushes are single-task `updateTask` ops; create and link
  stay two ops, now recoverable; bulk share is a per-task loop (sync rule 6).
  New effects inject `LOCAL_ACTIONS`, so remote ops never re-trigger a push.
- **Integration API is a contract** with released SP clients and self-hosted
  Plainspace versions. Additive only: old clients keep sending `{done}`;
  `clientRef` and `ifUpdatedAt` are optional; new clients detect authenticated
  features via `capabilities` and keep today's behaviour without them.
- **Privacy.** Plainspace content is not end-to-end encrypted. Sharing is
  explicit and the dialog says so.
- **Unreproduced risks, filed as issues with a reproduction first** (sync rule
  15): a second device importing an auto-created task before the link op
  arrives (`clientRef` gives the fix a key to match on); the update poll
  lacking `skipDuringSyncWindow` (`poll-issue-updates.effects.ts:68-97`);
  concurrent `restoreTask` of a recurring task with differing `timeSpentOnDay`.
- PRs touching `issue-two-way-sync.effects.ts` follow the sync-PR review rule
  (fresh-context review pass, findings in the PR body).

## Testing

- **New E2E harness**: Plainspace has `docker-compose.e2e.yml`; add
  `npm run e2e:plainspace:file` alongside the SuperSync one and run it in the
  scheduled E2E workflow.
- **Release 1 cases**: title round-trip both ways; concurrent edit (remote wins,
  local shown in the error); response lost after create, then retry; app
  killed between create and link, then poll links instead of importing; two SP
  devices retrying the same edit independently; offline edit, restart,
  reconnect; move-in creates; older server keeps done push.
- **Release 2 cases**: reschedule, planner drag, day-only plan and unschedule
  each reach Plainspace; a remote change lands in SP; concurrent change (remote
  wins); a recurring task's local edit is skipped and the next occurrence
  pulls; a task not assigned to me neither pushes nor pulls its time.
- **Deletion cases**: each row of the deletion table.
- Unit specs for the per-field decision table and the move-in effect.

## Not doing

Native multi-user in SuperSync, accounts or roles in SP, same-device
profiles, notes/subtasks/comments on Plainspace items, multiple assignees,
team or workload views, sharing time tracked, SP-hosted public links,
per-list visibility settings.

## Open questions for the maintainer

1. **Direction.** Close the seam rather than build native multi-user (the
   review agrees).
2. **Day-only plans clear the Plainspace time.** Accepted as part of "the
   assignee owns the schedule"? The alternative, leaving Plainspace's time in
   place, means SP and Plainspace show different schedules.
3. **#3969.** Comment with the concrete scope and a tracking link; reopening
   the broad issue is optional.

## Sources

Vendor help pages, checked Oct 2026 via web search summaries:
[Microsoft To Do: assign tasks](https://support.microsoft.com/en-us/ToDo/assign-tasks-in-shared-lists),
[share a list](https://support.microsoft.com/en-us/todo/share-a-task-list);
[Todoist: assign tasks](https://todoist.com/help/articles/360007314279),
[reminders](https://www.todoist.com/help/articles/introduction-to-reminders-9PezfU);
[TickTick: shared lists](https://help.ticktick.com/articles/7055781706355179520);
[Google Tasks: assigned tasks](https://support.google.com/tasks/answer/11549608?hl=en);
[Sunsama with teammates](https://help.sunsama.com/docs/using-sunsama-with-teammates);
[Motion: workspaces and My Tasks](https://help.usemotion.com/product-and-feature-guides/projects/the-projects-tab/managing-workspaces-private-public-and-my-tasks);
[Amazing Marvin: lists for non-users](https://help.amazingmarvin.com/en/articles/6348551-shared-lists-for-nonusers-of-marvin);
[Linear offline mode](https://linear.app/docs/offline-mode);
[Ink & Switch Keyhive](https://www.inkandswitch.com/project/keyhive/);
[Jazz: lessons from classic](https://jazz.tools/blog/what-we-learned-from-classic-jazz).

Plainspace server facts are from `super-productivity/plainspace` at `774071b`
(2026-10-12); SP code references are from `master` at `43269ba`.
