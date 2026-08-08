# Super Productivity Fork (Newas) — Plainspace

Enhances Plainspace collaboration sync beyond stock Super Productivity.

## Why

Stock SP (v18.13+) can create Plainspace tasks on **`addTask`** into a bound project, but:

1. **`moveToOtherProject` into a Plainspace-bound project does not create** the remote item (e.g. moving “Wäsche” into Chores left `issueId` null).
2. There is **no regular heal** for unlinked top-level tasks in the bound project.
3. **Delete in SP never updates Plainspace** (no `deleteIssue`; integration API lacked unassign/delete until the companion Plainspace PR).

## Newas behaviour

| SP action | Plainspace |
|-----------|------------|
| Add task in bound project | Create + self-assign (upstream) |
| Move top-level unlinked task into bound project | Create + self-assign |
| Poll / open bound project | Push any top-level unlinked tasks (`!issueId`) |
| Delete linked task | Configurable: **unassign** (default) / **delete** / **localOnly** |

Subtasks stay local-only (Plainspace integration has no subtask model).

Provider setting: **When I delete a task in Super Productivity** (`onLocalDelete`).

## Companion server

Needs [plainspace-fork](https://forgejo.fsociety00.cc/copilot/plainspace-fork) / upstream PR:

- `POST /api/integration/tasks/:id/unassign`
- `DELETE /api/integration/tasks/:id`

Until plainspace.org deploys those, unassign/delete will error (create/move/poll push still work against current cloud).

## Branches

- `newas/plainspace-create-delete` — this fork’s feature branch
- Rebase onto upstream tags as needed

## Build notes

- Package ID unchanged (`com.superproductivity.superproductivity`) so the fork can replace stock and keep local data.
- Linux: AppImage via electron-builder; prefer over Flatpak until a custom Flatpak remote exists (stock Flatpak data: `~/.var/app/com.super_productivity.SuperProductivity/`).
- Android: release APK via Forgejo Actions → Obtainium.
