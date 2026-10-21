# Multi-user collaboration: close the Plainspace seam

Oct 21, 2026 · status: proposal, not started · rev. 1

Super Productivity stays a single-user deep-work tool; Plainspace stays the
place where tasks go when they need other people. What fails users today is
the seam between the two, not the absence of a native multi-user mode. This
plan makes a Plainspace-linked project behave the way users already assume it
does: what I change in SP reaches the Space, what others change reaches me, and
my own planning, time and notes stay mine.

Builds on: [#8648](https://github.com/super-productivity/super-productivity/issues/8648)
(task-level delegation exploration), Plainspace's
[`docs/plans/2026-06-02-super-productivity-integration.md`](https://github.com/super-productivity/plainspace/blob/main/docs/plans/2026-06-02-super-productivity-integration.md)
(product vision) and
[`2026-06-30-connect-from-super-productivity.md`](https://github.com/super-productivity/plainspace/blob/main/docs/plans/2026-06-30-connect-from-super-productivity.md)
(connect flow, Phase 2 device code). Resolves #8790, #9833, #8616; informs #8476.

## Decision

1. **Fix the seam, don't build native multi-user.** No shared scopes in the
   SuperSync op-log, no accounts or roles in SP (§ Options considered).
2. **One contract: shared content, private plan.** Title, done, timed schedule
   and assignee are shared and sync both ways. Time tracked, estimates, notes,
   subtasks, tags, day-only planning and Today order never leave SP (§ The
   contract).
3. **Three phases, each shippable alone.** Phase 0 fixes what is broken and
   says truthfully what syncs. Phase 1 makes a shared project behave shared.
   Phase 2 adds handing a task to someone. Everything else waits for evidence.
4. **Plainspace stays minimal.** No notes, subtasks or comments on Plainspace
   items; its own non-goals already say so. Server work is a handful of
   additive integration endpoints.

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

| Area            | Today                                                                                                                                                 | Source                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Push            | Only `isDone`. `pushChanges` returns early otherwise; `patchTask$` sends `{done}`                                                                     | `plainspace-sync-adapter.service.ts:61,99-113`                             |
| Pull            | Any `updatedAt` change overwrites title, done and `dueWithTime` together; no per-field baseline, so a local edit is lost when anyone touches the item | `plainspace-common-interfaces.service.ts:132-151`                          |
| Failed push     | Snack only, no retry                                                                                                                                  | `issue-two-way-sync.effects.ts:198-210`                                    |
| Create          | Only on `addTask` of a root task in the bound project                                                                                                 | `issue-two-way-sync.effects.ts:326-428`                                    |
| Move in / out   | Moving in creates nothing; moving out keeps the link and keeps syncing                                                                                | same, `poll-issue-updates.effects.ts:139-146`                              |
| Share a project | Binds a provider; existing tasks stay local; the returned Space `url` is ignored, no invite link shown                                                | `plainspace-share.service.ts:51-110`                                       |
| Visibility      | Assigned-to-me tasks plus the unassigned claim pool; others' tasks invisible                                                                          | `plainspace-claim-pool.service.ts`, server `integration.ts:189-218`        |
| Connect         | Guided page on plainspace.org, then copy-paste the token; one PAT per email, minting revokes the old one                                              | `plainspace-connect-dialog.component.ts:66-80`, server `schema.ts:367-369` |
| Latency         | 5-minute poll of the full assigned list                                                                                                               | `plainspace.const.ts:7`                                                    |
| E2E             | None                                                                                                                                                  | —                                                                          |

### What the Plainspace server offers

The integration API (`packages/server/src/routes/integration.ts`, PAT auth)
lists my tasks (`?updatedSince=` supported, no tombstones), creates (assigned
to the caller, `:305`), patches **only** `{done}` (`:381-383`), deletes, lists
and claims unassigned tasks, and creates Spaces. Items have `text`
varchar(500), single `assignedTo`, `remindAt` (always an instant), `repeat`,
row-level `updated_at` only; no notes, subtasks or comments. Live updates are
SSE for member sessions only (`routes/sse.ts:12`). Spaces default to
`sharingMode: 'open'`, so anyone with the join link can participate without an
account. The member web API already edits text, `remindAt` and assignee; the
integration endpoints mostly need auth and scoping, not new logic.

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

No app shares time tracked or personal planning. Due dates are always shared.
Complaints repeat across all of them: one-way or silently stalled sync,
account or price barriers to inviting someone, others' tasks cluttering the
day view, notification noise.

**Take**

- One assignee per task (Todoist's "directly responsible individual").
- A per-user layer that never leaves the device: planning, time, notes, subtasks.
- Today shows only my tasks; shared tasks enter my plan only when assigned to me.
- No-account link invites (Plainspace already has them; SP just doesn't show the link).
- Visible sync state instead of silent failure (Linear's pending-changes counter).

**Deliberately don't**

- Multiple assignees, roles UI, permissions in SP.
- TickTick's per-list visibility setting: one calm default instead.
- Comments or activity feeds in SP: they stay in Plainspace.
- Sharing time tracked, even opt-in, in v1 (Clockify's everyone-sees-everything is the anti-pattern).
- End-to-end-encrypted group sharing: group key management is still
  research-grade (Keyhive) and even Jazz moved permissions to a trusted server.

## Options considered

| Option                                           | Verdict                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Native shared projects in SuperSync**       | Rejected. Every load-bearing sync decision assumes one owner: `MAX_VECTOR_CLOCK_SIZE = 20` (members × devices overflow it), E2EE keyed to one user's password, `SYNC_IMPORT`/`BACKUP_IMPORT` drop concurrent ops (one member's restore would wipe the others), project delete-wins. Also contradicts the #10351 position on SP hosting shared data. |
| **B. Same-device profiles**                      | Out of scope. A different problem (#5189 part 1); OS accounts cover it.                                                                                                                                                                                                                                                                             |
| **C. Grow Plainspace into an SP-shaped tracker** | Rejected. Notes, subtasks and estimates on items are explicit Plainspace non-goals; its users are households and clubs who never install SP.                                                                                                                                                                                                        |
| **D. Close the seam (chosen)**                   | Fixes every reported pain, needs no SP persisted-model change, keeps the server additive.                                                                                                                                                                                                                                                           |

## The contract: shared content, private plan

A task in a shared project is **linked** (`issueType === 'PLAINSPACE'`). A
linked task stays shared wherever I file it; the shared project only decides
where new links come from.

| SP field                     | Plainspace   | Direction                      | Notes                                                                                            |
| ---------------------------- | ------------ | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `title`                      | `text`       | both                           | Titles over 500 characters are not pushed; the task shows a sync error                           |
| `isDone`                     | `checked`    | both                           | Exists                                                                                           |
| `dueWithTime`                | `remindAt`   | both; pull only when recurring | Plainspace advances recurring items itself (#9833)                                               |
| `dueDay`                     | —            | local                          | `remindAt` always carries a time; inventing one is a new setting (declined in #9833)             |
| assignee                     | `assignedTo` | Phase 2, via explicit action   | Not a task field in SP; shown from a live view-model                                             |
| time tracked, estimate       | —            | local                          |                                                                                                  |
| notes, subtasks, attachments | —            | local                          | "How I break down my part is mine." Notes and subtasks become my private memory of a shared task |
| tags, Today order, reminders | —            | local                          |                                                                                                  |

Why `dueWithTime` and not the deadline fields: every linked task is assigned
to me (creates auto-assign to the caller, the poll only returns my tasks), so
a pushed time reminds only me; others see it as the agreed time. Mapping to
`deadlineWithTime` would keep planning fully private but time-specific
deadlines do not surface in Today (`task.selectors.ts:480-505`), so recurring
household tasks would stop landing on their day. Revisit if Phase 2's
release-to-pool makes pushed times notify the whole Space
(`reminder-sweep.ts:122-127` notifies all members for unassigned items).

## Plan

Sizes are rough: S = days, M = one to two weeks, L = more.

### Phase 0: fix what's broken, say what syncs (S)

1. **Reproduce #9988** (Android connect) from the supplied logs; fix or ask for
   what's missing. Answer the thread either way.
2. **One token, every provider.** A reconnect writes the new token to each
   bound Plainspace provider, one `IssueProviderActions.updateIssueProvider` op
   per provider (no multi-entity action). Treat 401 as "connection replaced, reconnect"
   (Plainspace connect plan §11). Closes #8616.
3. **Show the invite link.** After sharing, and in the project's Plainspace
   menu: "Copy invite link". Server returns `joinUrl` (null when the Space is
   private) from `POST /spaces` and `GET /me`, so SP never builds Plainspace
   URLs itself.
4. **Say where data goes.** The share dialog states that titles and due times
   are stored on the Plainspace host. The wiki's "what syncs where" table is
   updated in the same PR as each phase.

### Phase 1: a shared project behaves shared (M)

Server (Plainspace, additive):

- `PATCH /integration/tasks/:id` accepts `title` and `scheduledAt` alongside
  `done`; rejects `scheduledAt` on recurring items. super-productivity/plainspace#40
  (community, `remindAt`) is a starting point.
- `GET /me` returns `capabilities: string[]`, so SP feature-detects older
  self-hosted servers and stays pull-only against them.
- Device-code connect (`POST /integration/device-code`, `/device-token` + an
  approve page), as already planned in Plainspace's connect plan Phase 2.

SP:

1. **Per-field pull.** `_toFreshData` only writes a field whose remote value
   differs from its baseline in `issueLastSyncedValues`; reuse the plugin
   adapter's logic (`plugin-issue-provider-adapter.service.ts:683-740`) rather
   than a second implementation.
2. **Two-way title and timed schedule.** `getSyncConfig` returns
   `{ isDone: 'both', title: 'both', dueWithTime: 'both' }`, with `dueWithTime`
   pull-only when `isRecurring`; `pushChanges` sends them. Existing conflict
   rule stays: if the remote changed since the baseline, the remote wins.
3. **Offline edits catch up.** On each poll, a field whose local value differs
   from the baseline while the remote still equals it is pushed. That makes
   the baseline the queue: no new persisted outbox, and edits made offline
   reach the Space on the next successful poll.
4. **Moving in shares** (#8790). A `LOCAL_ACTIONS` effect on
   `moveToOtherProject` into a bound project reuses the create-and-link path of
   `autoCreateIssueOnTaskAdd$`. Moving out keeps the link (no prompt, nothing
   deleted).
5. **Sharing a project shares its tasks.** The share dialog shows "Also share
   the N open tasks in this project", default on. A per-task loop of the same
   create-and-link; subtasks stay local. Blocks with a message above
   Plainspace's 500 active items per Space and paces itself under the
   100 creates/min limit.
6. **Refresh when I look.** Poll on window focus and app resume with
   `updatedSince`, keep the 5-minute full poll (the delta has no tombstones,
   the full list catches removals). Plainspace's own target is ≤5 s from
   action to visible; on focus is close enough without a push channel.
7. **Connect without pasting.** Use device code where the server reports the
   capability; paste stays as fallback. A second device finds the synced token
   in the provider config and does not mint a new one (minting revokes the
   first).

### Phase 2: hand a task to someone (M), #8648

Server: `GET /integration/spaces/:id/members` (id, display name, avatar);
`PATCH /tasks/:id` accepts `assigneeId` (a member, or `null` to release) for
tasks assigned to the caller, matching the vision doc's "you acting on your
own task"; `GET /tasks?ids=` for any task in a Space the caller belongs to
(members already see every item in the web app).

SP:

1. **Task context menu → "Assign to… / Release to Space"** on linked tasks.
   Menu only, never in the task row template (hot path).
2. **A delegated task stays.** It is unscheduled (one update op), keeps its
   time, notes and subtasks, and shows the assignee's name from a live,
   non-persisted view-model like the claim pool. Its done state keeps pulling
   via `GET /tasks?ids=`. Reassigned back to me, it returns to the normal
   assigned-to-me path.
3. **Not shared yet?** The menu entry offers to share the project first
   (existing share flow), then assign. No per-contact Spaces in this phase.

### Phase 3: only on evidence

Each needs a user report or measured need, not a guess:

- SSE for integration clients, if "refresh on focus" isn't fast enough.
- A cross-project "Waiting on" view, if delegated tasks get lost in projects.
- Plugin migration (#8476). Decide after Phase 2 so the riskiest change
  (synced provider-config keys) doesn't land together with behaviour changes.
- Day-only push, reusing `reminder.dueDateNotificationHour` (no new setting).

## Sync and long-term cost

- **No SP persisted-model change in Phases 0–2.** Membership is derived from
  `issueType`/`issueProviderId`; baselines use the existing
  `issueLastSyncedValues`; the assignee is a live view-model, not a stored
  list (AGENTS.md sync rule 13).
- **Ops.** Pushes and pulls are ordinary single-task `updateTask` ops; create
  and link stay the existing two ops; bulk share is a per-task loop (sync rule 6).
  New effects inject `LOCAL_ACTIONS`, so remote ops never re-trigger a push.
- **Integration API is a contract** with released SP clients and self-hosted
  Plainspace versions. Additive only: old clients keep sending `{done}`; new
  clients feature-detect via `capabilities` and fall back to today's behaviour.
- **Privacy.** Plainspace content is not end-to-end encrypted. Sharing is
  explicit and the dialog says so; nothing private in the table above leaves SP.
- **Unreproduced risks, filed as issues with a reproduction first** (sync rule 15),
  not fixed in these PRs: a second device importing an auto-created task as a
  duplicate before the link op arrives; the update poll lacking
  `skipDuringSyncWindow` (`poll-issue-updates.effects.ts:68-97`); concurrent
  `restoreTask` of a recurring task with differing `timeSpentOnDay` payloads.
- PRs touching `issue-two-way-sync.effects.ts` follow the sync-PR review rule
  (fresh-context review pass, findings in the PR body).

## Testing

- **New E2E harness**: Plainspace has `docker-compose.e2e.yml`; add
  `npm run e2e:plainspace:file` alongside the SuperSync one and run it in the
  scheduled E2E workflow. Phase 1 cases: rename round-trip, reschedule
  round-trip, recurring stays pull-only, move-in creates, offline edit pushed
  after reconnect, two SP clients plus a web edit converge. Phase 2: assign,
  release, reassign back.
- Unit specs for the adapter's push/pull decisions and the move-in effect.
- Against an older server without `capabilities`: SP stays pull-only and
  shows no new UI.

## Not doing

Native multi-user in SuperSync, accounts or roles in SP, same-device
profiles, notes/subtasks/comments on Plainspace items, multiple assignees,
team or workload views, sharing time tracked, SP-hosted public links,
per-list visibility settings.

## Open questions for the maintainer

1. **Direction.** Confirm "close the seam" over native multi-user.
2. **Timed schedule shared both ways.** A time I plan on a shared task becomes
   visible in the Space (reminders still go only to me as assignee). Accept,
   or keep planning private via the deadline mapping and lose Today placement?
3. **Share existing tasks on share:** default on (users expect it, #8790) or off?
4. **#3969.** Reopen it or comment with a link to this plan, so the
   collaboration request isn't read as closed by redirection.

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
[Jazz: lessons from classic](https://jazz.tools/blog/what-we-learned-from-classic-jazz);
[Clockify: hide time](https://clockify.me/help/administration/hide-time).

Plainspace server facts are from `super-productivity/plainspace` at `774071b`
(2026-10-12); SP code references are from `master` at `43269ba`.
