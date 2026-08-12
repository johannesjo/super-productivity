# Migrating from Super Productivity

1. In Super Productivity, create a complete JSON backup.
2. In Noura, open Settings → Backups.
3. Choose Import backup and select the JSON file.
4. Review imported projects, tags, completed tasks, and linked issues before replacing the old installation.

Noura maps projects, tags, live and archived tasks, notes, work contexts, task
repeat configs, simple counters, smart lists, global config/user profile,
issue-provider metadata, completion, priority, due dates and times, reminders
(resolved against `reminderActive`), repeat references, estimates, tracked
duration, nested subtask trees, checklists, attachments, and linked issues.
`INBOX_PROJECT` is normalized to Noura's Inbox; the default work context is
normalized to Noura's Default.

Nested subtasks in a Super Productivity backup import as real Noura task
hierarchy (a parent owns children through `subtaskIds`), not flattened
checklist items. All imported data is current-form (schema version 2); the
migrator also upgrades an existing Noura v1 state in place.

Plugin state is ignored because Noura has no runtime plugin platform. Features intentionally outside the product scope—Brain Dump, Doc Mode, Todoist import, Automations, AI prompts, Procrastination Buster, Voice Reminder, Yesterday Tasks, sync.md, iOS, and Android—are not migrated as active features.

The import is local and does not upload the source file. Export a fresh Noura backup after verifying the result.
