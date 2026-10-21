# Market position

Where Super Productivity has to be the best app on the market, which apps we
measure against, and how the comparison is kept current. The data lives in
[scorecard.md](scorecard.md); this page holds the target and the method.

Only the maintainer changes this page. The monthly refresh updates the scorecard
and proposes changes to this page in its PR description, but never edits it.

The product principles in [AGENTS.md](../../AGENTS.md#product-principles) rank
above this page and the scorecard. A dimension where SP loses is a prompt to look,
not an instruction to build: every gap still has to pass
[Does it earn its place?](../feature-review-guide.md#does-it-earn-its-place)
before anyone works on it.

## Target

**The best app for focused individual work: tasks, time and daily planning in one
place, private and offline.**

"Best" is judged per group, not across every feature:

| Group                   | Meaning                                                                                            | Dimensions                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Must be best**        | Better than every app in the competitor set, the specialists included                              | Time tracking · Focus and breaks · Daily planning and time-blocking · Developer integrations · Offline, privacy, ownership · Price                                  |
| **Must not lose badly** | Close to the best general todo app, because users who give up here never reach the strengths above | Quick capture · Organization · Calendar · Reminders · Platforms and widgets · Mobile polish · Sync reliability · First run                                          |
| **Won't compete**       | A recorded decision; the refresh only reports new evidence against it                              | Collaboration (#10830; sharing goes through Plainspace) · Habit tracking beyond simple counters and gamification (no streaks or points, per the product principles) |
| **Open decision**       | Not decided yet                                                                                    | Built-in AI assistant (today external assistants reach SP through the MCP endpoints)                                                                                |
| **Tracked**             | Recorded for context, no target                                                                    | Recurrence · Views · Notes · Consumer integrations · Extensibility · Customization                                                                                  |

## Competitor set

Keep the set fixed between refreshes so results stay comparable; change it only
here. Per-feature [Prior art](../feature-review-guide.md#prior-art) sections pick
their own apps for the problem at hand.

- **General todo apps** — what most people choose instead of SP: TickTick, Todoist,
  and To Do List by Splend Apps (`com.splendapps.splendo`, the most-reviewed
  dedicated to-do app on Google Play, used as the mass-market Android baseline).
- **Specialists**, scored only on the must-be-best dimensions they compete on:
  - Time tracking: Toggl Track, Clockify
  - Daily planning, time-blocking and developer integrations: Sunsama, Akiflow, Motion
  - Offline, privacy and ownership: Tasks.org, Vikunja, Things 3

## Dimensions

| #   | Dimension                        | Group               | What is compared                                                              |
| --- | -------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| 1   | Quick capture                    | Must not lose badly | Add-task syntax, voice, share sheet, email, assistants; desktop and phone     |
| 2   | Organization                     | Must not lose badly | Projects, subtask depth, tags, sections, saved filters, search                |
| 3   | Recurrence                       | Tracked             | Repeat rules, repeat from completion, end conditions                          |
| 4   | Calendar                         | Must not lose badly | Calendar views; which calendars sync, and in which direction                  |
| 5   | Daily planning and time-blocking | Must be best        | Planning flow, capacity, time-blocking, end-of-day review                     |
| 6   | Reminders                        | Must not lose badly | Reminders per task, alarm style, location, reliability on Android and iOS     |
| 7   | Time tracking                    | Must be best        | Timers, manual entries, worklogs, reports, export, idle handling              |
| 8   | Focus and breaks                 | Must be best        | Pomodoro and other modes, break enforcement, focus statistics                 |
| 9   | Views                            | Tracked             | List, board, Eisenhower matrix, timeline                                      |
| 10  | Habits                           | Won't compete       | Habit tracking and gamification                                               |
| 11  | Notes                            | Tracked             | Task notes, note lists, markdown                                              |
| 12  | Collaboration                    | Won't compete       | Shared lists, assignees, comments                                             |
| 13  | Developer integrations           | Must be best        | Jira, GitHub, GitLab, Linear and similar: import, two-way fields, worklogs    |
| 14  | Consumer integrations            | Tracked             | Zapier, email to task, voice assistants, browser extensions                   |
| 15  | Extensibility                    | Tracked             | Plugin API, REST API, MCP, open source                                        |
| 16  | Platforms and widgets            | Must not lose badly | Desktop, web, Android, iOS, watches, widgets, app shortcuts                   |
| 17  | Mobile polish                    | Must not lose badly | Density, tap targets, gestures, consistency on phones                         |
| 18  | Sync reliability                 | Must not lose badly | Setup effort, conflicts, data-loss reports                                    |
| 19  | Offline, privacy, ownership      | Must be best        | Account requirement, offline use, telemetry, encryption, export, self-hosting |
| 20  | Price                            | Must be best        | What is free, paid tiers, ads                                                 |
| 21  | AI                               | Open decision       | Built-in AI features                                                          |
| 22  | Customization                    | Tracked             | Themes, shortcuts, feature toggles                                            |
| 23  | First run                        | Must not lose badly | Time to first task, learning curve, onboarding                                |

Each scorecard cell is written from SP's side — **Better**, **Tie** or **Worse**,
with "by far" when the gap is large — plus a one-line reason. Each competitor
section records its sources and the month they were checked, with a confidence:

- **read**: the vendor page, store listing or our code was read directly
- **snippet**: only a search-result excerpt was available, for example because the
  host was blocked
- **unverified**: a single weak or conflicting source

Never raise a confidence level without reading the source directly. Score SP on
its latest release (`git fetch --tags`, then `git tag --sort=-v:refname | head -1`)
and note unreleased changes on `master` separately.

## Speed benchmark

Feature lists hide how fast a job gets done, which is where the 2026-10
comparison found the biggest losses. Each job counts taps or keystrokes, plus
seconds, from the stated start to the stated end:

| Job                  | Start → end                                                           | Platform |
| -------------------- | --------------------------------------------------------------------- | -------- |
| Capture with date    | Home screen → "Call Anna tomorrow 3pm" saved with date and time       | Phone    |
| Snooze a reminder    | Reminder fires → snoozed one hour                                     | Phone    |
| Plan tomorrow        | Six open tasks, two calendar meetings → all six placed on tomorrow    | Desktop  |
| Log time on an issue | Jira or GitHub issue → time tracked and worklog sent                  | Desktop  |
| Second-device sync   | Fresh install on a second device → first device's tasks visible       | Both     |
| Offline conflict     | Same task edited on two offline devices → reconnected; record outcome | Both     |
| First run            | First launch → first task completed                                   | Phone    |
| Leave with your data | Settings → all data exported in an importable format                  | Desktop  |

SP's side should become E2E tests with a step budget per job, so CI fails when a
job gets slower; until then it is measured by hand. Competitors are measured by
hand; re-measure a job when a competitor's changelog says it changed.

## Monthly refresh

A scheduled Claude Code session runs this procedure early each month.

1. Read this page, [scorecard.md](scorecard.md) and the product principles in
   AGENTS.md.
2. **SP side.** List what changed since the scorecard's snapshot
   (`git log --since=<snapshot date> --oneline`, plus the release notes of tags
   since then). Re-check every dimension those changes touch against the code.
   Don't carry an SP fact forward from memory.
3. **Competitor side.** For each app in the set, read its changelog or "what's
   new" page, pricing page and store listings since the last snapshot. Use
   subagents in parallel, one per competitor group.
4. **Update the scorecard.**
   - Change only the cells and facts that moved. Set the month on every row you
     re-checked.
   - Keep the summary and the gap list in step with the tables.
   - Each must-be-best or must-not-lose-badly dimension where SP is worse links an
     open issue. If there is none, search closed issues first: a declined idea
     needs new evidence. Otherwise list the gap under "proposed issues" in the PR
     description. Don't create issues automatically.
5. **Public claims.** Compare the comparison pages on super-productivity.com
   against the scorecard and list contradictions in the PR description.
6. **Open one PR** titled `docs(market): scorecard refresh YYYY-MM`. Its
   description lists:
   - verdict changes
   - notable competitor releases and price changes
   - gaps opened or closed
   - proposed issues
   - proposed changes to this page
   - sources that were blocked

   If nothing changed, open no PR and end with a short summary.

7. **Blocked sources.** If a host is blocked, use search snippets, mark them as
   snippets and name the blocked host in the PR. Never fill a number from memory.

**Maintainer review of each refresh PR:**

- Merge it, or correct the verdicts.
- Pick at most three gaps to work on next.
- Decide whether anything in the target or the competitor set should change.
