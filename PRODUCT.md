# Noura product context

Noura is a calm, privacy-first personal productivity application rebuilt from Super Productivity. It combines task planning, projects, notes, time tracking, focus sessions, calendar planning, issue-provider integrations, backups, and optional encrypted sync. It is not a team-management or employee-monitoring product.

## Users and jobs

- Individuals who plan projects and daily work across desktop and web.
- People who need tasks, notes, estimates, time tracking, reminders, and focus sessions to work completely offline.
- Developers and technical teams who pull actionable issues from Jira, GitHub, GitLab, Gitea/Forgejo, Linear, ClickUp, Azure DevOps, OpenProject, Redmine, Trello, Nextcloud Deck, and Plainspace.
- Self-hosters who need the complete SuperSync account, encryption, conflict, recovery, snapshot, and pruning stack.

## Core workflows

1. Capture a task instantly into Inbox or the current project.
2. Plan Today and Upcoming, postpone overdue work, reorder tasks, and manage subtasks.
3. Open the inspector without losing list context and edit dates, repeats, reminders, priority, notes, checklist, estimates, time, project, tags, files, and linked issues.
4. Start Pomodoro, flowtime, or stopwatch focus against a selected task and review focus history.
5. Plan in calendar and board views, search by command palette, and review time/productivity insights.
6. Work offline, then optionally sync through SuperSync, WebDAV, Nextcloud, Dropbox, OneDrive, or a local file.
7. Export/import backups without depending on legacy Electron profiles or plugin state.

## Product principles

- Offline and local-first: task and time workflows never require an account or network.
- Private by construction: no analytics or telemetry; user content is never logged.
- Fast capture and manipulation: common intent feedback targets under 100 ms with 10,000 tasks.
- One intent, one operation: local domain commands produce one persisted operation; remote and replayed operations bypass local effects.
- Calm density: professional desktop density, quiet defaults, restrained color, explicit hierarchy, complete keyboard navigation.
- Original identity: copy TickTick's proven information architecture and interaction density from the supplied references, not its name, proprietary copy, illustrations, or brand assets.

## Scope

Included: every non-plugin Super Productivity capability; first-party compiled integrations; web/PWA; macOS, Windows, and Linux through Tauri 2; the complete SuperSync server and client stack; existing sync providers and backup formats.

Excluded: runtime plugin marketplace/API, plugin management UI, Brain Dump, Doc Mode, Todoist import, Automations, AI prompts, Procrastination Buster, Voice Reminder, Yesterday Tasks, sync.md, iOS, Android, Electron, and Capacitor.

## Success criteria

- Existing compatible backup data imports with plugin records ignored safely.
- SuperSync and provider HTTP/data contracts remain compatible.
- The production graph has no Angular, NgRx, Electron, Capacitor, or runtime plugin API imports.
- Web/PWA and Tauri builds pass; sync, domain, persistence, E2E, accessibility, offline, and 10k-task performance gates pass.
